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
  { value: 'cm2', label: 'cm²' },
  { value: 'mm2', label: 'mm²' },
]

export const metricDefinitions: MetricDefinition[] = [
  { code: 'los_value', label: 'Límite de estabilidad (LOS)', domain: 'posturography', valueKind: 'numeric', allowedUnits: ['percent', 'score', 'deg', 'cm2', 'mm2'], requiresUnit: true, zeroAllowed: 'unknown' },
  { code: 'los_score', label: 'Score LOS', domain: 'posturography', valueKind: 'numeric', allowedUnits: ['percent', 'score'], requiresUnit: true, zeroAllowed: 'unknown' },
  { code: 'los_area', label: 'Área LOS', domain: 'posturography', valueKind: 'numeric', allowedUnits: ['cm2', 'mm2'], requiresUnit: true, zeroAllowed: true },
  { code: 'condition_score', label: 'Puntaje por condición', domain: 'posturography', valueKind: 'numeric', allowedUnits: ['percent', 'score'], requiresUnit: true, requiresCondition: true, zeroAllowed: 'unknown' },
  { code: 'composite_score', label: 'Composite', domain: 'posturography', valueKind: 'numeric', allowedUnits: ['percent', 'score'], requiresUnit: true, zeroAllowed: 'unknown' },
  { code: 'sensory_ratio_somatosensory', label: 'Cociente somatosensorial', domain: 'posturography', valueKind: 'numeric', allowedUnits: ['percent', 'ratio'], requiresUnit: true, zeroAllowed: 'unknown' },
  { code: 'sensory_ratio_visual', label: 'Cociente visual', domain: 'posturography', valueKind: 'numeric', allowedUnits: ['percent', 'ratio'], requiresUnit: true, zeroAllowed: 'unknown' },
  { code: 'sensory_ratio_vestibular', label: 'Cociente vestibular', domain: 'posturography', valueKind: 'numeric', allowedUnits: ['percent', 'ratio'], requiresUnit: true, zeroAllowed: 'unknown' },
  { code: 'visual_preference_index', label: 'Preferencia visual', domain: 'posturography', valueKind: 'numeric', allowedUnits: ['percent', 'ratio'], requiresUnit: true, zeroAllowed: 'unknown' },
  { code: 'sway_value', label: 'Sway', domain: 'posturography', valueKind: 'numeric', allowedUnits: ['score', 'deg', 'deg_s', 'cm2', 'mm2'], requiresUnit: true, requiresCondition: true, zeroAllowed: true },
  { code: 'fall_event', label: 'Evento de caída', domain: 'posturography', valueKind: 'boolean', allowedUnits: [], requiresUnit: false, requiresCondition: true, zeroAllowed: true },
  { code: 'pppd_index_value', label: 'Índice 3PD / PPPD', domain: 'posturography', valueKind: 'numeric', allowedUnits: ['score', 'percent', 'ratio'], requiresUnit: true, zeroAllowed: 'unknown' },
  { code: 'tug_seconds', label: 'TUG', domain: 'posturography', valueKind: 'numeric', allowedUnits: ['seconds'], requiresUnit: true, zeroAllowed: false },
  { code: 'frequency_hz', label: 'Frecuencia', domain: 'vhit', valueKind: 'numeric', allowedUnits: ['hz'], requiresUnit: true, zeroAllowed: false },
  { code: 'gain', label: 'Ganancia', domain: 'vhit', valueKind: 'numeric', allowedUnits: ['ratio'], requiresUnit: true, zeroAllowed: 'unknown' },
  { code: 'result_label', label: 'Resultado informado', domain: 'vhit', valueKind: 'categorical', allowedUnits: [], requiresUnit: false, zeroAllowed: true },
  { code: 'saccade_present', label: 'Presencia de sacadas', domain: 'vhit', valueKind: 'boolean', allowedUnits: [], requiresUnit: false, zeroAllowed: true },
  { code: 'saccade_type', label: 'Tipo de sacada', domain: 'vhit', valueKind: 'categorical', allowedUnits: [], requiresUnit: false, zeroAllowed: true },
  { code: 'saccade_velocity_deg_s', label: 'Velocidad de sacada', domain: 'vhit', valueKind: 'numeric', allowedUnits: ['deg_s'], requiresUnit: true, zeroAllowed: false },
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
