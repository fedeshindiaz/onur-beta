export type BackgroundType = 'solid' | 'bars' | 'spiral' | 'checkerboard' | 'dots'
export type MotionDirection = 'left' | 'right' | 'up' | 'down' | 'clockwise' | 'counterclockwise'
export type ObjectMode = 'fixed' | 'tracking' | 'saccades'
export type SaccadePattern = 'horizontal' | 'vertical' | 'random'
export type ExerciseDisplayMode = 'standard' | 'vr_box' | 'quest_browser'
export type PreparationSeconds = 0 | 5 | 10 | 20

export interface ExerciseConfig {
  name: string
  displayMode: ExerciseDisplayMode
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
  name: 'RVO x1 · Barras horizontales',
  displayMode: 'standard',
  backgroundType: 'bars',
  backgroundDirection: 'left',
  backgroundSpeed: 45,
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
  return { ...defaultExerciseConfig, ...config, preparationSeconds }
}
