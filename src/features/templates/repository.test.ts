import { beforeEach, describe, expect, it } from 'vitest'
import { defaultExerciseConfig } from '../exercise/types'
import { applyExercisePurpose } from '../exercise/compatibility'
import { deleteExerciseTemplate, listExerciseTemplates, saveExerciseTemplate } from './repository'

describe('biblioteca de ejercicios',()=>{
  beforeEach(()=>localStorage.clear())
  it('guarda la preparación y elimina configuraciones reutilizables',async()=>{const saved=await saveExerciseTemplate({...applyExercisePurpose(defaultExerciseConfig,'saccades'),name:'Sacadas de prueba',preparationSeconds:20});expect((await listExerciseTemplates()).find(item=>item.id===saved.id)?.config.preparationSeconds).toBe(20);await deleteExerciseTemplate(saved.id);expect((await listExerciseTemplates()).some(item=>item.id===saved.id)).toBe(false)})
  it('incluye RVO x2 horizontal, diagonal y objetivo recordado como predeterminados',async()=>{const templates=await listExerciseTemplates();expect(templates.map(item=>item.id)).toEqual(expect.arrayContaining(['template-rvo-x2-horizontal','template-rvo-x2-diagonal','template-remembered-target']))})
  it('permite guardar una configuración Libre aunque no cumpla una regla clínica o técnica',async()=>{const free={...applyExercisePurpose(defaultExerciseConfig,'custom_free'),name:'Combinación profesional',displayMode:'vr_box' as const,doseMode:'repetitions' as const,advanceMode:'manual' as const,backgroundType:'spiral' as const,backgroundSpeed:80,objectMode:'saccades' as const};const saved=await saveExerciseTemplate(free);expect((await listExerciseTemplates()).find(item=>item.id===saved.id)?.config).toMatchObject({purpose:'custom_free',backgroundType:'spiral',objectMode:'saccades'})})
})
