import { describe, expect, it } from 'vitest'
import { screenGenerationRequest, validateGeneratedExercisePackage } from './governance'

const completeRequest = {
  request_id: 'REQ-20260719-0001', clinician_authorized: true, patient_group: 'adulto', age_group: '18-64',
  confirmed_diagnosis: 'Hipofunción vestibular periférica unilateral confirmada',
  diagnostic_source_or_clinician_note: 'Diagnóstico documentado por profesional tratante', phase: 'crónica estable',
  impairments: ['Agudeza visual dinámica alterada'], activity_limitations: ['Caminar girando la cabeza'],
  participation_goals: ['Retomar compras de forma independiente'], baseline_measures: { dynamic_visual_acuity: 'documentada' },
  fall_risk: 'moderado, documentado', mobility_level: 'independiente', vision_status: 'corregida', hearing_status: 'documentado',
  cervical_status: 'rango sin dolor', neurological_status: 'sin hallazgos nuevos', cardiovascular_status: 'estable',
  cognitive_status: 'comprende consignas', migraine_status: 'sin migraña vestibular',
  medications_relevant_to_performance: ['registradas, sin cambios indicados por plataforma'], environment: 'clínica',
  available_equipment: ['silla estable'], supervision_available: 'directa', symptom_scale: '0 a 10', symptom_ceiling: '4/10',
  recovery_window: 'retorno al basal en 20 minutos', stop_rules_defined_by_clinician: ['detener ante signos neurológicos o presíncope'],
}

describe('gobernanza del generador clínico', () => {
  it('bloquea el JSON de ejemplo sin autorización y no genera contenido', () => {
    const result = screenGenerationRequest(
      { ...completeRequest, clinician_authorized: false, confirmed_diagnosis: 'COMPLETAR_DIAGNOSTICO_CONFIRMADO' },
      { userId: 'professional-1', clinicallyAuthorized: true },
    )
    expect(result.status).toBe('blocked_out_of_scope')
    expect(result.missingInputs).toContain('clinician_authorized')
    expect(result.missingInputs).toContain('confirmed_diagnosis')
  })

  it('requiere que el tamizaje de alertas esté completado', () => {
    const result = screenGenerationRequest(completeRequest, { userId: 'professional-1', clinicallyAuthorized: true })
    expect(result.status).toBe('blocked_missing_clinical_input')
    expect(result.missingInputs).toContain('hard_stop_screen')
  })

  it('no extrapola el generador adulto a pediatría', () => {
    const result = screenGenerationRequest(
      { ...completeRequest, patient_group: 'pediátrico', age_group: '12-17' },
      { userId: 'professional-1', clinicallyAuthorized: true },
      { completed: true, reportedTriggers: [] },
    )
    expect(result.status).toBe('blocked_out_of_scope')
    expect(result.missingInputs).toContain('pediatric_governance_not_implemented')
  })

  it('bloquea ante cualquier alerta de seguridad reportada', () => {
    const result = screenGenerationRequest(
      completeRequest,
      { userId: 'professional-1', clinicallyAuthorized: true },
      { completed: true, reportedTriggers: ['dificultad nueva para hablar o comprender'] },
    )
    expect(result.status).toBe('blocked_safety_trigger')
    expect(result.safetyTrigger).toContain('hablar')
  })

  it('solo habilita un borrador con autorización derivada, datos completos y tamizaje negativo', () => {
    const result = screenGenerationRequest(
      completeRequest,
      { userId: 'professional-1', clinicallyAuthorized: true },
      { completed: true, reportedTriggers: [] },
    )
    expect(result).toMatchObject({ status: 'eligible_for_draft', missingInputs: [], authorizationAccepted: true })
  })

  it('rechaza referencias inexistentes incluso en una respuesta bloqueada', () => {
    const output = {
      status: 'blocked_missing_clinical_input', request_id: 'REQ-1',
      clinical_scope: { diagnosis: '', phase: '', population: 'adulto', goals: ['evaluar'], scope_limitations: [] },
      missing_inputs: ['confirmed_diagnosis'], safety_trigger: null, exercise_drafts: [],
      safety_summary: { fall_controls: [], medical_precautions: [], adverse_response_plan: [] },
      evidence_summary: { source_ids_used: ['SRC-999'], directness: 'no aplicable', uncertainties: [] },
      quality_checks: { diagnosis_confirmed: false, hard_stop_negative: false, dose_traceable: false, single_variable_progression: false, fall_safety_addressed: false, symptom_limits_present: false, sources_valid: false, human_review_pending: true },
      audit: { generated_at: '2026-07-19T12:00:00.000Z', model_id: 'test', prompt_version: '1.0.0', clinician_review_status: 'draft_unreviewed' },
    }
    expect(validateGeneratedExercisePackage(output).success).toBe(false)
  })
})
