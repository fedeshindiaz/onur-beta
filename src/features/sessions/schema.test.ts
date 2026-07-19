import { describe, expect, it } from 'vitest'
import { defaultExerciseConfig, type ExerciseConfig } from '../exercise/types'
import { validateSession } from './schema'

const session = (exercises: ExerciseConfig[], mode: 'home' | 'in_person' = 'home') => ({
  title: 'Sesión 1', instructions: '', mode, treatmentCycleId: 'cycle',
  availableFrom: '2026-07-16', availableUntil: '', exercises,
})

const config = (overrides: Partial<ExerciseConfig> = {}): ExerciseConfig => ({ ...defaultExerciseConfig, ...overrides })

describe('validación de sesión',()=>{
  it.each([
    ['pantalla 2D por tiempo', config()],
    ['pantalla 2D por repeticiones', config({ doseMode: 'repetitions', advanceMode: 'manual' })],
    ['Quest por tiempo', config({ displayMode: 'quest_browser', doseMode: 'time', advanceMode: 'automatic' })],
    ['Quest por repeticiones', config({ displayMode: 'quest_browser', doseMode: 'repetitions', advanceMode: 'manual' })],
    ['VR Box visual por tiempo', config({ displayMode: 'vr_box', doseMode: 'time', advanceMode: 'automatic' })],
    ['físico sentado independiente', config({ kind: 'guided_physical', doseMode: 'repetitions', posture: 'seated' })],
    ['físico de pie con ayudante', config({ kind: 'guided_physical', posture: 'standing', supervision: 'trained_helper' })],
    ['marcha domiciliaria con ayudante', config({ kind: 'guided_physical', posture: 'walking', supervision: 'trained_helper' })],
  ])('acepta %s', (_label, exercise) => expect(validateSession(session([exercise]))).toEqual({}))

  it('rechaza una fecha final anterior',()=>expect(validateSession({...session([defaultExerciseConfig]),availableUntil:'2026-07-15'}).availableUntil).toBeTruthy())

  it.each([
    ['repeticiones dentro de VR Box', config({ displayMode: 'vr_box', doseMode: 'repetitions', advanceMode: 'manual' }), 'VR Box'],
    ['avance manual dentro de VR Box', config({ displayMode: 'vr_box', doseMode: 'time', advanceMode: 'manual' }), 'automáticamente'],
    ['superficie inestable sin ayuda', config({ kind: 'guided_physical', surface: 'unstable', supervision: 'independent_after_approval' }), 'inestables'],
    ['marcha domiciliaria independiente', config({ kind: 'guided_physical', posture: 'walking', supervision: 'independent_after_approval' }), 'marcha domiciliaria'],
    ['VR Box domiciliario de pie', config({ kind: 'guided_physical', displayMode: 'vr_box', posture: 'standing', advanceMode: 'automatic' }), 'domiciliarios'],
  ])('rechaza %s', (_label, exercise, message) => expect(validateSession(session([exercise])).exercises).toContain(message))

  it('permite VR Box físico de pie bajo supervisión presencial', () => {
    const exercise = config({ kind: 'guided_physical', displayMode: 'vr_box', posture: 'standing', supervision: 'direct_clinician', advanceMode: 'automatic' })
    expect(validateSession(session([exercise], 'in_person'))).toEqual({})
  })

  it('ignora condiciones físicas residuales al volver a un estímulo visual', () => {
    const exercise = config({ kind: 'visual_stimulus', surface: 'unstable', posture: 'walking', supervision: 'independent_after_approval' })
    expect(validateSession(session([exercise]))).toEqual({})
  })
})
