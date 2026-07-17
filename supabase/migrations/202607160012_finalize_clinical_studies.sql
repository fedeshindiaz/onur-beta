-- Cierre verificable e inmutabilidad de estudios revisados.

alter table public.clinical_studies
  add column if not exists finalized_at timestamptz,
  add column if not exists finalized_by uuid references auth.users (id),
  add column if not exists final_snapshot_sha256 text,
  add constraint clinical_studies_finalization_consistent check (
    (status <> 'finalized' and finalized_at is null and finalized_by is null and final_snapshot_sha256 is null)
    or (status = 'finalized' and finalized_at is not null and finalized_by is not null and final_snapshot_sha256 ~ '^[0-9a-f]{64}$')
  );

create or replace function public.protect_clinical_study_finalization()
returns trigger
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  expected_snapshot jsonb;
  expected_hash text;
begin
  if auth.role() = 'service_role' then
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;
  if tg_op = 'DELETE' then
    if old.status = 'finalized' then raise exception 'Un estudio finalizado no puede eliminarse.'; end if;
    return old;
  end if;

  if old.status = 'finalized' then raise exception 'Un estudio finalizado es inmutable.'; end if;
  if new.status = 'finalized' then
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(old.id::text, 0));
    if old.status <> 'reviewed' then raise exception 'Solo puede finalizarse un estudio revisado.'; end if;
    if new.finalized_at is null or new.finalized_by is null or new.final_snapshot_sha256 is null then
      raise exception 'El cierre requiere fecha, profesional y hash del contenido.';
    end if;
    if not exists (select 1 from public.metric_values metric where metric.study_id = old.id) then
      raise exception 'No puede finalizarse un estudio sin métricas.';
    end if;
    if not exists (select 1 from public.import_jobs job where job.study_id = old.id and job.status = 'confirmed') then
      raise exception 'La importación debe estar confirmada antes de finalizar.';
    end if;
    expected_snapshot := jsonb_build_object(
      'study', to_jsonb(old) - 'updated_at' - 'finalized_at' - 'finalized_by' - 'final_snapshot_sha256',
      'metrics', coalesce((select jsonb_agg(to_jsonb(metric) order by metric.id) from public.metric_values metric where metric.study_id = old.id), '[]'::jsonb),
      'quality_issues', coalesce((select jsonb_agg(to_jsonb(issue) order by issue.id) from public.data_quality_issues issue where issue.study_id = old.id), '[]'::jsonb),
      'import_job', (select to_jsonb(job) - 'updated_at' from public.import_jobs job where job.study_id = old.id and job.status = 'confirmed')
    );
    expected_hash := encode(extensions.digest(convert_to(expected_snapshot::text, 'UTF8'), 'sha256'), 'hex');
    if new.final_snapshot_sha256 <> expected_hash then raise exception 'La huella del estudio no coincide con su contenido.'; end if;
  end if;
  return new;
end;
$$;

create trigger clinical_studies_protect_finalized
before update or delete on public.clinical_studies
for each row execute function public.protect_clinical_study_finalization();

create or replace function public.reject_finalized_study_child_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare target_study_id uuid;
begin
  if auth.role() = 'service_role' then
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;
  target_study_id := case when tg_op = 'DELETE' then old.study_id else new.study_id end;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(target_study_id::text, 0));
  if exists (select 1 from public.clinical_studies study where study.id = target_study_id and study.status = 'finalized') then
    raise exception 'Los datos de un estudio finalizado son inmutables.';
  end if;
  if tg_op = 'UPDATE' and exists (select 1 from public.clinical_studies study where study.id = old.study_id and study.status = 'finalized') then
    raise exception 'Los datos de un estudio finalizado son inmutables.';
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

create trigger metric_values_reject_finalized_change
before insert or update or delete on public.metric_values
for each row execute function public.reject_finalized_study_child_change();

create trigger data_quality_issues_reject_finalized_change
before insert or update or delete on public.data_quality_issues
for each row execute function public.reject_finalized_study_child_change();

create trigger import_jobs_reject_finalized_change
before insert or update or delete on public.import_jobs
for each row execute function public.reject_finalized_study_child_change();

create or replace function public.finalize_clinical_study(target_study_id uuid)
returns text
language plpgsql
security invoker
set search_path = public, extensions, pg_temp
as $$
declare
  study_record record;
  snapshot jsonb;
  snapshot_hash text;
begin
  select * into study_record
  from public.clinical_studies study
  where study.id = target_study_id
    and public.owns_patient(study.patient_id)
    and public.is_professional()
  for update;

  if study_record.id is null then raise exception 'Estudio no encontrado o sin permiso.'; end if;
  if study_record.status <> 'reviewed' then raise exception 'Solo puede finalizarse un estudio revisado.'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(target_study_id::text, 0));

  snapshot := jsonb_build_object(
    'study', to_jsonb(study_record) - 'updated_at' - 'finalized_at' - 'finalized_by' - 'final_snapshot_sha256',
    'metrics', coalesce((select jsonb_agg(to_jsonb(metric) order by metric.id) from public.metric_values metric where metric.study_id = target_study_id), '[]'::jsonb),
    'quality_issues', coalesce((select jsonb_agg(to_jsonb(issue) order by issue.id) from public.data_quality_issues issue where issue.study_id = target_study_id), '[]'::jsonb),
    'import_job', (select to_jsonb(job) - 'updated_at' from public.import_jobs job where job.study_id = target_study_id and job.status = 'confirmed')
  );

  if jsonb_array_length(snapshot -> 'metrics') = 0 then raise exception 'No puede finalizarse un estudio sin métricas.'; end if;
  if snapshot -> 'import_job' = 'null'::jsonb then raise exception 'La importación debe estar confirmada antes de finalizar.'; end if;

  snapshot_hash := encode(extensions.digest(convert_to(snapshot::text, 'UTF8'), 'sha256'), 'hex');
  update public.clinical_studies
  set status = 'finalized', finalized_at = now(), finalized_by = auth.uid(), final_snapshot_sha256 = snapshot_hash
  where id = target_study_id;

  return snapshot_hash;
end;
$$;

create or replace function public.audit_clinical_study_finalization()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if old.status <> 'finalized' and new.status = 'finalized' then
    insert into public.audit_events (actor_user_id, action, entity_type, entity_id, metadata)
    values (new.finalized_by, 'clinical_study_finalized', 'clinical_study', new.id, jsonb_build_object('snapshot_sha256', new.final_snapshot_sha256));
  end if;
  return new;
end;
$$;

create trigger clinical_studies_audit_finalization
after update of status on public.clinical_studies
for each row execute function public.audit_clinical_study_finalization();

revoke all on function public.protect_clinical_study_finalization() from public;
revoke all on function public.reject_finalized_study_child_change() from public;
revoke all on function public.audit_clinical_study_finalization() from public;
revoke all on function public.finalize_clinical_study(uuid) from public;
grant execute on function public.finalize_clinical_study(uuid) to authenticated;
