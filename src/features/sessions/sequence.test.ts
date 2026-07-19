import { describe, expect, it } from 'vitest'
import { defaultExerciseConfig } from '../exercise/types'
import { analyzeSessionSequence, orderExercisesForVrBox } from './sequence'

const repetitions = { ...defaultExerciseConfig, name: 'Sentarse y pararse', doseMode: 'repetitions' as const, displayMode: 'standard' as const }
const vrBox = { ...defaultExerciseConfig, name: 'VOR X1 VR', doseMode: 'time' as const, displayMode: 'vr_box' as const, advanceMode: 'automatic' as const }

describe('secuencia de equipamiento VR Box', () => {
  it('advierte cuando habría que colocar, retirar y volver a colocar el visor', () => {
    expect(analyzeSessionSequence([vrBox, repetitions, vrBox])).toMatchObject({ mixesRepetitionsAndVrBox: true, optimizedForVrBox: false, visorChanges: 4 })
  })

  it('ordena repeticiones antes del bloque temporizado VR', () => {
    const ordered = orderExercisesForVrBox([vrBox, repetitions, vrBox])
    expect(ordered.map((exercise) => exercise.name)).toEqual(['Sentarse y pararse', 'VOR X1 VR', 'VOR X1 VR'])
    expect(analyzeSessionSequence(ordered)).toMatchObject({ optimizedForVrBox: true, visorChanges: 2 })
  })
})
