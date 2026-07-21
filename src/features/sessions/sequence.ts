import type { ExerciseConfig } from '../exercise/types'

export const VR_BOX_TRANSITION_SECONDS = 20

export interface SessionSequenceAnalysis {
  mixesRepetitionsAndVrBox: boolean
  mixesVrBoxAndNonVrBox: boolean
  mixesVrBoxProfiles: boolean
  optimizedForVrBox: boolean
  visorChanges: number
}

type ViewerProfile = 'none' | 'vr_box' | 'cardboard'
const viewerProfile = (exercise: ExerciseConfig): ViewerProfile => exercise.displayMode !== 'vr_box' ? 'none' : exercise.cardboardEnabled ? 'cardboard' : 'vr_box'

export function analyzeSessionSequence(exercises: ExerciseConfig[]): SessionSequenceAnalysis {
  const hasRepetitions = exercises.some((exercise) => exercise.doseMode === 'repetitions')
  const hasVrBox = exercises.some((exercise) => exercise.displayMode === 'vr_box')
  const hasNonVrBox = exercises.some((exercise) => exercise.displayMode !== 'vr_box')
  const lastNonVrBoxIndex = exercises.reduce((last, exercise, index) => exercise.displayMode !== 'vr_box' ? index : last, -1)
  const firstVrBoxIndex = exercises.findIndex((exercise) => exercise.displayMode === 'vr_box')
  const vrProfiles = new Set(exercises.filter((exercise) => exercise.displayMode === 'vr_box').map((exercise) => viewerProfile(exercise)))
  let visorChanges = 0
  let activeViewer: ViewerProfile = 'none'

  exercises.forEach((exercise) => {
    const desiredViewer = viewerProfile(exercise)
    if (desiredViewer === activeViewer) return
    if (activeViewer !== 'none') visorChanges += 1
    if (desiredViewer !== 'none') visorChanges += 1
    activeViewer = desiredViewer
  })
  if (activeViewer !== 'none') visorChanges += 1 // Retirar el visor antes del autorreporte final.

  return {
    mixesRepetitionsAndVrBox: hasRepetitions && hasVrBox,
    mixesVrBoxAndNonVrBox: hasVrBox && hasNonVrBox,
    mixesVrBoxProfiles: vrProfiles.size > 1,
    optimizedForVrBox: !hasVrBox || !hasNonVrBox || firstVrBoxIndex > lastNonVrBoxIndex,
    visorChanges,
  }
}

export function orderExercisesForVrBox(exercises: ExerciseConfig[]) {
  const repetitions = exercises.filter((exercise) => exercise.doseMode === 'repetitions')
  const standardTimed = exercises.filter((exercise) => exercise.doseMode === 'time' && exercise.displayMode !== 'vr_box')
  const vrBoxTimed = exercises.filter((exercise) => exercise.doseMode === 'time' && exercise.displayMode === 'vr_box')
  return [...repetitions, ...standardTimed, ...vrBoxTimed]
}
