-- Solicitudes de acceso a documentos clínicos y catálogo seguro para el portal.

create type public.document_request_status as enum ('pending', 'approved', 'denied', 'cancelled');

create table public.document_access_requests (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients (id) on delete cascade,
  document_id uuid not null references public.source_documents (id) on delete cascade,
  status public.document_request_status not null default 'pending',
  requested_by uuid not null references auth.users (id),
  requested_at timestamptz not null default now(),
  resolved_by uuid references auth.users (id),
  resolved_at timestamptz,
  resolution_note text,
  constraint document_request_resolution_consistent check (
    (status = 'pending' and resolved_by is null and resolved_at is null)
    or (status <> 'pending' and resolved_by is not null and resolved_at is not null)
  )
);

create unique index document_access_requests_one_pending_idx
on public.document_access_requests (patient_id, document_id)
where status = 'pending';

create index document_access_requests_professional_queue_idx
on public.document_access_requests (patient_id, status, requested_at desc);

create or replace function public.validate_document_access_request()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if not exists (
    select 1 from public.source_documents document
    where document.id = new.document_id and document.patient_id = new.patient_id
  ) then
    raise exception 'El documento no pertenece al paciente indicado.';
  end if;
  return new;
end;
$$;

create trigger document_access_requests_validate
before insert or update of patient_id, document_id on public.document_access_requests
for each row execute function public.validate_document_access_request();

create or replace function public.audit_document_access_request_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.audit_events (actor_user_id, action, entity_type, entity_id, metadata)
  values (
    case when tg_op = 'INSERT' then new.requested_by else new.resolved_by end,
    case
      when tg_op = 'INSERT' then 'document_access_requested'
      when new.status = 'approved' then 'document_access_approved'
      when new.status = 'denied' then 'document_access_denied'
      else 'document_access_cancelled'
    end,
    'source_document',
    new.document_id,
    jsonb_build_object('request_id', new.id, 'patient_id', new.patient_id, 'status', new.status)
  );
  return new;
end;
$$;

create trigger document_access_requests_audit
after insert or update of status on public.document_access_requests
for each row execute function public.audit_document_access_request_change();

alter table public.document_access_requests enable row level security;

create policy document_requests_professional_select on public.document_access_requests
for select to authenticated using (public.owns_patient(patient_id) and public.is_professional());

create policy document_requests_patient_select on public.document_access_requests
for select to authenticated using (public.is_patient_self(patient_id) and requested_by = auth.uid());

grant select on public.document_access_requests to authenticated;

