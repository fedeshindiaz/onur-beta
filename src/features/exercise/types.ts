export type BackgroundType = 'solid' | 'bars' | 'spiral' | 'checkerboard' | 'dots'
export type LinearMotionDirection = 'left' | 'right' | 'up' | 'down' | 'up_left' | 'up_right' | 'down_left' | 'down_right'
export type MotionDirection = LinearMotionDirection | 'clockwise' | 'counterclockwise'
export type ObjectMode = 'fixed' | 'tracking' | 'saccades'
export type ObjectDirection = 'horizontal' | 'vertical' | 'diagonal_down' | 'diagonal_up'
export type SaccadePattern = ObjectDirection | 'random'
export type ExerciseDisplayMode = 'standard' | 'vr_box' | 'quest_browser'
export type PreparationSeconds = 0 | 5 | 10 | 20
export type ExerciseKind = 'visual_stimulus' | 'guided_physical'
export type ExercisePurpose = 'gaze_stabilization' | 'gaze_stabilization_x2' | 'gaze_substitution_remembered' | 'smooth_pursuit' | 'saccades' | 'optokinetic' | 'visual_habituation' | 'guided_functional' | 'custom_free'
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
  purpose: ExercisePurpose
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
  objectDirection: ObjectDirection
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
  name: 'RVO X1 · Punto fijo 2D',
  kind: 'visual_stimulus',
  purpose: 'gaze_stabilization',
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

export function inferExercisePurpose(config: Partial<ExerciseConfig>): ExercisePurpose {
  if (config.purpose) return config.purpose
  if (config.kind === 'guided_physical') return 'guided_functional'
  if (config.objectMode === 'tracking') return 'smooth_pursuit'
  if (config.objectMode === 'saccades') return 'saccades'
  if (config.backgroundType && config.backgroundType !== 'solid' && Number(config.backgroundSpeed) > 0) return 'optokinetic'
  return 'gaze_stabilization'
}

export function normalizeExerciseConfig(config: Partial<ExerciseConfig>, legacyPreparationSeconds: PreparationSeconds = 0): ExerciseConfig {
  const preparationSeconds = [0, 5, 10, 20].includes(Number(config.preparationSeconds))
    ? Number(config.preparationSeconds) as PreparationSeconds
    : legacyPreparationSeconds
  return {
    ...defaultExerciseConfig,
    ...config,
    purpose: inferExercisePurpose(config),
    preparationSeconds,
    // Las asignaciones antiguas continúan automáticamente; las nuevas usan el valor manual del predeterminado.
    advanceMode: config.advanceMode ?? 'automatic',
  }
}
