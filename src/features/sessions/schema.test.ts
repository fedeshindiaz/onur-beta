import { describe, expect, it } from 'vitest'
import { defaultExerciseConfig } from '../exercise/types'
import { validateSession } from './schema'

describe('validación de sesión',()=>{
  it('acepta una sesión completa',()=>expect(validateSession({title:'Sesión 1',instructions:'',mode:'home',treatmentCycleId:'cycle',availableFrom:'2026-07-16',availableUntil:'',exercises:[defaultExerciseConfig]})).toEqual({}))
  it('rechaza una fecha final anterior',()=>expect(validateSession({title:'Sesión 1',instructions:'',mode:'home',treatmentCycleId:'cycle',availableFrom:'2026-07-16',availableUntil:'2026-07-15',exercises:[defaultExerciseConfig]}).availableUntil).toBeTruthy())
  it('rechaza repeticiones dentro de VR Box',()=>expect(validateSession({title:'Sesión 1',instructions:'',mode:'home',treatmentCycleId:'cycle',availableFrom:'2026-07-16',availableUntil:'',exercises:[{...defaultExerciseConfig,displayMode:'vr_box',doseMode:'repetitions'}]}).exercises).toContain('VR Box'))
  it('requiere avance automático dentro de VR Box',()=>expect(validateSession({title:'Sesión 1',instructions:'',mode:'home',treatmentCycleId:'cycle',availableFrom:'2026-07-16',availableUntil:'',exercises:[{...defaultExerciseConfig,displayMode:'vr_box',advanceMode:'manual'}]}).exercises).toContain('automáticamente'))
})
