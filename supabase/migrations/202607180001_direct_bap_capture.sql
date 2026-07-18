-- Captura guiada desde el equipo BAP mediante Web Serial.
-- Sólo se persisten métricas revisables; las tramas crudas no se almacenan.

alter table public.metric_values drop constraint if exists metric_values_source_method_check;
alter table public.metric_values add constraint metric_values_source_method_check
  check (source_method in ('imported', 'ocr', 'transcribed', 'calculated', 'manual', 'direct_capture'));

create or replace function public.create_direct_bap_capture_draft(
  target_patient_id uuid,
  target_treatment_cycle_id uuid,
  performed_at_input timestamptz,
  condition_count_input integer,
  duration_seconds_input integer
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  study_id uuid;
begin
  if not public.is_professional() then raise exception 'Se requiere rol profesional.'; end if;
  if not public.owns_patient(target_patient_id) then raise exception 'Paciente no encontrado o sin permiso.'; end if;
  if condition_count_input <> 6 then raise exception 'La captura BAP directa requiere las seis condiciones.'; end if;
  if duration_seconds_input not in (10, 20, 30) then raise exception 'La duración BAP debe ser de 10, 20 o 30 segundos.'; end if;
  if performed_at_input is null or performed_at_input > now() + interval '5 minutes' or performed_at_input < now() - interval '2 days' then
    raise exception 'La fecha de captura directa no es válida.';
  end if;
  if target_treatment_cycle_id is not null and not exists (
    select 1 from public.treatment_cycles where id = target_treatment_cycle_id and patient_id = target_patient_id
  ) then raise exception 'El ciclo no pertenece al paciente.'; end if;

  insert into public.clinical_studies (
    patient_id, treatment_cycle_id, study_type, performed_at, device_name,
    software_version, protocol_code, protocol_version, calculation_method_version,
    status, clinical_context, created_by
  ) values (
    target_patient_id, target_treatment_cycle_id, 'posturography', performed_at_input,
    'BAP · captura directa por Web Serial', 'BAP 2.32 · Web Serial',
    'bap-1-6', '2.32-direct-beta', 'onur-bap-webserial-1.0-beta',
    'draft', 'Captura directa guiada. Requiere revisión profesional antes de finalizar.', auth.uid()
  ) returning id into study_id;

  insert into public.audit_events (actor_user_id, action, entity_type, entity_id, metadata)
  values (
    auth.uid(), 'direct_bap_capture_created', 'clinical_study', study_id,
    jsonb_build_object(
      'transport', 'web_serial',
      'protocol_code', 'bap-1-6',
      'condition_count', condition_count_input,
      'duration_seconds', duration_seconds_input,
      'raw_frames_stored', false
    )
  );
  return study_id;
end;
$$;

revoke all on function public.create_direct_bap_capture_draft(uuid, uuid, timestamptz, integer, integer) from public;
grant execute on function public.create_direct_bap_capture_draft(uuid, uuid, timestamptz, integer, integer) to authenticated;

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
  direct_capture boolean := false;
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
  direct_capture := coalesce(study_record.calculation_method_version, '') like 'onur-bap-webserial-%';

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
      case when direct_capture then 'direct_capture' else coalesce(nullif(metric_item ->> 'source_method', ''), 'transcribed') end,
      nullif(metric_item ->> 'source_location', ''),
      metric_item ->> 'normalization_rule_version',
      (metric_item ->> 'quality_status')::public.quality_status,
      auth.uid(), now()
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
    target_study_id, study_record.source_document_id, 'confirmed',
    case when direct_capture then 'bap_web_serial' else 'manual_transcription' end,
    case when direct_capture then study_record.calculation_method_version else parser_version end,
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

revoke all on function public.replace_study_import(uuid, jsonb, text, boolean, text) from public;
grant execute on function public.replace_study_import(uuid, jsonb, text, boolean, text) to authenticated;
