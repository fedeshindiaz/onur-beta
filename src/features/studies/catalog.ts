import type { MetricDefinition, StudyType } from './types'

export const unitOptions = [
  { value: '', label: 'Sin informar' },
  { value: 'unknown', label: 'Desconocida' },
  { value: 'percent', label: '%' },
  { value: 'score', label: 'Puntos / score' },
  { value: 'ratio', label: 'Razón' },
  { value: 'hz', label: 'Hz' },
  { value: 'seconds', label: 'Segundos' },
  { value: 'deg', label: 'Grados' },
  { value: 'deg_s', label: 'Grados/segundo' },
  { value: 'oscillations_per_second', label: 'Oscilaciones/segundo' },
  { value: 'oscillations_per_minute', label: 'Oscilaciones/minuto' },
  { value: 'cm2', label: 'cm²' },
  { value: 'mm2', label: 'mm²' },
]

export const metricDefinitions: MetricDefinition[] = [
  { code: 'los_value', label: 'Límite de estabilidad (LOS)', domain: 'posturography', valueKind: 'numeric', allowedUnits: ['percent', 'score', 'deg', 'cm2', 'mm2'], requiresUnit: true, zeroAllowed: 'unknown' },
  { code: 'los_score', label: 'Score LOS', domain: 'posturography', valueKind: 'numeric', allowedUnits: ['percent', 'score'], requiresUnit: true, zeroAllowed: 'unknown' },
  { code: 'los_area', label: 'Área BAP', domain: 'posturography', valueKind: 'numeric', allowedUnits: ['unknown'], requiresUnit: true, zeroAllowed: true },
  { code: 'condition_score', label: 'Puntaje por condición', domain: 'posturography', valueKind: 'numeric', allowedUnits: ['percent', 'score'], requiresUnit: true, requiresCondition: true, zeroAllowed: 'unknown' },
  { code: 'composite_score', label: 'Composite', domain: 'posturography', valueKind: 'numeric', allowedUnits: ['percent', 'score'], requiresUnit: true, zeroAllowed: 'unknown' },
  { code: 'sensory_ratio_somatosensory', label: 'Cociente somatosensorial', domain: 'posturography', valueKind: 'numeric', allowedUnits: ['percent', 'ratio'], requiresUnit: true, zeroAllowed: 'unknown' },
  { code: 'sensory_ratio_visual', label: 'Cociente visual', domain: 'posturography', valueKind: 'numeric', allowedUnits: ['percent', 'ratio'], requiresUnit: true, zeroAllowed: 'unknown' },
  { code: 'sensory_ratio_vestibular', label: 'Cociente vestibular', domain: 'posturography', valueKind: 'numeric', allowedUnits: ['percent', 'ratio'], requiresUnit: true, zeroAllowed: 'unknown' },
  { code: 'visual_preference_index', label: 'Preferencia visual', domain: 'posturography', valueKind: 'numeric', allowedUnits: ['percent', 'ratio'], requiresUnit: true, zeroAllowed: 'unknown' },
  { code: 'sway_per_second_x', label: 'Sway/s X (anteroposterior)', domain: 'posturography', valueKind: 'numeric', allowedUnits: ['oscillations_per_second'], requiresUnit: true, zeroAllowed: true },
  { code: 'sway_per_second_y', label: 'Sway/s Y (lateral)', domain: 'posturography', valueKind: 'numeric', allowedUnits: ['oscillations_per_second'], requiresUnit: true, zeroAllowed: true },
  { code: 'sway_per_minute_x', label: 'Sway/m X (anteroposterior)', domain: 'posturography', valueKind: 'numeric', allowedUnits: ['oscillations_per_minute'], requiresUnit: true, zeroAllowed: true },
  { code: 'sway_per_minute_y', label: 'Sway/m Y (lateral)', domain: 'posturography', valueKind: 'numeric', allowedUnits: ['oscillations_per_minute'], requiresUnit: true, zeroAllowed: true },
  { code: 'fall_event', label: 'Evento de caída', domain: 'posturography', valueKind: 'boolean', allowedUnits: [], requiresUnit: false, requiresCondition: true, zeroAllowed: true },
  { code: 'pppd_index_value', label: 'Índice 3PD / PPPD', domain: 'posturography', valueKind: 'numeric', allowedUnits: ['score', 'percent', 'ratio'], requiresUnit: true, zeroAllowed: 'unknown' },
  { code: 'tug_seconds', label: 'TUG', domain: 'posturography', valueKind: 'numeric', allowedUnits: ['seconds'], requiresUnit: true, zeroAllowed: false },
  { code: 'frequency_hz', label: 'Frecuencia', domain: 'vhit', valueKind: 'numeric', allowedUnits: ['hz'], requiresUnit: true, zeroAllowed: false },
  { code: 'gain', label: 'Ganancia', domain: 'vhit', valueKind: 'numeric', allowedUnits: ['ratio'], requiresUnit: true, zeroAllowed: 'unknown' },
  { code: 'result_label', label: 'Resultado informado', domain: 'vhit', valueKind: 'categorical', allowedUnits: [], requiresUnit: false, zeroAllowed: true },
  { code: 'saccade_present', label: 'Presencia de sacadas', domain: 'vhit', valueKind: 'boolean', allowedUnits: [], requiresUnit: false, zeroAllowed: true },
  { code: 'saccade_type', label: 'Tipo de sacada', domain: 'vhit', valueKind: 'categorical', allowedUnits: [], requiresUnit: false, zeroAllowed: true },
  { code: 'saccade_velocity_deg_s', label: 'Velocidad de sacada', domain: 'vhit', valueKind: 'numeric', allowedUnits: ['deg_s'], requiresUnit: true, zeroAllowed: false },
  { code: 'los_forward', label: 'Límite de estabilidad adelante', domain: 'posturography', valueKind: 'numeric', allowedUnits: ['deg'], requiresUnit: true, zeroAllowed: 'unknown' },
  { code: 'los_backward', label: 'Límite de estabilidad atrás', domain: 'posturography', valueKind: 'numeric', allowedUnits: ['deg'], requiresUnit: true, zeroAllowed: 'unknown' },
  { code: 'los_left', label: 'Límite de estabilidad izquierda', domain: 'posturography', valueKind: 'numeric', allowedUnits: ['deg'], requiresUnit: true, zeroAllowed: 'unknown' },
  { code: 'los_right', label: 'Límite de estabilidad derecha', domain: 'posturography', valueKind: 'numeric', allowedUnits: ['deg'], requiresUnit: true, zeroAllowed: 'unknown' },
  { code: 'aphysiological_pattern', label: 'Patrón afisiológico', domain: 'posturography', valueKind: 'numeric', allowedUnits: ['percent'], requiresUnit: true, zeroAllowed: 'unknown' },
  { code: 'mix_ve_som', label: 'Def. Mix Ve Som', domain: 'posturography', valueKind: 'numeric', allowedUnits: ['score', 'percent'], requiresUnit: true, zeroAllowed: 'unknown' },
  { code: 'mix_ve_vi', label: 'Def. Mixto Ve Vi', domain: 'posturography', valueKind: 'numeric', allowedUnits: ['score', 'percent'], requiresUnit: true, zeroAllowed: 'unknown' },
  { code: 'condition_percentage', label: 'Porcentaje de condiciones', domain: 'posturography', valueKind: 'numeric', allowedUnits: ['percent'], requiresUnit: true, zeroAllowed: 'unknown' },
  { code: 'afis_pattern_text', label: 'Patrón Afis informado', domain: 'posturography', valueKind: 'text', allowedUnits: [], requiresUnit: false, zeroAllowed: true },
  { code: 'sensory_distribution_text', label: 'Distribución sensorial informada', domain: 'posturography', valueKind: 'text', allowedUnits: [], requiresUnit: false, zeroAllowed: true },
  { code: 'posturography_conclusion_text', label: 'Conclusión de posturografía transcripta', domain: 'posturography', valueKind: 'text', allowedUnits: [], requiresUnit: false, zeroAllowed: true },
  ...[
    ['reported_conclusion_text', 'Conclusión profesional transcripta'], ['institution_text', 'Institución informada'],
    ['document_type_text', 'Tipo de documento informado'], ['professional_text', 'Profesional informado'],
    ['referral_reason_text', 'Motivo de derivación transcripto'], ['history_text', 'Antecedentes transcriptos'],
    ['symptoms_text', 'Síntomas transcriptos'], ['evolution_text', 'Evolución transcripta'],
    ['clinical_exam_text', 'Examen clínico transcripto'], ['himp_text', 'HIMP informado'], ['shimp_text', 'SHIMP informado'],
    ['symmetry_text', 'Simetría informada'], ['curves_channels_text', 'Curvas y canales transcriptos'],
    ['cranial_nerve_vii_text', 'VII par transcripto'], ['fixation_system_text', 'Sistema de fijación transcripto'],
    ['visual_suppression_text', 'Supresión visual transcripta'], ['skew_text', 'SKEW transcripto'],
    ['head_shaking_text', 'Head Shaking Test transcripto'], ['vibration_test_text', 'Test vibracional transcripto'],
    ['vor_cancellation_text', 'Cancelación del VOR transcripta'], ['positional_tests_text', 'Pruebas posicionales transcriptas'],
    ['gait_text', 'Marcha transcripta'], ['saccadic_precision_text', 'Precisión sacádica transcripta'],
    ['smooth_pursuit_text', 'Seguimiento ocular lento transcripto'], ['deep_sensation_text', 'Sensibilidad profunda transcripta'],
    ['reflexes_text', 'Reflejos transcriptos'], ['conduct_text', 'Conducta transcripta'],
    ['professional_observations_text', 'Observaciones profesionales transcriptas'],
  ].map(([code, label]) => ({ code, label, domain: 'vhit' as const, valueKind: 'text' as const, allowedUnits: [], requiresUnit: false, zeroAllowed: true as const })),
]

export function definitionsFor(studyType: StudyType) {
  return metricDefinitions.filter((definition) => definition.domain === studyType)
}

export function metricDefinition(code: string) {
  return metricDefinitions.find((definition) => definition.code === code)
}

export function metricLabel(code: string) {
  return metricDefinition(code)?.label ?? code
}
