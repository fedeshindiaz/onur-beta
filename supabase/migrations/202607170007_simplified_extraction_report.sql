alter table public.document_extraction_jobs
  add column professional_conclusion text,
  add column rehabilitation_suggestion text,
  add column report_confirmed_by uuid references auth.users (id),
  add column report_confirmed_at timestamptz;

create or replace function public.save_document_extraction_report(
  target_job_id uuid,
  target_professional_conclusion text,
  target_rehabilitation_suggestion text
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  job_record public.document_extraction_jobs%rowtype;
begin
  select * into job_record
  from public.document_extraction_jobs
  where id = target_job_id and public.owns_patient(patient_id) and public.is_professional()
  for update;
  if job_record.id is null then raise exception 'Extracción no encontrada o sin permiso.'; end if;
  if job_record.status <> 'review' then raise exception 'El informe ya no admite cambios.'; end if;
  if length(coalesce(target_professional_conclusion, '')) > 5000 or length(coalesce(target_rehabilitation_suggestion, '')) > 5000 then
    raise exception 'La conclusión o la sugerencia supera el máximo permitido.';
  end if;

  update public.document_extraction_jobs set
    professional_conclusion = nullif(btrim(target_professional_conclusion), ''),
    rehabilitation_suggestion = nullif(btrim(target_rehabilitation_suggestion), '')
  where id = target_job_id;

  insert into public.audit_events (actor_user_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), 'clinical_extraction_report_saved', 'document_extraction', target_job_id,
    jsonb_build_object('has_conclusion', nullif(btrim(target_professional_conclusion), '') is not null,
      'has_rehabilitation_suggestion', nullif(btrim(target_rehabilitation_suggestion), '') is not null));
end;
$$;

create or replace function public.replace_document_extraction_candidates(
  target_job_id uuid,
  extraction_payload jsonb
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  job_record public.document_extraction_jobs%rowtype;
  page_item jsonb;
  field_item jsonb;
  changed_fields integer := 0;
begin
  select * into job_record
  from public.document_extraction_jobs
  where id = target_job_id and public.owns_patient(patient_id) and public.is_professional()
  for update;
  if job_record.id is null then raise exception 'Extracción no encontrada o sin permiso.'; end if;
  if job_record.status <> 'review' then raise exception 'Solo se puede reanalizar un borrador en revisión.'; end if;

  for page_item in select value from jsonb_array_elements(coalesce(extraction_payload -> 'pages', '[]'::jsonb)) loop
    update public.document_extraction_pages set
      classification = case when classification = proposed_classification then page_item ->> 'classification' else classification end,
      proposed_classification = page_item ->> 'proposed_classification',
      classification_confidence = nullif(page_item ->> 'classification_confidence', '')::numeric,
      rotation_degrees = coalesce(nullif(page_item ->> 'rotation_degrees', '')::integer, 0),
      pixel_width = nullif(page_item ->> 'width', '')::integer,
      pixel_height = nullif(page_item ->> 'height', '')::integer
    where job_id = target_job_id and page_number = (page_item ->> 'page_number')::integer;
  end loop;

  for field_item in select value from jsonb_array_elements(coalesce(extraction_payload -> 'fields', '[]'::jsonb)) loop
    update public.document_extraction_fields set
      professional_value = case
        when coalesce(professional_value, '') = coalesce(raw_value, '') then nullif(field_item ->> 'professional_value', '')
        else professional_value
      end,
      normalized_value = case
        when coalesce(professional_value, '') = coalesce(raw_value, '') then nullif(field_item ->> 'normalized_value', '')
        else normalized_value
      end,
      extraction_status = case
        when coalesce(professional_value, '') = coalesce(raw_value, '') then field_item ->> 'status'
        else extraction_status
      end,
      raw_value = nullif(field_item ->> 'raw_value', ''),
      page_number = (field_item ->> 'page_number')::integer,
      source_region = nullif(field_item -> 'region', 'null'::jsonb),
      extraction_confidence = nullif(field_item ->> 'confidence', '')::numeric,
      extractor_method = field_item ->> 'extractor_method',
      extractor_version = field_item ->> 'extractor_version',
      is_confirmed = false,
      confirmed_by = null,
      confirmed_at = null
    where job_id = target_job_id
      and field_code = field_item ->> 'code'
      and study_type = field_item ->> 'study_type';
    changed_fields := changed_fields + case when found then 1 else 0 end;
  end loop;

  update public.document_extraction_jobs
  set extractor_version = extraction_payload ->> 'extractor_version'
  where id = target_job_id;

  insert into public.audit_events (actor_user_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), 'clinical_extraction_reprocessed', 'document_extraction', target_job_id,
    jsonb_build_object('field_count', changed_fields, 'page_count', jsonb_array_length(coalesce(extraction_payload -> 'pages', '[]'::jsonb)),
      'version', extraction_payload ->> 'extractor_version'));
end;
$$;

create or replace function public.require_extraction_report_before_confirmation()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if old.status is distinct from new.status and new.status = 'confirmed' then
    if nullif(btrim(new.professional_conclusion), '') is null then
      raise exception 'Completá la conclusión profesional antes de generar el informe.';
    end if;
    if nullif(btrim(new.rehabilitation_suggestion), '') is null then
      raise exception 'Completá la sugerencia profesional de rehabilitación antes de generar el informe.';
    end if;
    new.report_confirmed_by := auth.uid();
    new.report_confirmed_at := now();
  end if;
  return new;
end;
$$;

create trigger extraction_jobs_require_professional_report
before update of status on public.document_extraction_jobs
for each row execute function public.require_extraction_report_before_confirmation();

revoke all on function public.save_document_extraction_report(uuid, text, text) from public;
revoke all on function public.replace_document_extraction_candidates(uuid, jsonb) from public;
grant execute on function public.save_document_extraction_report(uuid, text, text) to authenticated;
grant execute on function public.replace_document_extraction_candidates(uuid, jsonb) to authenticated;
