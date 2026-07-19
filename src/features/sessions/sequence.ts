import type { ExerciseConfig } from '../exercise/types'

export const VR_BOX_TRANSITION_SECONDS = 20

export interface SessionSequenceAnalysis {
  mixesRepetitionsAndVrBox: boolean
  optimizedForVrBox: boolean
  visorChanges: number
}

export function analyzeSessionSequence(exercises: ExerciseConfig[]): SessionSequenceAnalysis {
  const hasRepetitions = exercises.some((exercise) => exercise.doseMode === 'repetitions')
  const hasVrBox = exercises.some((exercise) => exercise.displayMode === 'vr_box')
  const lastRepetitionIndex = exercises.reduce((last, exercise, index) => exercise.doseMode === 'repetitions' ? index : last, -1)
  const firstVrBoxIndex = exercises.findIndex((exercise) => exercise.displayMode === 'vr_box')
  let visorChanges = 0
  let wearingVisor = false

  exercises.forEach((exercise) => {
    const needsVisor = exercise.displayMode === 'vr_box'
    if (needsVisor !== wearingVisor) visorChanges += 1
    wearingVisor = needsVisor
  })
  if (wearingVisor) visorChanges += 1 // Retirar el visor antes del autorreporte final.

  return {
    mixesRepetitionsAndVrBox: hasRepetitions && hasVrBox,
    optimizedForVrBox: !hasRepetitions || !hasVrBox || firstVrBoxIndex > lastRepetitionIndex,
    visorChanges,
  }
}

export function orderExercisesForVrBox(exercises: ExerciseConfig[]) {
  const repetitions = exercises.filter((exercise) => exercise.doseMode === 'repetitions')
  const standardTimed = exercises.filter((exercise) => exercise.doseMode === 'time' && exercise.displayMode !== 'vr_box')
  const vrBoxTimed = exercises.filter((exercise) => exercise.doseMode === 'time' && exercise.displayMode === 'vr_box')
  return [...repetitions, ...standardTimed, ...vrBoxTimed]
}
