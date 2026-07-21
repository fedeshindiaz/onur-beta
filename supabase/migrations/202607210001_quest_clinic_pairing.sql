-- Estación Quest clínica: el profesional prepara una sesión presencial y
-- el visor recibe únicamente ese plan mediante un código temporal.

create table if not exists public.quest_session_pairings (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.session_assignments (id) on delete cascade,
  professional_id uuid not null references auth.users (id) on delete cascade,
  code_hash text not null unique,
  status text not null default 'ready'
    check (status in ('ready', 'claimed', 'captured', 'expired', 'revoked')),
  device_token_hash text,
  captured_result jsonb,
  expires_at timestamptz not null,
  claimed_at timestamptz,
  captured_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint quest_pairing_capture_shape check (
    captured_result is null or jsonb_typeof(captured_result) = 'object'
  )
);

create unique index if not exists one_active_quest_pairing_per_assignment
on public.quest_session_pairings (assignment_id)
where status in ('ready', 'claimed');

create index if not exists quest_pairings_professional_created_idx
on public.quest_session_pairings (professional_id, created_at desc);

alter table public.quest_session_pairings enable row level security;

drop policy if exists quest_pairings_professional_select on public.quest_session_pairings;
create policy quest_pairings_professional_select on public.quest_session_pairings
for select to authenticated using (
  professional_id = auth.uid() and public.is_professional()
);

revoke all on table public.quest_session_pairings from anon, authenticated;
grant select on table public.quest_session_pairings to authenticated;

