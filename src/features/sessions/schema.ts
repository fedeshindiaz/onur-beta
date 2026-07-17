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
  return errors
}
