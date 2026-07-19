import { beforeEach, describe, expect, it } from 'vitest'
import { defaultExerciseConfig } from '../exercise/types'
import { applyExercisePurpose } from '../exercise/compatibility'
import { deleteExerciseTemplate, listExerciseTemplates, saveExerciseTemplate } from './repository'

describe('biblioteca de ejercicios',()=>{
  beforeEach(()=>localStorage.clear())
  it('guarda la preparación y elimina configuraciones reutilizables',async()=>{const saved=await saveExerciseTemplate({...applyExercisePurpose(defaultExerciseConfig,'saccades'),name:'Sacadas de prueba',preparationSeconds:20});expect((await listExerciseTemplates()).find(item=>item.id===saved.id)?.config.preparationSeconds).toBe(20);await deleteExerciseTemplate(saved.id);expect((await listExerciseTemplates()).some(item=>item.id===saved.id)).toBe(false)})
})
