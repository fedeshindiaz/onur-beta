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
    ['gaze_stabilization_x2', 'standard', true],
    ['gaze_stabilization_x2', 'vr_box', false],
    ['gaze_stabilization_x2', 'quest_browser', false],
    ['gaze_substitution_remembered', 'standard', true],
    ['gaze_substitution_remembered', 'vr_box', false],
    ['gaze_substitution_remembered', 'quest_browser', false],
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
    ['cognitive_visual', 'standard', true],
    ['cognitive_visual', 'vr_box', false],
    ['cognitive_visual', 'quest_browser', false],
    ['guided_functional', 'standard', true],
    ['guided_functional', 'vr_box', false],
    ['guided_functional', 'quest_browser', false],
    ['custom_free', 'standard', true],
    ['custom_free', 'vr_box', true],
    ['custom_free', 'quest_browser', true],
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

  it.each(['vr_box', 'quest_browser'] as const)('bloquea RVO x2 y objetivo recordado en %s sin referencia estable', (displayMode) => {
    const x2 = analyzeExerciseCompatibility(exercise('gaze_stabilization_x2', { displayMode, doseMode: 'time', advanceMode: 'automatic' }))
    const remembered = analyzeExerciseCompatibility(exercise('gaze_substitution_remembered', { displayMode, doseMode: 'time', advanceMode: 'automatic' }))
    expect(x2.issues.some((item) => item.code === 'gaze-x2-headset')).toBe(true)
    expect(remembered.issues.some((item) => item.code === 'remembered-headset')).toBe(true)
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
    expect(applyExercisePurpose(defaultExerciseConfig, 'gaze_stabilization_x2')).toMatchObject({ kind: 'visual_stimulus', displayMode: 'standard', objectEnabled: true, objectMode: 'tracking', backgroundSpeed: 0 })
    expect(applyExercisePurpose(defaultExerciseConfig, 'gaze_substitution_remembered')).toMatchObject({ kind: 'visual_stimulus', displayMode: 'standard', doseMode: 'repetitions', advanceMode: 'manual', objectMode: 'fixed' })
    expect(applyExercisePurpose(defaultExerciseConfig, 'smooth_pursuit')).toMatchObject({ kind: 'visual_stimulus', objectEnabled: true, objectMode: 'tracking', backgroundSpeed: 0 })
    expect(applyExercisePurpose(defaultExerciseConfig, 'saccades')).toMatchObject({ kind: 'visual_stimulus', objectEnabled: true, objectMode: 'saccades', backgroundSpeed: 0 })
    expect(applyExercisePurpose(defaultExerciseConfig, 'optokinetic')).toMatchObject({ kind: 'visual_stimulus', objectEnabled: false, backgroundType: 'bars' })
    expect(applyExercisePurpose(defaultExerciseConfig, 'cognitive_visual')).toMatchObject({ kind: 'visual_stimulus', displayMode: 'standard', doseMode: 'time', advanceMode: 'manual', cognitiveTaskMode: 'rare_target' })
    expect(applyExercisePurpose(defaultExerciseConfig, 'guided_functional')).toMatchObject({ kind: 'guided_physical', displayMode: 'standard', doseMode: 'repetitions', advanceMode: 'manual' })
  })

  it('modo Libre no aplica las reglas clínicas de RVO, pero mantiene límites técnicos de VR Box', () => {
    const arbitrary = exercise('custom_free', { objectMode: 'saccades', backgroundType: 'spiral', backgroundSpeed: 80 })
    expect(analyzeExerciseCompatibility(arbitrary)).toMatchObject({ valid: true })
    const impossibleInVr = analyzeExerciseCompatibility({ ...arbitrary, displayMode: 'vr_box', doseMode: 'repetitions', advanceMode: 'manual' })
    expect(impossibleInVr.valid).toBe(false)
    expect(impossibleInVr.issues.map((item) => item.code)).toEqual(expect.arrayContaining(['vr-dose', 'vr-advance']))
  })

  it('bloquea tareas cognitivas dentro de visores y la respuesta táctil durante RVO', () => {
    const cognitive = exercise('cognitive_visual')
    expect(analyzeExerciseCompatibility({ ...cognitive, displayMode: 'vr_box', advanceMode: 'automatic' }).issues.some((item) => item.code === 'cognitive-headset')).toBe(true)
    const dualTask = exercise('gaze_stabilization', { cognitiveTaskMode: 'go_no_go', cognitiveResponseMode: 'screen_tap', doseMode: 'time', advanceMode: 'manual' })
    expect(analyzeExerciseCompatibility(dualTask).issues.some((item) => item.code === 'cognitive-touch-head')).toBe(true)
  })

  it('admite una doble tarea verbal en pantalla 2D pero conserva la nota de revisión', () => {
    const dualTask = exercise('gaze_stabilization', { cognitiveTaskMode: 'go_no_go', cognitiveResponseMode: 'verbal', doseMode: 'time', advanceMode: 'manual' })
    const analysis = analyzeExerciseCompatibility(dualTask)
    expect(analysis.valid).toBe(true)
    expect(analysis.clinicalNote).toContain('no una prueba diagnóstica')
  })
})
