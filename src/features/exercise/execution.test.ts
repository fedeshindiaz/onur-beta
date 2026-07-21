import { describe, expect, it } from 'vitest'
import { applyExercisePurpose } from './compatibility'
import { buildExerciseExecutionPlan } from './execution'
import { defaultExerciseConfig } from './types'

describe('plan práctico de ejecución', () => {
  it('describe material, respuesta y finalización de un objetivo raro domiciliario', () => {
    const config = applyExercisePurpose(defaultExerciseConfig, 'cognitive_visual')
    const plan = buildExerciseExecutionPlan(config, 'home')
    expect(plan.feasibility).toBe('ready')
    expect(plan.equipment).toContain('Sin material adicional')
    expect(plan.response).toContain('Contá mentalmente')
    expect(plan.finish).toContain('Ingresar el total')
  })

  it('identifica como doble tarea una consigna cognitiva combinada con RVO', () => {
    const config = { ...defaultExerciseConfig, cognitiveTaskMode: 'go_no_go' as const, cognitiveResponseMode: 'verbal' as const, advanceMode: 'manual' as const }
    const plan = buildExerciseExecutionPlan(config, 'home')
    expect(plan.feasibility).toBe('review')
    expect(plan.warnings.join(' ')).toContain('tarea vestibular u oculomotora aislada')
  })

  it('rechaza una respuesta táctil mientras la cabeza está en movimiento', () => {
    const config = { ...defaultExerciseConfig, cognitiveTaskMode: 'go_no_go' as const, cognitiveResponseMode: 'screen_tap' as const, advanceMode: 'manual' as const }
    expect(buildExerciseExecutionPlan(config, 'home').feasibility).toBe('not_executable')
  })

  it('explica una ejecución VR Box sin controles ni falsa promesa de anclaje espacial', () => {
    const config = { ...applyExercisePurpose(defaultExerciseConfig, 'optokinetic'), displayMode: 'vr_box' as const, doseMode: 'time' as const, advanceMode: 'automatic' as const }
    const plan = buildExerciseExecutionPlan(config, 'home')
    expect(plan.feasibility).toBe('ready')
    expect(plan.finish).toContain('termina automáticamente')
    expect(plan.warnings.join(' ')).toContain('presentación binocular 2D')
    expect(plan.warnings.join(' ')).toContain('fusionen en uno solo')
  })
})
