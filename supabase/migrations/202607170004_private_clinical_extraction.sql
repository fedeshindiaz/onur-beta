-- Extracción clínica local, borradores revisables y confirmación profesional.
-- El texto OCR y los valores clínicos nunca se incluyen en audit_events.

alter table public.metric_definitions drop constraint if exists metric_definitions_value_kind_check;
alter table public.metric_definitions add constraint metric_definitions_value_kind_check
  check (value_kind in ('numeric', 'categorical', 'boolean', 'text'));

create table public.document_extraction_jobs (
  id uuid primary key default gen_random_uuid(),
  source_document_id uuid not null unique references public.source_documents (id) on delete cascade,
  patient_id uuid not null references public.patients (id) on delete cascade,
  intake_kind text not null check (intake_kind in ('posturography_bap', 'vestibular_and_reports')),
  status text not null default 'review' check (status in ('review', 'confirmed', 'manual', 'discarded')),
  extractor_method text not null default 'local_browser_ocr' check (extractor_method in ('local_browser_ocr', 'embedded_pdf_text', 'manual')),
  extractor_version text not null,
  page_count integer not null check (page_count between 1 and 100),
  patient_match_status text not null default 'not_checked' check (patient_match_status in ('match', 'mismatch', 'not_checked', 'confirmed_by_professional')),
  mismatch_field_codes text[] not null default '{}',
  created_by uuid not null references auth.users (id),
  confirmed_by uuid references auth.users (id),
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.document_extraction_pages (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.document_extraction_jobs (id) on delete cascade,
  patient_id uuid not null references public.patients (id) on delete cascade,
  page_number integer not null check (page_number > 0),
  proposed_classification text not null check (proposed_classification in ('posturography', 'vestibular_report', 'vhit_graph', 'referral', 'other_clinical', 'unrecognized')),
  classification text not null check (classification in ('posturography', 'vestibular_report', 'vhit_graph', 'referral', 'other_clinical', 'unrecognized')),
  classification_confidence numeric check (classification_confidence between 0 and 1),
  rotation_degrees integer not null default 0 check (rotation_degrees in (-270, -180, -90, 0, 90, 180, 270)),
  pixel_width integer,
  pixel_height integer,
  unique (job_id, page_number)
);

create table public.study_extraction_sections (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.document_extraction_jobs (id) on delete cascade,
  patient_id uuid not null references public.patients (id) on delete cascade,
  study_id uuid not null unique references public.clinical_studies (id) on delete cascade,
  study_type text not null check (study_type in ('posturography', 'vhit')),
  page_numbers integer[] not null,
  created_at timestamptz not null default now(),
  unique (job_id, study_type)
);

create table public.document_extraction_fields (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.document_extraction_jobs (id) on delete cascade,
  patient_id uuid not null references public.patients (id) on delete cascade,
  study_id uuid references public.clinical_studies (id) on delete cascade,
  client_key text not null,
  field_code text not null,
  field_label text not null,
  field_group text not null,
  study_type text not null check (study_type in ('posturography', 'vhit')),
  required boolean not null default false,
  metric_code text,
  raw_value text,
  normalized_value text,
  unit_code text,
  condition_code text,
  side text check (side is null or side in ('left', 'right', 'bilateral', 'unknown')),
  page_number integer not null check (page_number > 0),
  source_region jsonb,
  extraction_confidence numeric check (extraction_confidence between 0 and 1),
  extraction_status text not null check (extraction_status in ('read', 'review', 'unrecognized')),
  extractor_method text not null,
  extractor_version text not null,
  professional_value text,
  is_confirmed boolean not null default false,
  confirmed_by uuid references auth.users (id),
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (job_id, client_key)
);

create index document_extraction_jobs_patient_idx on public.document_extraction_jobs (patient_id, created_at desc);
create index document_extraction_pages_job_idx on public.document_extraction_pages (job_id, page_number);
create index document_extraction_fields_job_idx on public.document_extraction_fields (job_id, study_type, field_group);

create trigger extraction_jobs_set_updated_at before update on public.document_extraction_jobs
for each row execute function public.set_updated_at();
create trigger extraction_fields_set_updated_at before update on public.document_extraction_fields
for each row execute function public.set_updated_at();

alter table public.document_extraction_jobs enable row level security;
alter table public.document_extraction_pages enable row level security;
alter table public.study_extraction_sections enable row level security;
alter table public.document_extraction_fields enable row level security;

create policy extraction_jobs_professional_all on public.document_extraction_jobs
for all to authenticated using (public.is_professional() and public.owns_patient(patient_id))
with check (public.is_professional() and public.owns_patient(patient_id));
create policy extraction_pages_professional_all on public.document_extraction_pages
for all to authenticated using (public.is_professional() and public.owns_patient(patient_id))
with check (public.is_professional() and public.owns_patient(patient_id));
create policy extraction_sections_professional_all on public.study_extraction_sections
for all to authenticated using (public.is_professional() and public.owns_patient(patient_id))
with check (public.is_professional() and public.owns_patient(patient_id));
create policy extraction_fields_professional_all on public.document_extraction_fields
for all to authenticated using (public.is_professional() and public.owns_patient(patient_id))
with check (public.is_professional() and public.owns_patient(patient_id));

grant select, insert, update, delete on public.document_extraction_jobs to authenticated;
grant select, insert, update, delete on public.document_extraction_pages to authenticated;
grant select, insert, update, delete on public.study_extraction_sections to authenticated;
grant select, insert, update, delete on public.document_extraction_fields to authenticated;

create or replace function public.create_document_extraction_draft(
  target_document_id uuid,
  extraction_payload jsonb,
  study_date date,
  target_treatment_cycle_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  document_record public.source_documents%rowtype;
  v_job_id uuid;
  page_item jsonb;
  field_item jsonb;
  posturography_study_id uuid;
  vestibular_study_id uuid;
  target_study_id uuid;
  posturography_pages integer[];
  vestibular_pages integer[];
  study_ids uuid[] := '{}';
  payload_pages jsonb := coalesce(extraction_payload -> 'pages', '[]'::jsonb);
  payload_fields jsonb := coalesce(extraction_payload -> 'fields', '[]'::jsonb);
begin
  select * into document_record from public.source_documents
  where id = target_document_id and public.owns_patient(patient_id) and public.is_professional()
  for update;
  if document_record.id is null then raise exception 'Documento no encontrado o sin permiso.'; end if;
  if jsonb_typeof(payload_pages) <> 'array' or jsonb_array_length(payload_pages) not between 1 and 100 then raise exception 'Cantidad de páginas inválida.'; end if;
  if jsonb_typeof(payload_fields) <> 'array' or jsonb_array_length(payload_fields) > 500 then raise exception 'Cantidad de campos inválida.'; end if;
  if exists (select 1 from public.document_extraction_jobs where source_document_id = target_document_id) then raise exception 'El documento ya tiene una extracción.'; end if;

  insert into public.document_extraction_jobs (
    source_document_id, patient_id, intake_kind, extractor_method, extractor_version, page_count,
    patient_match_status, mismatch_field_codes, created_by
  ) values (
    target_document_id, document_record.patient_id, extraction_payload ->> 'intake_kind', 'local_browser_ocr',
    extraction_payload ->> 'extractor_version', jsonb_array_length(payload_pages),
    coalesce(extraction_payload ->> 'patient_match_status', 'not_checked'),
    coalesce(array(select jsonb_array_elements_text(coalesce(extraction_payload -> 'mismatch_fields', '[]'::jsonb))), '{}'), auth.uid()
  ) returning id into v_job_id;

  for page_item in select value from jsonb_array_elements(payload_pages) loop
    insert into public.document_extraction_pages (
      job_id, patient_id, page_number, proposed_classification, classification,
      classification_confidence, rotation_degrees, pixel_width, pixel_height
    ) values (
      v_job_id, document_record.patient_id, (page_item ->> 'page_number')::integer,
      page_item ->> 'proposed_classification', page_item ->> 'classification',
      nullif(page_item ->> 'classification_confidence', '')::numeric,
      coalesce(nullif(page_item ->> 'rotation_degrees', '')::integer, 0),
      nullif(page_item ->> 'width', '')::integer, nullif(page_item ->> 'height', '')::integer
    );
  end loop;

  select array_agg(page.page_number order by page.page_number) into posturography_pages
  from public.document_extraction_pages page where page.job_id = v_job_id and page.classification = 'posturography';
  select array_agg(page.page_number order by page.page_number) into vestibular_pages
  from public.document_extraction_pages page where page.job_id = v_job_id and page.classification in ('vestibular_report', 'vhit_graph', 'referral', 'other_clinical');

  if posturography_pages is not null or extraction_payload ->> 'intake_kind' = 'posturography_bap' then
    insert into public.clinical_studies (patient_id, treatment_cycle_id, source_document_id, study_type, performed_at, protocol_code, protocol_version, status, created_by)
    values (document_record.patient_id, target_treatment_cycle_id, target_document_id, 'posturography', study_date::timestamptz + interval '12 hours', 'bap-auto-review', '1', 'draft', auth.uid())
    returning id into posturography_study_id;
    insert into public.study_extraction_sections (job_id, patient_id, study_id, study_type, page_numbers)
    values (v_job_id, document_record.patient_id, posturography_study_id, 'posturography', coalesce(posturography_pages, array[1]));
    study_ids := array_append(study_ids, posturography_study_id);
  end if;
  if vestibular_pages is not null or posturography_study_id is null then
    insert into public.clinical_studies (patient_id, treatment_cycle_id, source_document_id, study_type, performed_at, protocol_code, protocol_version, status, created_by)
    values (document_record.patient_id, target_treatment_cycle_id, target_document_id, 'vhit', study_date::timestamptz + interval '12 hours', 'vestibular-auto-review', '1', 'draft', auth.uid())
    returning id into vestibular_study_id;
    insert into public.study_extraction_sections (job_id, patient_id, study_id, study_type, page_numbers)
    values (v_job_id, document_record.patient_id, vestibular_study_id, 'vhit', coalesce(vestibular_pages, array[1]));
    study_ids := array_append(study_ids, vestibular_study_id);
  end if;

  for field_item in select value from jsonb_array_elements(payload_fields) loop
    target_study_id := case when field_item ->> 'study_type' = 'posturography' then posturography_study_id else vestibular_study_id end;
    if target_study_id is not null then
      insert into public.document_extraction_fields (
        job_id, patient_id, study_id, client_key, field_code, field_label, field_group, study_type,
        required, metric_code, raw_value, normalized_value, unit_code, condition_code, side,
        page_number, source_region, extraction_confidence, extraction_status, extractor_method,
        extractor_version, professional_value
      ) values (
        v_job_id, document_record.patient_id, target_study_id, field_item ->> 'client_id', field_item ->> 'code',
        field_item ->> 'label', field_item ->> 'group', field_item ->> 'study_type',
        coalesce((field_item ->> 'required')::boolean, false), nullif(field_item ->> 'metric_code', ''),
        nullif(field_item ->> 'raw_value', ''), nullif(field_item ->> 'normalized_value', ''),
        nullif(field_item ->> 'unit_code', ''), nullif(field_item ->> 'condition_code', ''),
        nullif(field_item ->> 'side', ''), (field_item ->> 'page_number')::integer,
        field_item -> 'region', nullif(field_item ->> 'confidence', '')::numeric,
        field_item ->> 'status', field_item ->> 'extractor_method', field_item ->> 'extractor_version',
        nullif(field_item ->> 'professional_value', '')
      );
    end if;
  end loop;

  insert into public.audit_events (actor_user_id, action, entity_type, entity_id, metadata) values
    (auth.uid(), 'clinical_document_uploaded_private', 'source_document', target_document_id, jsonb_build_object('page_count', jsonb_array_length(payload_pages))),
    (auth.uid(), 'clinical_extraction_started', 'document_extraction', v_job_id, jsonb_build_object('method', 'local_browser_ocr', 'version', extraction_payload ->> 'extractor_version')),
    (auth.uid(), 'clinical_pages_classified', 'document_extraction', v_job_id, jsonb_build_object('page_count', jsonb_array_length(payload_pages), 'section_count', cardinality(study_ids)));
  return jsonb_build_object('job_id', v_job_id, 'study_ids', to_jsonb(study_ids));
end;
$$;

create or replace function public.save_document_extraction_review(
  target_job_id uuid,
  review_payload jsonb
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
  correction_count integer := 0;
begin
  select * into job_record from public.document_extraction_jobs
  where id = target_job_id and public.owns_patient(patient_id) and public.is_professional() for update;
  if job_record.id is null then raise exception 'Extracción no encontrada o sin permiso.'; end if;
  if job_record.status <> 'review' then raise exception 'El borrador ya no admite cambios.'; end if;

  for page_item in select value from jsonb_array_elements(coalesce(review_payload -> 'pages', '[]'::jsonb)) loop
    update public.document_extraction_pages set classification = page_item ->> 'classification'
    where job_id = target_job_id and page_number = (page_item ->> 'page_number')::integer
      and classification is distinct from page_item ->> 'classification';
    correction_count := correction_count + case when found then 1 else 0 end;
  end loop;

  for field_item in select value from jsonb_array_elements(coalesce(review_payload -> 'fields', '[]'::jsonb)) loop
    update public.document_extraction_fields set
      professional_value = nullif(field_item ->> 'professional_value', ''),
      normalized_value = nullif(field_item ->> 'normalized_value', ''),
      metric_code = nullif(field_item ->> 'metric_code', ''),
      unit_code = nullif(field_item ->> 'unit_code', ''),
      condition_code = nullif(field_item ->> 'condition_code', ''),
      side = nullif(field_item ->> 'side', ''),
      extraction_status = field_item ->> 'status',
      is_confirmed = coalesce((field_item ->> 'confirmed')::boolean, false),
      confirmed_by = case when coalesce((field_item ->> 'confirmed')::boolean, false) then auth.uid() else null end,
      confirmed_at = case when coalesce((field_item ->> 'confirmed')::boolean, false) then now() else null end
    where job_id = target_job_id and client_key = field_item ->> 'client_id';
    correction_count := correction_count + case when found then 1 else 0 end;
  end loop;

  update public.document_extraction_jobs set
    patient_match_status = coalesce(review_payload ->> 'patient_match_status', patient_match_status)
  where id = target_job_id;
  insert into public.audit_events (actor_user_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), 'clinical_extraction_review_saved', 'document_extraction', target_job_id, jsonb_build_object('changed_items', correction_count));
end;
$$;

create or replace function public.confirm_document_extraction(target_job_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  job_record public.document_extraction_jobs%rowtype;
  section_record record;
  metric_payload jsonb;
  results jsonb := '[]'::jsonb;
begin
  select * into job_record from public.document_extraction_jobs
  where id = target_job_id and public.owns_patient(patient_id) and public.is_professional() for update;
  if job_record.id is null then raise exception 'Extracción no encontrada o sin permiso.'; end if;
  if job_record.status <> 'review' then raise exception 'El borrador ya fue confirmado, descartado o marcado manual.'; end if;
  if job_record.patient_match_status = 'mismatch' then raise exception 'La discrepancia de paciente debe resolverse antes de confirmar.'; end if;
  if exists (select 1 from public.document_extraction_pages where job_id = target_job_id and classification = 'unrecognized') then raise exception 'Todas las páginas deben tener una clasificación confirmada.'; end if;
  if exists (select 1 from public.document_extraction_fields where job_id = target_job_id and required and (coalesce(btrim(professional_value), '') = '' or not is_confirmed)) then raise exception 'Hay campos obligatorios faltantes o sin confirmar.'; end if;
  if exists (select 1 from public.document_extraction_fields where job_id = target_job_id and coalesce(btrim(professional_value), '') <> '' and not is_confirmed) then raise exception 'Todos los valores presentes deben estar confirmados.'; end if;

  update public.document_extraction_jobs set status = 'confirmed', confirmed_by = auth.uid(), confirmed_at = now() where id = target_job_id;
  for section_record in select * from public.study_extraction_sections where job_id = target_job_id loop
    select jsonb_agg(jsonb_build_object(
      'metric_code', field.metric_code,
      'raw_value', coalesce(field.professional_value, field.raw_value),
      'normalized_numeric_value', case when definition.value_kind = 'numeric' and field.normalized_value ~ '^[+-]?(?:[0-9]+(?:\.[0-9]*)?|\.[0-9]+)$' then field.normalized_value else null end,
      'normalized_text_value', case when definition.value_kind <> 'numeric' or field.normalized_value !~ '^[+-]?(?:[0-9]+(?:\.[0-9]*)?|\.[0-9]+)$' then field.normalized_value else null end,
      'unit_code', field.unit_code, 'condition_code', field.condition_code, 'side', field.side,
      'axis', null, 'trial_number', null, 'source_method', 'ocr',
      'source_location', 'Página ' || field.page_number,
      'normalization_rule_version', 'onur-normalization-1.0',
      'quality_status', case when field.normalized_value in ('infinite', 'not_recorded') then 'review' else 'ok' end,
      'issues', '[]'::jsonb
    ) order by field.created_at) into metric_payload
    from public.document_extraction_fields field
    left join lateral (select value_kind from public.metric_definitions where code = field.metric_code order by version desc limit 1) definition on true
    where field.job_id = target_job_id and field.study_id = section_record.study_id
      and field.metric_code is not null and coalesce(btrim(field.professional_value), '') <> '' and field.is_confirmed;
    if metric_payload is null or jsonb_array_length(metric_payload) = 0 then raise exception 'Cada sección necesita al menos un valor estructurado confirmado.'; end if;
    results := results || jsonb_build_array(public.replace_study_import(section_record.study_id, metric_payload, 'Transcripción confirmada desde extracción local.', false, job_record.extractor_version));
  end loop;
  insert into public.audit_events (actor_user_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), 'clinical_extraction_confirmed', 'document_extraction', target_job_id,
    jsonb_build_object('field_count', (select count(*) from public.document_extraction_fields where job_id = target_job_id and is_confirmed), 'section_count', (select count(*) from public.study_extraction_sections where job_id = target_job_id)));
  return jsonb_build_object('sections', results);
end;
$$;

create or replace function public.mark_document_extraction_manual(target_job_id uuid)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare job_record public.document_extraction_jobs%rowtype;
begin
  select * into job_record from public.document_extraction_jobs where id = target_job_id and public.owns_patient(patient_id) and public.is_professional() for update;
  if job_record.id is null or job_record.status <> 'review' then raise exception 'Borrador no disponible.'; end if;
  update public.document_extraction_jobs set status = 'manual' where id = target_job_id;
  insert into public.audit_events (actor_user_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), 'clinical_extraction_manual_selected', 'document_extraction', target_job_id, '{}'::jsonb);
end; $$;

create or replace function public.discard_document_extraction(target_job_id uuid)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare job_record public.document_extraction_jobs%rowtype;
begin
  select * into job_record from public.document_extraction_jobs where id = target_job_id and public.owns_patient(patient_id) and public.is_professional() for update;
  if job_record.id is null or job_record.status <> 'review' then raise exception 'Borrador no disponible.'; end if;
  update public.document_extraction_jobs set status = 'discarded' where id = target_job_id;
  insert into public.audit_events (actor_user_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), 'clinical_extraction_discarded', 'document_extraction', target_job_id, jsonb_build_object('source_retained', true));