create or replace function public.create_quest_session_pairing(target_assignment_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  target_professional_id uuid;
  target_plan_definition jsonb;
  raw_code text;
  pairing_id uuid;
  pairing_expires_at timestamptz := now() + interval '15 minutes';
begin
  select assignment_row.assigned_by, plan.plan_definition
  into target_professional_id, target_plan_definition
  from public.session_assignments assignment_row
  join public.session_plans plan on plan.id = assignment_row.session_plan_id
  where assignment_row.id = target_assignment_id
    and public.is_professional()
    and public.owns_patient(assignment_row.patient_id)
    and assignment_row.assigned_by = auth.uid()
    and coalesce(plan.plan_definition ->> 'mode', 'home') = 'in_person'
    and assignment_row.status = 'started'
  for update of assignment_row;

  if target_professional_id is null then
    raise exception 'La sesión presencial debe estar iniciada por el profesional antes de preparar Quest.' using errcode = '42501';
  end if;

  if jsonb_typeof(coalesce(target_plan_definition -> 'exercises', '[]'::jsonb)) <> 'array'
     or jsonb_array_length(coalesce(target_plan_definition -> 'exercises', '[]'::jsonb)) = 0
     or exists (
       select 1
       from jsonb_array_elements(coalesce(target_plan_definition -> 'exercises', '[]'::jsonb)) exercise
       where coalesce(exercise ->> 'displayMode', 'standard') <> 'quest_browser'
     ) then
    raise exception 'La estación Quest solo recibe sesiones presenciales compuestas íntegramente por ejercicios Quest.' using errcode = '22023';
  end if;

  update public.quest_session_pairings
  set status = 'revoked', updated_at = now()
  where assignment_id = target_assignment_id
    and status in ('ready', 'claimed');

  loop
    raw_code := upper(substr(encode(extensions.gen_random_bytes(8), 'hex'), 1, 8));
    begin
      insert into public.quest_session_pairings (
        assignment_id,
        professional_id,
        code_hash,
        status,
        expires_at
      ) values (
        target_assignment_id,
        auth.uid(),
        encode(extensions.digest(raw_code, 'sha256'), 'hex'),
        'ready',
        pairing_expires_at
      ) returning id into pairing_id;
      exit;
    exception when unique_violation then
      -- Una colisión es improbable; se genera otro código sin exponerla.
    end;
  end loop;

  insert into public.audit_events (actor_user_id, action, entity_type, entity_id, metadata)
  values (
    auth.uid(),
    'quest_session_pairing_created',
    'session_assignment',
    target_assignment_id,
    jsonb_build_object('pairing_id', pairing_id, 'expires_at', pairing_expires_at)
  );

  return jsonb_build_object(
    'id', pairing_id,
    'assignmentId', target_assignment_id,
    'code', raw_code,
    'status', 'ready',
    'expiresAt', pairing_expires_at
  );
end;
$$;

create or replace function public.get_quest_session_pairing(target_pairing_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  pairing_row public.quest_session_pairings%rowtype;
begin
  update public.quest_session_pairings
  set status = 'expired', updated_at = now()
  where id = target_pairing_id
    and professional_id = auth.uid()
    and status in ('ready', 'claimed')
    and expires_at <= now();

  select pairing.*
  into pairing_row
  from public.quest_session_pairings pairing
  where pairing.id = target_pairing_id
    and pairing.professional_id = auth.uid()
    and public.is_professional();

  if pairing_row.id is null then
    raise exception 'Vínculo Quest no disponible para este profesional.' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'id', pairing_row.id,
    'assignmentId', pairing_row.assignment_id,
    'status', pairing_row.status,
    'expiresAt', pairing_row.expires_at,
    'claimedAt', pairing_row.claimed_at,
    'capturedAt', pairing_row.captured_at,
    'capturedResult', pairing_row.captured_result
  );
end;
$$;

create or replace function public.find_quest_session_pairing_for_assignment(target_assignment_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  pairing_row public.quest_session_pairings%rowtype;
begin
  update public.quest_session_pairings pairing
  set status = 'expired', updated_at = now()
  from public.session_assignments assignment_row
  where pairing.assignment_id = target_assignment_id
    and assignment_row.id = pairing.assignment_id
    and pairing.professional_id = auth.uid()
    and public.is_professional()
    and public.owns_patient(assignment_row.patient_id)
    and pairing.status in ('ready', 'claimed')
    and pairing.expires_at <= now();

  select pairing.*
  into pairing_row
  from public.quest_session_pairings pairing
  join public.session_assignments assignment_row on assignment_row.id = pairing.assignment_id
  where pairing.assignment_id = target_assignment_id
    and pairing.professional_id = auth.uid()
    and public.is_professional()
    and public.owns_patient(assignment_row.patient_id)
    and pairing.status in ('ready', 'claimed', 'captured')
  order by pairing.created_at desc
  limit 1;

  if pairing_row.id is null then
    return null;
  end if;

  return jsonb_build_object(
    'id', pairing_row.id,
    'assignmentId', pairing_row.assignment_id,
    'status', pairing_row.status,
    'expiresAt', pairing_row.expires_at,
    'claimedAt', pairing_row.claimed_at,
    'capturedAt', pairing_row.captured_at,
    'capturedResult', pairing_row.captured_result
  );
end;
$$;

create or replace function public.claim_quest_session_pairing(pairing_code_input text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  pairing_row public.quest_session_pairings%rowtype;
  raw_device_token text := encode(extensions.gen_random_bytes(32), 'hex');
  target_title text;
  target_instructions text;
  target_definition jsonb;
  target_patient_name text;
  target_patient_label text;
begin
  if pairing_code_input is null or upper(trim(pairing_code_input)) !~ '^[0-9A-F]{8}$' then
    raise exception 'Código Quest inválido o vencido.' using errcode = '22023';
  end if;

  update public.quest_session_pairings pairing
  set status = 'claimed',
      claimed_at = now(),
      device_token_hash = encode(extensions.digest(raw_device_token, 'sha256'), 'hex'),
      expires_at = now() + interval '2 hours',
      updated_at = now()
  where pairing.code_hash = encode(extensions.digest(upper(trim(pairing_code_input)), 'sha256'), 'hex')
    and pairing.status = 'ready'
    and pairing.expires_at > now()
  returning pairing.* into pairing_row;

  if pairing_row.id is null then
    raise exception 'Código Quest inválido o vencido.' using errcode = '22023';
  end if;

  select plan.title, plan.instructions, plan.plan_definition, patient.full_name
  into target_title, target_instructions, target_definition, target_patient_name
  from public.session_assignments assignment_row
  join public.session_plans plan on plan.id = assignment_row.session_plan_id
  join public.patients patient on patient.id = assignment_row.patient_id
  where assignment_row.id = pairing_row.assignment_id
    and assignment_row.status = 'started'
    and coalesce(plan.plan_definition ->> 'mode', 'home') = 'in_person';

  if target_title is null then
    update public.quest_session_pairings set status = 'revoked', updated_at = now() where id = pairing_row.id;
    raise exception 'La sesión Quest ya no está disponible.' using errcode = '42501';
  end if;

  target_patient_label := split_part(trim(target_patient_name), ' ', 1);
  if split_part(trim(target_patient_name), ' ', 2) <> '' then
    target_patient_label := target_patient_label || ' ' || left(split_part(trim(target_patient_name), ' ', 2), 1) || '.';
  end if;

  insert into public.audit_events (actor_user_id, action, entity_type, entity_id, metadata)
  values (
    null,
    'quest_session_pairing_claimed',
    'session_assignment',
    pairing_row.assignment_id,
    jsonb_build_object('pairing_id', pairing_row.id, 'professional_id', pairing_row.professional_id)
  );

  return jsonb_build_object(
    'pairingId', pairing_row.id,
    'deviceToken', raw_device_token,
    'expiresAt', pairing_row.expires_at,
    'patientLabel', target_patient_label,
    'session', jsonb_build_object(
      'id', pairing_row.assignment_id,
      'title', target_title,
      'instructions', coalesce(target_instructions, ''),
      'exercises', coalesce(target_definition -> 'exercises', '[]'::jsonb)
    )
  );
end;
$$;

create or replace function public.submit_quest_session_capture(
  target_pairing_id uuid,
  device_token_input text,
  captured_result_input jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  target_assignment_id uuid;
begin
  if device_token_input is null or length(device_token_input) < 32 then
    raise exception 'Credencial de estación Quest inválida.' using errcode = '42501';
  end if;
  if jsonb_typeof(captured_result_input) <> 'object'
     or coalesce(captured_result_input ->> 'activeSeconds', '') !~ '^[0-9]{1,5}$'
     or (captured_result_input ->> 'activeSeconds')::integer not between 0 and 86400
     or coalesce(captured_result_input ->> 'skippedExercises', '') !~ '^[0-9]{1,3}$'
     or (captured_result_input ->> 'skippedExercises')::integer not between 0 and 100
     or jsonb_typeof(coalesce(captured_result_input -> 'eventLog', '[]'::jsonb)) <> 'array'
     or pg_column_size(captured_result_input) > 32768 then
    raise exception 'Resultado Quest fuera de rango.' using errcode = '22023';
  end if;

  update public.quest_session_pairings pairing
  set status = 'captured',
      captured_result = captured_result_input,
      captured_at = now(),
      updated_at = now()
  where pairing.id = target_pairing_id
    and pairing.status = 'claimed'
    and pairing.expires_at > now()
    and pairing.device_token_hash = encode(extensions.digest(device_token_input, 'sha256'), 'hex')
  returning pairing.assignment_id into target_assignment_id;

  if target_assignment_id is null then
    raise exception 'La estación Quest no puede enviar este resultado.' using errcode = '42501';
  end if;

  insert into public.audit_events (actor_user_id, action, entity_type, entity_id, metadata)
  values (
    null,
    'quest_session_capture_received',
    'session_assignment',
    target_assignment_id,
    jsonb_build_object(
      'pairing_id', target_pairing_id,
      'active_seconds', (captured_result_input ->> 'activeSeconds')::integer,
      'skipped_exercises', (captured_result_input ->> 'skippedExercises')::integer
    )
  );

  return target_pairing_id;
end;
$$;

create or replace function public.revoke_quest_session_pairing(target_pairing_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  target_assignment_id uuid;
begin
  update public.quest_session_pairings pairing
  set status = 'revoked', updated_at = now()
  where pairing.id = target_pairing_id
    and pairing.professional_id = auth.uid()
    and public.is_professional()
    and pairing.status in ('ready', 'claimed')
  returning pairing.assignment_id into target_assignment_id;

  if target_assignment_id is null then
    raise exception 'Vínculo Quest no disponible para revocar.' using errcode = '42501';
  end if;

  insert into public.audit_events (actor_user_id, action, entity_type, entity_id, metadata)
  values (
    auth.uid(),
    'quest_session_pairing_revoked',
    'session_assignment',
    target_assignment_id,
    jsonb_build_object('pairing_id', target_pairing_id)
  );

  return target_pairing_id;
end;
$$;

revoke all on function public.create_quest_session_pairing(uuid) from public;
revoke all on function public.get_quest_session_pairing(uuid) from public;
revoke all on function public.find_quest_session_pairing_for_assignment(uuid) from public;
revoke all on function public.claim_quest_session_pairing(text) from public;
revoke all on function public.submit_quest_session_capture(uuid, text, jsonb) from public;
revoke all on function public.revoke_quest_session_pairing(uuid) from public;

grant execute on function public.create_quest_session_pairing(uuid) to authenticated;
grant execute on function public.get_quest_session_pairing(uuid) to authenticated;
grant execute on function public.find_quest_session_pairing_for_assignment(uuid) to authenticated;
grant execute on function public.revoke_quest_session_pairing(uuid) to authenticated;
grant execute on function public.claim_quest_session_pairing(text) to anon, authenticated;
grant execute on function public.submit_quest_session_capture(uuid, text, jsonb) to anon, authenticated;

comment on table public.quest_session_pairings
is 'Vínculos efímeros entre una sesión presencial iniciada por un profesional y una estación Quest clínica.';
