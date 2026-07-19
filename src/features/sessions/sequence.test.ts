import { describe, expect, it } from 'vitest'
import { applyExercisePurpose } from '../exercise/compatibility'
import { defaultExerciseConfig } from '../exercise/types'
import { analyzeSessionSequence, orderExercisesForVrBox } from './sequence'

const repetitions = { ...defaultExerciseConfig, name: 'Sentarse y pararse', doseMode: 'repetitions' as const, displayMode: 'standard' as const }
const vrBox = { ...applyExercisePurpose(defaultExerciseConfig, 'optokinetic'), name: 'Optocinético VR', doseMode: 'time' as const, displayMode: 'vr_box' as const, advanceMode: 'automatic' as const }
const standardTimed = { ...defaultExerciseConfig, name: 'Seguimiento 2D', doseMode: 'time' as const, displayMode: 'standard' as const }

describe('secuencia de equipamiento VR Box', () => {
  it('advierte cuando habría que colocar, retirar y volver a colocar el visor', () => {
    expect(analyzeSessionSequence([vrBox, repetitions, vrBox])).toMatchObject({ mixesRepetitionsAndVrBox: true, optimizedForVrBox: false, visorChanges: 4 })
  })

  it('ordena repeticiones antes del bloque temporizado VR', () => {
    const ordered = orderExercisesForVrBox([vrBox, repetitions, vrBox])
    expect(ordered.map((exercise) => exercise.name)).toEqual(['Sentarse y pararse', 'Optocinético VR', 'Optocinético VR'])
    expect(analyzeSessionSequence(ordered)).toMatchObject({ optimizedForVrBox: true, visorChanges: 2 })
  })

  it.each([
    ['solo repeticiones', [repetitions], { mixesRepetitionsAndVrBox: false, optimizedForVrBox: true, visorChanges: 0 }],
    ['solo tiempo 2D', [standardTimed], { mixesRepetitionsAndVrBox: false, optimizedForVrBox: true, visorChanges: 0 }],
    ['solo bloque VR', [vrBox, vrBox], { mixesRepetitionsAndVrBox: false, optimizedForVrBox: true, visorChanges: 2 }],
    ['repeticiones y luego VR', [repetitions, standardTimed, vrBox], { mixesRepetitionsAndVrBox: true, optimizedForVrBox: true, visorChanges: 2 }],
    ['VR y luego repeticiones', [vrBox, repetitions], { mixesRepetitionsAndVrBox: true, optimizedForVrBox: false, visorChanges: 2 }],
    ['VR intercalado', [vrBox, repetitions, vrBox], { mixesRepetitionsAndVrBox: true, optimizedForVrBox: false, visorChanges: 4 }],
  ])('analiza %s', (_label, exercises, expected) => expect(analyzeSessionSequence(exercises)).toMatchObject(expected))

  it('conserva el orden relativo dentro de cada bloque al optimizar', () => {
    const rep2 = { ...repetitions, name: 'Marcha asistida' }
    const timed2 = { ...standardTimed, name: 'Sacadas 2D' }
    const vr2 = { ...vrBox, name: 'Optocinético VR' }
    const ordered = orderExercisesForVrBox([vr2, timed2, rep2, vrBox, standardTimed, repetitions])
    expect(ordered.map((exercise) => exercise.name)).toEqual([
      'Marcha asistida', 'Sentarse y pararse', 'Sacadas 2D', 'Seguimiento 2D', 'Optocinético VR', 'Optocinético VR',
    ])
  })
})