end; $$;

create or replace function public.protect_extraction_review_transition()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if old.status = 'draft' and new.status in ('reviewed', 'finalized') and exists (
    select 1 from public.study_extraction_sections section
    join public.document_extraction_jobs job on job.id = section.job_id
    where section.study_id = new.id and job.status not in ('confirmed', 'manual')
  ) then raise exception 'La extracción debe confirmarse o pasar a carga manual.'; end if;
  return new;
end; $$;

create trigger clinical_studies_require_extraction_confirmation
before update of status on public.clinical_studies
for each row execute function public.protect_extraction_review_transition();

insert into public.metric_definitions (code, version, domain, label, value_kind, allowed_units, requires_unit, requires_condition, zero_policy, status)
values
  ('los_forward', 1, 'posturography', 'Límite de estabilidad adelante', 'numeric', array['percent'], true, false, 'unknown', 'draft'),
  ('los_backward', 1, 'posturography', 'Límite de estabilidad atrás', 'numeric', array['percent'], true, false, 'unknown', 'draft'),
  ('los_left', 1, 'posturography', 'Límite de estabilidad izquierda', 'numeric', array['percent'], true, false, 'unknown', 'draft'),
  ('los_right', 1, 'posturography', 'Límite de estabilidad derecha', 'numeric', array['percent'], true, false, 'unknown', 'draft'),
  ('sway_x', 1, 'posturography', 'Sway X', 'numeric', array['deg','deg_s','score'], true, false, 'allowed', 'draft'),
  ('sway_y', 1, 'posturography', 'Sway Y', 'numeric', array['deg','deg_s','score'], true, false, 'allowed', 'draft'),
  ('mix_ve_som', 1, 'posturography', 'Def. Mix Ve Som', 'numeric', array['score','percent'], true, false, 'unknown', 'blocked'),
  ('mix_ve_vi', 1, 'posturography', 'Def. Mixto Ve Vi', 'numeric', array['score','percent'], true, false, 'unknown', 'blocked'),
  ('condition_percentage', 1, 'posturography', 'Porcentaje de condiciones', 'numeric', array['percent'], true, false, 'unknown', 'draft'),
  ('afis_pattern_text', 1, 'posturography', 'Patrón Afis informado', 'text', '{}', false, false, 'allowed', 'draft'),
  ('sensory_distribution_text', 1, 'posturography', 'Distribución sensorial informada', 'text', '{}', false, false, 'allowed', 'draft'),
  ('reported_conclusion_text', 1, 'vhit', 'Conclusión profesional transcripta', 'text', '{}', false, false, 'allowed', 'draft'),
  ('institution_text', 1, 'vhit', 'Institución informada', 'text', '{}', false, false, 'allowed', 'draft'),
  ('document_type_text', 1, 'vhit', 'Tipo de documento informado', 'text', '{}', false, false, 'allowed', 'draft'),
  ('professional_text', 1, 'vhit', 'Profesional informado', 'text', '{}', false, false, 'allowed', 'draft'),
  ('referral_reason_text', 1, 'vhit', 'Motivo de derivación transcripto', 'text', '{}', false, false, 'allowed', 'draft'),
  ('history_text', 1, 'vhit', 'Antecedentes transcriptos', 'text', '{}', false, false, 'allowed', 'draft'),
  ('symptoms_text', 1, 'vhit', 'Síntomas transcriptos', 'text', '{}', false, false, 'allowed', 'draft'),
  ('evolution_text', 1, 'vhit', 'Evolución transcripta', 'text', '{}', false, false, 'allowed', 'draft'),
  ('clinical_exam_text', 1, 'vhit', 'Examen clínico transcripto', 'text', '{}', false, false, 'allowed', 'draft'),
  ('himp_text', 1, 'vhit', 'HIMP informado', 'text', '{}', false, false, 'allowed', 'draft'),
  ('shimp_text', 1, 'vhit', 'SHIMP informado', 'text', '{}', false, false, 'allowed', 'draft'),
  ('symmetry_text', 1, 'vhit', 'Simetría informada', 'text', '{}', false, false, 'allowed', 'draft'),
  ('curves_channels_text', 1, 'vhit', 'Curvas y canales transcriptos', 'text', '{}', false, false, 'allowed', 'draft'),
  ('cranial_nerve_vii_text', 1, 'vhit', 'VII par transcripto', 'text', '{}', false, false, 'allowed', 'draft'),
  ('fixation_system_text', 1, 'vhit', 'Sistema de fijación transcripto', 'text', '{}', false, false, 'allowed', 'draft'),
  ('visual_suppression_text', 1, 'vhit', 'Supresión visual transcripta', 'text', '{}', false, false, 'allowed', 'draft'),
  ('skew_text', 1, 'vhit', 'SKEW transcripto', 'text', '{}', false, false, 'allowed', 'draft'),
  ('head_shaking_text', 1, 'vhit', 'Head Shaking Test transcripto', 'text', '{}', false, false, 'allowed', 'draft'),
  ('vibration_test_text', 1, 'vhit', 'Test vibracional transcripto', 'text', '{}', false, false, 'allowed', 'draft'),
  ('vor_cancellation_text', 1, 'vhit', 'Cancelación del VOR transcripta', 'text', '{}', false, false, 'allowed', 'draft'),
  ('positional_tests_text', 1, 'vhit', 'Pruebas posicionales transcriptas', 'text', '{}', false, false, 'allowed', 'draft'),
  ('gait_text', 1, 'vhit', 'Marcha transcripta', 'text', '{}', false, false, 'allowed', 'draft'),
  ('saccadic_precision_text', 1, 'vhit', 'Precisión sacádica transcripta', 'text', '{}', false, false, 'allowed', 'draft'),
  ('smooth_pursuit_text', 1, 'vhit', 'Seguimiento ocular lento transcripto', 'text', '{}', false, false, 'allowed', 'draft'),
  ('deep_sensation_text', 1, 'vhit', 'Sensibilidad profunda transcripta', 'text', '{}', false, false, 'allowed', 'draft'),
  ('reflexes_text', 1, 'vhit', 'Reflejos transcriptos', 'text', '{}', false, false, 'allowed', 'draft'),
  ('conduct_text', 1, 'vhit', 'Conducta transcripta', 'text', '{}', false, false, 'allowed', 'draft'),
  ('professional_observations_text', 1, 'vhit', 'Observaciones profesionales transcriptas', 'text', '{}', false, false, 'allowed', 'draft')
on conflict (code, version) do nothing;

revoke all on function public.create_document_extraction_draft(uuid, jsonb, date, uuid) from public;
revoke all on function public.save_document_extraction_review(uuid, jsonb) from public;
revoke all on function public.confirm_document_extraction(uuid) from public;
revoke all on function public.mark_document_extraction_manual(uuid) from public;
revoke all on function public.discard_document_extraction(uuid) from public;
revoke all on function public.protect_extraction_review_transition() from public;
grant execute on function public.create_document_extraction_draft(uuid, jsonb, date, uuid) to authenticated;
grant execute on function public.save_document_extraction_review(uuid, jsonb) to authenticated;
grant execute on function public.confirm_document_extraction(uuid) to authenticated;
grant execute on function public.mark_document_extraction_manual(uuid) to authenticated;
grant execute on function public.discard_document_extraction(uuid) to authenticated;
