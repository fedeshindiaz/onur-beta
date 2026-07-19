import { describe, expect, it } from 'vitest'
import { analyzeExerciseCompatibility, applyExercisePurpose } from './compatibility'
import { defaultExerciseConfig, type ExerciseConfig, type ExercisePurpose } from './types'

function exercise(purpose: ExercisePurpose, overrides: Partial<ExerciseConfig> = {}) {
  return { ...applyExercisePurpose(defaultExerciseConfig, purpose), ...overrides }
}

describe('coherencia clínica y espacial de ejercicios', () => {
  it.each([
    ['gaze_stabilization', 'standard', true],
    ['gaze_stabilization', 'vr_box', false],
    ['gaze_stabilization', 'quest_browser', false],
    ['smooth_pursuit', 'standard', true],
    ['smooth_pursuit', 'vr_box', true],
    ['smooth_pursuit', 'quest_browser', true],
    ['saccades', 'standard', true],
    ['saccades', 'vr_box', true],
    ['saccades', 'quest_browser', true],
    ['optokinetic', 'standard', true],
    ['optokinetic', 'vr_box', true],
    ['optokinetic', 'quest_browser', true],
    ['visual_habituation', 'standard', true],
    ['visual_habituation', 'vr_box', true],
    ['visual_habituation', 'quest_browser', true],
    ['guided_functional', 'standard', true],
    ['guided_functional', 'vr_box', false],
    ['guided_functional', 'quest_browser', false],
  ] as const)('%s en %s: válido=%s', (purpose, displayMode, valid) => {
    const configured = exercise(purpose, {
      displayMode,
      doseMode: displayMode === 'vr_box' ? 'time' : exercise(purpose).doseMode,
      advanceMode: displayMode === 'vr_box' ? 'automatic' : exercise(purpose).advanceMode,
    })
    expect(analyzeExerciseCompatibility(configured).valid).toBe(valid)
  })

  it.each(['vr_box', 'quest_browser'] as const)('bloquea RVO x1 en %s sin anclaje espacial', (displayMode) => {
    const analysis = analyzeExerciseCompatibility(exercise('gaze_stabilization', { displayMode, doseMode: 'time', advanceMode: 'automatic' }))
    expect(analysis.valid).toBe(false)
    expect(analysis.issues.some((item) => item.code === 'gaze-headset')).toBe(true)
  })

  it.each(['vr_box', 'quest_browser'] as const)('admite optocinético coherente en %s', (displayMode) => {
    const analysis = analyzeExerciseCompatibility(exercise('optokinetic', { displayMode, doseMode: 'time', advanceMode: 'automatic' }))
    expect(analysis.valid).toBe(true)
    expect(analysis.explanation).toContain('cabeza quieta')
  })

  it.each(['vr_box', 'quest_browser'] as const)('bloquea tareas físicas en %s', (displayMode) => {
    const analysis = analyzeExerciseCompatibility(exercise('guided_functional', { displayMode, doseMode: 'time', advanceMode: 'automatic' }))
    expect(analysis.valid).toBe(false)
    expect(analysis.issues.some((item) => item.code === 'functional-headset')).toBe(true)
  })

  it('bloquea un optocinético estático aunque el nombre diga lo contrario', () => {
    const analysis = analyzeExerciseCompatibility(exercise('optokinetic', { backgroundSpeed: 0 }))
    expect(analysis.valid).toBe(false)
    expect(analysis.issues.some((item) => item.code === 'visual-motion')).toBe(true)
  })

  it('configura cada propósito con parámetros coherentes', () => {
    expect(applyExercisePurpose(defaultExerciseConfig, 'smooth_pursuit')).toMatchObject({ kind: 'visual_stimulus', objectEnabled: true, objectMode: 'tracking', backgroundSpeed: 0 })
    expect(applyExercisePurpose(defaultExerciseConfig, 'saccades')).toMatchObject({ kind: 'visual_stimulus', objectEnabled: true, objectMode: 'saccades', backgroundSpeed: 0 })
    expect(applyExercisePurpose(defaultExerciseConfig, 'optokinetic')).toMatchObject({ kind: 'visual_stimulus', objectEnabled: false, backgroundType: 'bars' })
    expect(applyExercisePurpose(defaultExerciseConfig, 'guided_functional')).toMatchObject({ kind: 'guided_physical', displayMode: 'standard', doseMode: 'repetitions', advanceMode: 'manual' })
  })
})
