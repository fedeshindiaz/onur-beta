import { describe, expect, it } from 'vitest'
import { applyExercisePurpose } from '../exercise/compatibility'
import { defaultExerciseConfig, type ExerciseConfig } from '../exercise/types'
import { validateSession } from './schema'

const session = (exercises: ExerciseConfig[], mode: 'home' | 'in_person' = 'home') => ({
  title: 'Sesión 1', instructions: '', mode, treatmentCycleId: 'cycle',
  availableFrom: '2026-07-16', availableUntil: '', exercises,
})

const config = (overrides: Partial<ExerciseConfig> = {}): ExerciseConfig => ({ ...defaultExerciseConfig, ...overrides })
const optokinetic = (overrides: Partial<ExerciseConfig> = {}): ExerciseConfig => ({ ...applyExercisePurpose(defaultExerciseConfig, 'optokinetic'), ...overrides })
const physical = (overrides: Partial<ExerciseConfig> = {}): ExerciseConfig => ({ ...applyExercisePurpose(defaultExerciseConfig, 'guided_functional'), ...overrides })
const free = (overrides: Partial<ExerciseConfig> = {}): ExerciseConfig => ({ ...applyExercisePurpose(defaultExerciseConfig, 'custom_free'), ...overrides })

describe('validación de sesión',()=>{
  it.each([
    ['pantalla 2D por tiempo', config()],
    ['pantalla 2D por repeticiones', config({ doseMode: 'repetitions', advanceMode: 'manual' })],
    ['Quest por tiempo', optokinetic({ displayMode: 'quest_browser', doseMode: 'time', advanceMode: 'automatic' })],
    ['Quest por repeticiones', optokinetic({ displayMode: 'quest_browser', doseMode: 'repetitions', advanceMode: 'manual' })],
    ['VR Box visual por tiempo', optokinetic({ displayMode: 'vr_box', doseMode: 'time', advanceMode: 'automatic' })],
    ['físico sentado independiente', physical({ doseMode: 'repetitions', posture: 'seated' })],
    ['físico de pie con ayudante', physical({ posture: 'standing', supervision: 'trained_helper' })],
    ['marcha domiciliaria con ayudante', physical({ posture: 'walking', supervision: 'trained_helper' })],
  ])('acepta %s', (_label, exercise) => expect(validateSession(session([exercise]))).toEqual({}))

  it('rechaza una fecha final anterior',()=>expect(validateSession({...session([defaultExerciseConfig]),availableUntil:'2026-07-15'}).availableUntil).toBeTruthy())

  it.each([
    ['repeticiones dentro de VR Box', optokinetic({ displayMode: 'vr_box', doseMode: 'repetitions', advanceMode: 'manual' }), 'VR Box'],
    ['avance manual dentro de VR Box', optokinetic({ displayMode: 'vr_box', doseMode: 'time', advanceMode: 'manual' }), 'automáticamente'],
    ['superficie inestable sin ayuda', physical({ surface: 'unstable', supervision: 'independent_after_approval' }), 'inestables'],
    ['marcha domiciliaria independiente', physical({ posture: 'walking', supervision: 'independent_after_approval' }), 'marcha domiciliaria'],
    ['modo Libre inestable sin ayuda', free({ surface: 'unstable', supervision: 'independent_after_approval' }), 'inestables'],
    ['modo Libre en marcha domiciliaria independiente', free({ posture: 'walking', supervision: 'independent_after_approval' }), 'marcha domiciliaria'],
    ['RVO x1 dentro de VR Box', config({ displayMode: 'vr_box', advanceMode: 'automatic' }), 'acompaña la cabeza'],
    ['RVO x1 dentro de Quest', config({ displayMode: 'quest_browser' }), 'no inicia una sesión WebXR'],
    ['tarea física dentro de VR Box', physical({ displayMode: 'vr_box', doseMode: 'time', advanceMode: 'automatic' }), 'oculta el entorno'],
  ])('rechaza %s', (_label, exercise, message) => expect(validateSession(session([exercise])).exercises).toContain(message))

  it('bloquea tareas físicas en visor incluso con supervisión presencial', () => {
    const exercise = physical({ displayMode: 'vr_box', posture: 'standing', supervision: 'direct_clinician', doseMode: 'time', advanceMode: 'automatic' })
    expect(validateSession(session([exercise], 'in_person')).exercises).toContain('oculta el entorno')
  })

  it('no mezcla Quest con ejercicios para otro dispositivo', () => {
    expect(validateSession(session([optokinetic({ displayMode: 'quest_browser' }), defaultExerciseConfig])).exercises).toContain('exclusivamente ejercicios Quest')
  })

  it('ignora condiciones físicas residuales al volver a un estímulo visual', () => {
    const exercise = config({ kind: 'visual_stimulus', surface: 'unstable', posture: 'walking', supervision: 'independent_after_approval' })
    expect(validateSession(session([exercise]))).toEqual({})
  })
})
