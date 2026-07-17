import { describe, expect, it } from 'vitest'
import { defaultExerciseConfig } from './types'

describe('configuración base del ejercicio',()=>{
  it('inicia en 2D y conserva el metrónomo desactivado',()=>{expect(defaultExerciseConfig.displayMode).toBe('standard');expect(defaultExerciseConfig.metronomeEnabled).toBe(false)})
})
