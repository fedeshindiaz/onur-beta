import { beforeEach, describe, expect, it } from 'vitest'
import { defaultExerciseConfig } from '../exercise/types'
import { deleteExerciseTemplate, listExerciseTemplates, saveExerciseTemplate } from './repository'

describe('biblioteca de ejercicios',()=>{
  beforeEach(()=>localStorage.clear())
  it('guarda y elimina configuraciones reutilizables',async()=>{const saved=await saveExerciseTemplate({...defaultExerciseConfig,name:'Sacadas de prueba',objectMode:'saccades'});expect((await listExerciseTemplates()).some(item=>item.id===saved.id)).toBe(true);await deleteExerciseTemplate(saved.id);expect((await listExerciseTemplates()).some(item=>item.id===saved.id)).toBe(false)})
})
