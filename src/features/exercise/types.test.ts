import { describe, expect, it } from 'vitest'
import { defaultExerciseConfig, normalizeExerciseConfig } from './types'

describe('configuración base del ejercicio',()=>{
  it('inicia en 2D, con 10 segundos de preparación y el metrónomo desactivado',()=>{expect(defaultExerciseConfig.displayMode).toBe('standard');expect(defaultExerciseConfig.preparationSeconds).toBe(10);expect(defaultExerciseConfig.metronomeEnabled).toBe(false)})
  it('mantiene Cardboard apagado en configuraciones antiguas y conserva una selección explícita',()=>{expect(defaultExerciseConfig.cardboardEnabled).toBe(false);expect(normalizeExerciseConfig({displayMode:'vr_box'}).cardboardEnabled).toBe(false);expect(normalizeExerciseConfig({displayMode:'vr_box',cardboardEnabled:true}).cardboardEnabled).toBe(true)})
})
