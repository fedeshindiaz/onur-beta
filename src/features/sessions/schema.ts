import { z } from 'zod'
import type { ExerciseConfig } from '../exercise/types'

export const cycleFormSchema = z.object({
  label: z.string().trim().min(3, 'Ingresá un nombre para el ciclo.').max(100),
  reason: z.string().trim().max(2000).optional(),
  objectives: z.string().trim().max(3000).optional(),
  startedOn: z.string().min(1, 'Elegí la fecha de inicio.'),
})

export type CycleFormValues = z.infer<typeof cycleFormSchema>

export interface SessionFormValues {
  title: string
  instructions: string
  mode: 'home' | 'in_person'
  treatmentCycleId: string
  availableFrom: string
  availableUntil: string
  exercises: ExerciseConfig[]
}

export function validateSession(values: SessionFormValues) {
  const errors: Record<string, string> = {}
  if (values.title.trim().length < 3) errors.title = 'Ingresá un título para la sesión.'
  if (!values.treatmentCycleId) errors.treatmentCycleId = 'Seleccioná un ciclo activo.'
  if (!values.availableFrom) errors.availableFrom = 'Elegí desde cuándo estará disponible.'
  if (values.availableUntil && values.availableUntil < values.availableFrom) errors.availableUntil = 'La fecha final no puede ser anterior.'
  if (values.exercises.length === 0) errors.exercises = 'Agregá al menos un ejercicio.'
  if (values.exercises.some((exercise) => !exercise.name.trim())) errors.exercises = 'Todos los ejercicios necesitan un nombre.'
  if (values.exercises.some((exercise) => !exercise.patientInstruction.trim())) errors.exercises = 'Todos los ejercicios necesitan una instrucción breve para el paciente.'
  if (values.exercises.some((exercise) => exercise.doseMode === 'repetitions' && (exercise.targetRepetitions < 1 || exercise.targetRepetitions > 100))) errors.exercises = 'El objetivo por repeticiones debe estar entre 1 y 100.'
  if (values.exercises.some((exercise) => exercise.doseMode === 'repetitions' && exercise.advanceMode !== 'manual')) errors.exercises = 'Los ejercicios por repeticiones requieren confirmación manual.'
  if (values.exercises.some((exercise) => exercise.displayMode === 'vr_box' && exercise.doseMode === 'repetitions')) errors.exercises = 'VR Box solo admite ejercicios por tiempo; las repeticiones se realizan con el celular fuera del visor.'
  if (values.exercises.some((exercise) => exercise.displayMode === 'vr_box' && exercise.advanceMode !== 'automatic')) errors.exercises = 'Los ejercicios VR Box deben finalizar automáticamente porque no dependen de botones ni controles externos.'
  if (values.exercises.some((exercise) => exercise.kind === 'guided_physical' && exercise.surface === 'unstable' && exercise.supervision === 'independent_after_approval')) errors.exercises = 'Las superficies inestables requieren un ayudante entrenado o supervisión profesional.'
  if (values.mode === 'home' && values.exercises.some((exercise) => exercise.kind === 'guided_physical' && exercise.displayMode === 'vr_box' && exercise.posture !== 'seated')) errors.exercises = 'VR Box no está habilitado para ejercicios físicos domiciliarios de pie o en marcha.'
  if (values.mode === 'home' && values.exercises.some((exercise) => exercise.kind === 'guided_physical' && exercise.posture === 'walking' && exercise.supervision === 'independent_after_approval')) errors.exercises = 'La marcha domiciliaria requiere un ayudante entrenado.'
  return errors
}