create or replace function public.list_my_document_catalog()
returns table (
  document_id uuid,
  document_type text,
  original_filename text,
  mime_type text,
  document_date date,
  description text,
  file_size_bytes bigint,
  permission_level public.permission_level,
  permission_granted_at timestamptz,
  request_id uuid,
  request_status public.document_request_status,
  requested_at timestamptz
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    document.id,
    document.document_type,
    document.original_filename,
    document.mime_type,
    document.document_date,
    document.description,
    document.file_size_bytes,
    permission.level,
    permission.granted_at,
    latest_request.id,
    latest_request.status,
    latest_request.requested_at
  from public.patients patient
  join public.source_documents document on document.patient_id = patient.id
  left join public.document_permissions permission
    on permission.document_id = document.id
   and permission.patient_id = patient.id
   and permission.revoked_at is null
  left join lateral (
    select request.id, request.status, request.requested_at
    from public.document_access_requests request
    where request.document_id = document.id
      and request.patient_id = patient.id
      and request.requested_by = auth.uid()
    order by request.requested_at desc
    limit 1
  ) latest_request on true
  where patient.auth_user_id = auth.uid()
    and public.is_patient_self(patient.id)
  order by document.document_date desc, document.created_at desc;
$$;

create or replace function public.request_document_access(target_document_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target_patient_id uuid;
  existing_request_id uuid;
  created_request_id uuid;
begin
  select document.patient_id into target_patient_id
  from public.source_documents document
  where document.id = target_document_id;

  if target_patient_id is null or not public.is_patient_self(target_patient_id) then
    raise exception 'Documento no encontrado o cuenta no habilitada.';
  end if;
  if exists (
    select 1 from public.document_permissions permission
    where permission.document_id = target_document_id
      and permission.patient_id = target_patient_id
      and permission.revoked_at is null
  ) then
    raise exception 'El documento ya está autorizado.';
  end if;

  select request.id into existing_request_id
  from public.document_access_requests request
  where request.patient_id = target_patient_id
    and request.document_id = target_document_id
    and request.status = 'pending';
  if existing_request_id is not null then return existing_request_id; end if;

  insert into public.document_access_requests (patient_id, document_id, requested_by)
  values (target_patient_id, target_document_id, auth.uid())
  on conflict do nothing
  returning id into created_request_id;

  if created_request_id is null then
    select request.id into created_request_id
    from public.document_access_requests request
    where request.patient_id = target_patient_id
      and request.document_id = target_document_id
      and request.status = 'pending';
  end if;
  return created_request_id;
end;
$$;

create or replace function public.resolve_document_access_request(
  target_request_id uuid,
  decision public.document_request_status,
  granted_level public.permission_level default 'view',
  professional_note text default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare request_record record;
begin
  if decision not in ('approved', 'denied') then
    raise exception 'La decisión debe ser approved o denied.';
  end if;

  select * into request_record
  from public.document_access_requests request
  where request.id = target_request_id
    and request.status = 'pending'
    and public.owns_patient(request.patient_id)
    and public.is_professional()
  for update;

  if request_record.id is null then raise exception 'Solicitud no encontrada o ya resuelta.'; end if;

  update public.document_access_requests
  set status = decision,
      resolved_by = auth.uid(),
      resolved_at = now(),
      resolution_note = nullif(professional_note, '')
  where id = target_request_id;

  if decision = 'approved' then
    insert into public.document_permissions (patient_id, document_id, level, granted_by, revoked_at)
    values (request_record.patient_id, request_record.document_id, granted_level, auth.uid(), null)
    on conflict (patient_id, document_id) do update set
      level = excluded.level,
      granted_by = excluded.granted_by,
      granted_at = now(),
      revoked_at = null;
  end if;
end;
$$;

create or replace function public.record_document_access_event(
  target_document_id uuid,
  access_action text
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target_patient_id uuid;
  permitted_level public.permission_level;
  professional_allowed boolean;
begin
  if access_action not in ('view', 'download') then raise exception 'Acción no válida.'; end if;
  select document.patient_id, public.owns_patient(document.patient_id) and public.is_professional()
    into target_patient_id, professional_allowed
  from public.source_documents document
  where document.id = target_document_id;
  if target_patient_id is null then raise exception 'Documento no encontrado.'; end if;

  if not professional_allowed then
    select permission.level into permitted_level
    from public.document_permissions permission
    where permission.document_id = target_document_id
      and permission.patient_id = target_patient_id
      and permission.revoked_at is null
      and public.is_patient_self(target_patient_id);
    if permitted_level is null then raise exception 'Documento no autorizado.'; end if;
    if access_action = 'download' and permitted_level <> 'view_download' then
      raise exception 'La descarga no está autorizada.';
    end if;
  end if;

  insert into public.audit_events (actor_user_id, action, entity_type, entity_id, metadata)
  values (
    auth.uid(),
    case when access_action = 'download' then 'document_downloaded' else 'document_viewed' end,
    'source_document',
    target_document_id,
    jsonb_build_object('patient_id', target_patient_id)
  );
end;
$$;

revoke all on function public.list_my_document_catalog() from public;
revoke all on function public.request_document_access(uuid) from public;
revoke all on function public.resolve_document_access_request(uuid, public.document_request_status, public.permission_level, text) from public;
revoke all on function public.record_document_access_event(uuid, text) from public;
revoke all on function public.audit_document_access_request_change() from public;
grant execute on function public.list_my_document_catalog() to authenticated;
grant execute on function public.request_document_access(uuid) to authenticated;
grant execute on function public.resolve_document_access_request(uuid, public.document_request_status, public.permission_level, text) to authenticated;
grant execute on function public.record_document_access_event(uuid, text) to authenticated;
