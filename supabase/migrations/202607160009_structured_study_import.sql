-- Importación estructurada, control de calidad y revisión de sugerencias.

alter table public.clinical_studies
  add column if not exists calculation_method_version text,
  add column if not exists quality_notes text,
  add column if not exists interpretable boolean not null default false,
  add column if not exists non_interpretable_reason text;

create table public.metric_definitions (
  code text not null,
  version integer not null check (version > 0),
  domain text not null,
  label text not null,
  value_kind text not null check (value_kind in ('numeric', 'categorical', 'boolean')),
  allowed_units text[] not null default '{}',
  requires_unit boolean not null default false,
  requires_condition boolean not null default false,
  zero_policy text not null default 'unknown' check (zero_policy in ('allowed', 'not_allowed', 'unknown')),
  status text not null default 'draft' check (status in ('draft', 'approved', 'retired', 'blocked')),
  created_at timestamptz not null default now(),
  primary key (code, version)
);

comment on table public.metric_definitions is 'Diccionario versionado; no contiene umbrales clínicos ni conclusiones.';

create table public.import_jobs (
  id uuid primary key default gen_random_uuid(),
  study_id uuid not null unique references public.clinical_studies (id) on delete cascade,
  source_document_id uuid references public.source_documents (id) on delete set null,
  status text not null check (status in ('mapping', 'review', 'confirmed', 'failed')),
  parser_type text not null default 'manual_transcription',
  parser_version text not null,
  mapping_definition jsonb not null default '{}'::jsonb,
  result_summary jsonb not null default '{}'::jsonb,
  created_by uuid not null references auth.users (id),
  confirmed_by uuid references auth.users (id),
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger import_jobs_set_updated_at before update on public.import_jobs
for each row execute function public.set_updated_at();

alter table public.metric_definitions enable row level security;
alter table public.import_jobs enable row level security;

create policy metric_definitions_professional_select on public.metric_definitions
for select to authenticated using (public.is_professional());

create policy import_jobs_professional_all on public.import_jobs
for all to authenticated using (
  exists (
    select 1 from public.clinical_studies study
    where study.id = import_jobs.study_id and public.owns_patient(study.patient_id)
  )
) with check (
  exists (
    select 1 from public.clinical_studies study
    where study.id = import_jobs.study_id and public.owns_patient(study.patient_id)
  )
);

grant select on public.metric_definitions to authenticated;
grant select, insert, update, delete on public.import_jobs to authenticated;

insert into public.metric_definitions (code, version, domain, label, value_kind, allowed_units, requires_unit, requires_condition, zero_policy, status)
values
  ('los_value', 1, 'posturography', 'Límite de estabilidad (LOS)', 'numeric', array['percent','score','deg','cm2','mm2'], true, false, 'unknown', 'draft'),
  ('los_score', 1, 'posturography', 'Score LOS', 'numeric', array['percent','score'], true, false, 'unknown', 'draft'),
  ('los_area', 1, 'posturography', 'Área LOS', 'numeric', array['cm2','mm2'], true, false, 'allowed', 'draft'),
  ('condition_score', 1, 'posturography', 'Puntaje por condición', 'numeric', array['percent','score'], true, true, 'unknown', 'approved'),
  ('composite_score', 1, 'posturography', 'Composite', 'numeric', array['percent','score'], true, false, 'unknown', 'draft'),
  ('sensory_ratio_somatosensory', 1, 'posturography', 'Cociente somatosensorial', 'numeric', array['percent','ratio'], true, false, 'unknown', 'blocked'),
  ('sensory_ratio_visual', 1, 'posturography', 'Cociente visual', 'numeric', array['percent','ratio'], true, false, 'unknown', 'blocked'),
  ('sensory_ratio_vestibular', 1, 'posturography', 'Cociente vestibular', 'numeric', array['percent','ratio'], true, false, 'unknown', 'blocked'),
  ('visual_preference_index', 1, 'posturography', 'Preferencia visual', 'numeric', array['percent','ratio'], true, false, 'unknown', 'blocked'),
  ('sway_value', 1, 'posturography', 'Sway', 'numeric', array['score','deg','deg_s','cm2','mm2'], true, true, 'allowed', 'draft'),
  ('fall_event', 1, 'posturography', 'Evento de caída', 'boolean', '{}', false, true, 'allowed', 'approved'),
  ('pppd_index_value', 1, 'posturography', 'Índice 3PD / PPPD', 'numeric', array['score','percent','ratio'], true, false, 'unknown', 'blocked'),
  ('tug_seconds', 1, 'posturography', 'TUG', 'numeric', array['seconds'], true, false, 'not_allowed', 'draft'),
  ('frequency_hz', 1, 'vhit', 'Frecuencia', 'numeric', array['hz'], true, false, 'not_allowed', 'approved'),
  ('gain', 1, 'vhit', 'Ganancia', 'numeric', array['ratio'], true, false, 'unknown', 'approved'),
  ('result_label', 1, 'vhit', 'Resultado informado', 'categorical', '{}', false, false, 'allowed', 'draft'),
  ('saccade_present', 1, 'vhit', 'Presencia de sacadas', 'boolean', '{}', false, false, 'allowed', 'approved'),
  ('saccade_type', 1, 'vhit', 'Tipo de sacada', 'categorical', '{}', false, false, 'allowed', 'draft'),
  ('saccade_velocity_deg_s', 1, 'vhit', 'Velocidad de sacada', 'numeric', array['deg_s'], true, false, 'not_allowed', 'draft')
on conflict (code, version) do nothing;

insert into public.statistical_rules (code, version, title, domain, formula_definition, reference_definition, limitations, status)
values
  ('DQ-006', 1, 'Formato no reconocido', 'quality', '{"action":"quarantine"}', '{}', 'Conserva el valor original y solicita revisión.', 'approved'),
  ('DQ-007', 1, 'Posible duplicado', 'quality', '{"match":["metric_code","condition_code","side","axis","trial_number"]}', '{}', 'No fusiona ni elimina registros automáticamente.', 'approved')
on conflict (code, version) do nothing;

update public.statistical_rules
set status = 'approved', approved_at = coalesce(approved_at, now())
where code in ('DQ-001','DQ-002','DQ-003','DQ-004','DQ-005','DQ-006','DQ-007','LONG-001','LONG-002','VOR-001','BAP-001','VPPB-001')
  and status = 'draft';

create or replace function public.replace_study_import(
  target_study_id uuid,
  metric_payload jsonb,
  import_quality_notes text,
  import_interpretable boolean,
  parser_version text
)
returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  study_record record;
  metric_item jsonb;
  issue_item jsonb;
  inserted_metric_id uuid;
  metric_count integer := 0;
  issue_count integer := 0;
  blocked_count integer := 0;
  suggestion_count integer := 0;
  bap_rule_id uuid;
  long_rule_id uuid;
  previous_study_id uuid;
  bap_metric_count integer;
  matched_count integer;
begin
  select * into study_record
  from public.clinical_studies
  where id = target_study_id and public.owns_patient(patient_id)
  for update;

  if study_record.id is null then raise exception 'Estudio no encontrado o sin permiso.'; end if;
  if not public.is_professional() then raise exception 'Se requiere rol profesional.'; end if;
  if study_record.status = 'finalized' then raise exception 'Un estudio finalizado no puede reemplazarse.'; end if;
  if btrim(study_record.protocol_code) = '' or btrim(study_record.protocol_version) = '' then raise exception 'El protocolo y su versión son obligatorios.'; end if;
  if jsonb_typeof(metric_payload) <> 'array' or jsonb_array_length(metric_payload) = 0 then raise exception 'Se requiere al menos una métrica.'; end if;
  if jsonb_array_length(metric_payload) > 500 then raise exception 'La importación supera el máximo de 500 métricas.'; end if;

  delete from public.statistical_suggestions where study_id = target_study_id;
  delete from public.data_quality_issues where study_id = target_study_id;
  delete from public.metric_values where study_id = target_study_id;

  for metric_item in select value from jsonb_array_elements(metric_payload)
  loop
    insert into public.metric_values (
      study_id, metric_code, raw_value, normalized_numeric_value, normalized_text_value,
      unit_code, condition_code, side, axis, trial_number, source_method,
      source_location, normalization_rule_version, quality_status, verified_by, verified_at
    ) values (
      target_study_id,
      metric_item ->> 'metric_code',
      metric_item ->> 'raw_value',
      nullif(metric_item ->> 'normalized_numeric_value', '')::numeric,
      nullif(metric_item ->> 'normalized_text_value', ''),
      nullif(metric_item ->> 'unit_code', ''),
      nullif(metric_item ->> 'condition_code', ''),
      nullif(metric_item ->> 'side', ''),
      nullif(metric_item ->> 'axis', ''),
      nullif(metric_item ->> 'trial_number', '')::integer,
      coalesce(nullif(metric_item ->> 'source_method', ''), 'transcribed'),
      nullif(metric_item ->> 'source_location', ''),
      metric_item ->> 'normalization_rule_version',
      (metric_item ->> 'quality_status')::public.quality_status,
      auth.uid(),
      now()
    ) returning id into inserted_metric_id;
    metric_count := metric_count + 1;

    if metric_item ->> 'quality_status' in ('blocked', 'quarantine') then blocked_count := blocked_count + 1; end if;
    for issue_item in select value from jsonb_array_elements(coalesce(metric_item -> 'issues', '[]'::jsonb))
    loop
      insert into public.data_quality_issues (study_id, metric_value_id, rule_code, severity, message)
      values (target_study_id, inserted_metric_id, issue_item ->> 'rule_code', (issue_item ->> 'severity')::public.quality_status, issue_item ->> 'message');
      issue_count := issue_count + 1;
    end loop;
  end loop;

  insert into public.import_jobs (
    study_id, source_document_id, status, parser_type, parser_version,
    mapping_definition, result_summary, created_by, confirmed_by, confirmed_at
  ) values (
    target_study_id, study_record.source_document_id, 'confirmed', 'manual_transcription', parser_version,
    jsonb_build_object('metric_dictionary_version', 1),
    jsonb_build_object('metrics', metric_count, 'issues', issue_count, 'blocked_or_quarantine', blocked_count),
    auth.uid(), auth.uid(), now()
  ) on conflict (study_id) do update set
    status = excluded.status,
    parser_type = excluded.parser_type,
    parser_version = excluded.parser_version,
    mapping_definition = excluded.mapping_definition,
    result_summary = excluded.result_summary,
    confirmed_by = excluded.confirmed_by,
    confirmed_at = excluded.confirmed_at;

  update public.clinical_studies
  set status = 'reviewed',
      quality_notes = nullif(import_quality_notes, ''),
      interpretable = import_interpretable and blocked_count = 0,
      non_interpretable_reason = case
        when blocked_count > 0 then 'Existen valores bloqueados o en cuarentena.'
        when not import_interpretable then 'Marcado como no interpretable por el profesional.'
        else null
      end,
      calculation_method_version = coalesce(calculation_method_version, parser_version)
  where id = target_study_id;

  if study_record.study_type = 'posturography' and study_record.protocol_code in ('bap-a-d', 'bap-1-6') then
    select id into bap_rule_id from public.statistical_rules where code = 'BAP-001' and status = 'approved' order by version desc limit 1;
    select count(*) into bap_metric_count from public.metric_values
      where study_id = target_study_id and metric_code = 'condition_score' and quality_status = 'ok' and normalized_numeric_value is not null;
    if bap_rule_id is not null and bap_metric_count >= 2 then
      insert into public.statistical_suggestions (
        patient_id, study_id, rule_id, input_metric_ids, observed_result, statistical_message, limitations
      ) select
        study_record.patient_id,
        target_study_id,
        bap_rule_id,
        array_agg(id order by condition_code),
        jsonb_build_object(
          'protocol_code', study_record.protocol_code,
          'protocol_version', study_record.protocol_version,
          'conditions', jsonb_agg(jsonb_build_object('condition', condition_code, 'value', normalized_numeric_value, 'unit', unit_code) order by condition_code)
        ),
        'Se registró un perfil descriptivo de ' || bap_metric_count || ' condiciones del protocolo. Se sugiere revisar conjuntamente estas métricas en el contexto clínico.',
        'No se aplicó un umbral normativo ni se atribuye el patrón a una causa clínica.'
      from public.metric_values
      where study_id = target_study_id and metric_code = 'condition_score' and quality_status = 'ok' and normalized_numeric_value is not null;
      suggestion_count := suggestion_count + 1;
    end if;
  end if;

  select id into previous_study_id
  from public.clinical_studies
  where patient_id = study_record.patient_id
    and id <> target_study_id
    and study_type = study_record.study_type
    and protocol_code = study_record.protocol_code
    and protocol_version = study_record.protocol_version
    and calculation_method_version is not distinct from coalesce(study_record.calculation_method_version, parser_version)
    and performed_at < study_record.performed_at
    and status in ('reviewed', 'finalized')
  order by performed_at desc
  limit 1;

  select id into long_rule_id from public.statistical_rules where code = 'LONG-001' and status = 'approved' order by version desc limit 1;
  if previous_study_id is not null and long_rule_id is not null then
    select count(*) into matched_count
    from public.metric_values current_metric
    join public.metric_values previous_metric
      on previous_metric.study_id = previous_study_id
     and previous_metric.metric_code = current_metric.metric_code
     and previous_metric.unit_code is not distinct from current_metric.unit_code
     and previous_metric.condition_code is not distinct from current_metric.condition_code
     and previous_metric.side is not distinct from current_metric.side
     and previous_metric.axis is not distinct from current_metric.axis
     and previous_metric.trial_number is not distinct from current_metric.trial_number
    where current_metric.study_id = target_study_id
      and current_metric.quality_status = 'ok'
      and previous_metric.quality_status = 'ok'
      and current_metric.normalized_numeric_value is not null
      and previous_metric.normalized_numeric_value is not null;

    if matched_count > 0 then
      insert into public.statistical_suggestions (
        patient_id, study_id, rule_id, input_metric_ids, observed_result, statistical_message, limitations
      )
      with matched as (
        select current_metric.id as current_id, previous_metric.id as previous_id,
          current_metric.metric_code, current_metric.condition_code, current_metric.side,
          current_metric.unit_code, previous_metric.normalized_numeric_value as initial_value,
          current_metric.normalized_numeric_value as final_value,
          current_metric.normalized_numeric_value - previous_metric.normalized_numeric_value as absolute_difference
        from public.metric_values current_metric
        join public.metric_values previous_metric
          on previous_metric.study_id = previous_study_id
         and previous_metric.metric_code = current_metric.metric_code
         and previous_metric.unit_code is not distinct from current_metric.unit_code
         and previous_metric.condition_code is not distinct from current_metric.condition_code
         and previous_metric.side is not distinct from current_metric.side
         and previous_metric.axis is not distinct from current_metric.axis
         and previous_metric.trial_number is not distinct from current_metric.trial_number
        where current_metric.study_id = target_study_id
          and current_metric.quality_status = 'ok'
          and previous_metric.quality_status = 'ok'
          and current_metric.normalized_numeric_value is not null
          and previous_metric.normalized_numeric_value is not null
      )
      select
        study_record.patient_id,
        target_study_id,
        long_rule_id,
        array_agg(current_id) || array_agg(previous_id),
        jsonb_build_object('previous_study_id', previous_study_id, 'comparisons', jsonb_agg(to_jsonb(matched) - 'current_id' - 'previous_id')),
        'Se observan diferencias respecto de la evaluación anterior compatible en ' || matched_count || ' métricas.',
        'Comparación descriptiva entre estudios compatibles. No atribuye los cambios al entrenamiento ni establece relevancia clínica.'
      from matched;
      suggestion_count := suggestion_count + 1;
    end if;
  end if;

  return jsonb_build_object('metric_count', metric_count, 'issue_count', issue_count, 'suggestion_count', suggestion_count);
end;
$$;

create or replace function public.review_statistical_suggestion(
  target_suggestion_id uuid,
  review_decision public.suggestion_status,
  review_text text default null
)
returns void
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare target_patient_id uuid;
begin
  if review_decision = 'pending' then raise exception 'La decisión no puede quedar pendiente.'; end if;
  select patient_id into target_patient_id from public.statistical_suggestions where id = target_suggestion_id for update;
  if target_patient_id is null or not public.owns_patient(target_patient_id) or not public.is_professional() then
    raise exception 'Sugerencia no encontrada o sin permiso.';
  end if;
  update public.statistical_suggestions set status = review_decision where id = target_suggestion_id;
  insert into public.professional_reviews (suggestion_id, professional_id, decision, professional_text, reviewed_at)
  values (target_suggestion_id, auth.uid(), review_decision, nullif(review_text, ''), now())
  on conflict (suggestion_id) do update set
    professional_id = excluded.professional_id,
    decision = excluded.decision,
    professional_text = excluded.professional_text,
    reviewed_at = excluded.reviewed_at;
end;
$$;

create or replace function public.audit_import_job_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.audit_events (actor_user_id, action, entity_type, entity_id, metadata)
  values (
    coalesce(new.confirmed_by, new.created_by),
    case when new.status = 'confirmed' then 'study_import_confirmed' else 'study_import_updated' end,
    'clinical_study',
    new.study_id,
    jsonb_build_object('import_job_id', new.id, 'status', new.status, 'parser_version', new.parser_version, 'summary', new.result_summary)
  );
  return new;
end;
$$;

create trigger import_jobs_audit
after insert or update on public.import_jobs
for each row execute function public.audit_import_job_change();

create or replace function public.audit_professional_review_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.audit_events (actor_user_id, action, entity_type, entity_id, metadata)
  values (
    new.professional_id,
    'statistical_suggestion_reviewed',
    'statistical_suggestion',
    new.suggestion_id,
    jsonb_build_object('decision', new.decision, 'reviewed_at', new.reviewed_at)
  );
  return new;
end;
$$;

create trigger professional_reviews_audit
after insert or update on public.professional_reviews
for each row execute function public.audit_professional_review_change();

revoke all on function public.replace_study_import(uuid, jsonb, text, boolean, text) from public;
revoke all on function public.review_statistical_suggestion(uuid, public.suggestion_status, text) from public;
revoke all on function public.audit_import_job_change() from public;
revoke all on function public.audit_professional_review_change() from public;
grant execute on function public.replace_study_import(uuid, jsonb, text, boolean, text) to authenticated;
grant execute on function public.review_statistical_suggestion(uuid, public.suggestion_status, text) to authenticated;
