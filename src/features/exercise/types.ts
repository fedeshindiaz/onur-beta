export type BackgroundType = 'solid' | 'bars' | 'spiral' | 'checkerboard' | 'dots'
export type MotionDirection = 'left' | 'right' | 'up' | 'down' | 'clockwise' | 'counterclockwise'
export type ObjectMode = 'fixed' | 'tracking' | 'saccades'
export type SaccadePattern = 'horizontal' | 'vertical' | 'random'
export type ExerciseDisplayMode = 'standard' | 'vr_box' | 'quest_browser'
export type PreparationSeconds = 0 | 5 | 10 | 20
export type ExerciseKind = 'visual_stimulus' | 'guided_physical'
export type ExerciseDoseMode = 'time' | 'repetitions'
export type ExerciseAdvanceMode = 'automatic' | 'manual'
export type ExercisePosture = 'seated' | 'standing' | 'walking'
export type ExerciseSurface = 'firm' | 'unstable'
export type ExerciseSupervision = 'independent_after_approval' | 'trained_helper' | 'direct_clinician'

export interface ExerciseCompletionReport {
  doseMode: ExerciseDoseMode
  completion: 'target_completed' | 'partial' | 'skipped'
  targetRepetitions?: number
  reportedRepetitions?: number
}

export interface ExerciseConfig {
  name: string
  kind: ExerciseKind
  patientInstruction: string
  displayMode: ExerciseDisplayMode
  doseMode: ExerciseDoseMode
  targetRepetitions: number
  advanceMode: ExerciseAdvanceMode
  posture: ExercisePosture
  surface: ExerciseSurface
  supervision: ExerciseSupervision
  backgroundType: BackgroundType
  backgroundDirection: MotionDirection
  backgroundSpeed: number
  stripeWidth: number
  foregroundColor: string
  backgroundColor: string
  objectEnabled: boolean
  objectMode: ObjectMode
  objectColor: string
  objectSize: number
  objectDirection: 'horizontal' | 'vertical'
  objectSpeedHz: number
  objectAmplitude: number
  saccadePattern: SaccadePattern
  saccadeFrequencyHz: number
  preparationSeconds: PreparationSeconds
  durationSeconds: number
  restSeconds: number
  rounds: number
  metronomeEnabled: boolean
  metronomeHz: number
}

export const defaultExerciseConfig: ExerciseConfig = {
  name: 'RVO X1 · Fondo sólido',
  kind: 'visual_stimulus',
  patientInstruction: 'Mantené el blanco nítido mientras movés la cabeza según la indicación profesional.',
  displayMode: 'standard',
  doseMode: 'time',
  targetRepetitions: 10,
  advanceMode: 'manual',
  posture: 'seated',
  surface: 'firm',
  supervision: 'independent_after_approval',
  backgroundType: 'solid',
  backgroundDirection: 'left',
  backgroundSpeed: 0,
  stripeWidth: 54,
  foregroundColor: '#0a1214',
  backgroundColor: '#F7F6F4',
  objectEnabled: true,
  objectMode: 'fixed',
  objectColor: '#ef3e45',
  objectSize: 38,
  objectDirection: 'horizontal',
  objectSpeedHz: 0.5,
  objectAmplitude: 32,
  saccadePattern: 'horizontal',
  saccadeFrequencyHz: 0.8,
  preparationSeconds: 10,
  durationSeconds: 60,
  restSeconds: 30,
  rounds: 3,
  metronomeEnabled: false,
  metronomeHz: 1,
}

export function normalizeExerciseConfig(config: Partial<ExerciseConfig>, legacyPreparationSeconds: PreparationSeconds = 0): ExerciseConfig {
  const preparationSeconds = [0, 5, 10, 20].includes(Number(config.preparationSeconds))
    ? Number(config.preparationSeconds) as PreparationSeconds
    : legacyPreparationSeconds
  return {
    ...defaultExerciseConfig,
    ...config,
    preparationSeconds,
    // Las asignaciones antiguas continúan automáticamente; las nuevas usan el valor manual del predeterminado.
    advanceMode: config.advanceMode ?? 'automatic',
  }
}
