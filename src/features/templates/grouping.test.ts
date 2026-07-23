import { describe, expect, it } from 'vitest'
import { defaultExerciseConfig } from '../exercise/types'
import { groupExerciseTemplates } from './grouping'
import type { ExerciseTemplateRecord } from './repository'

const record = (id: string, name: string, overrides: Partial<ExerciseTemplateRecord['config']> = {}): ExerciseTemplateRecord => ({
  id, name, config: { ...defaultExerciseConfig, ...overrides }, createdAt: '', updatedAt: '',
})

describe('agrupación de plantillas', () => {
  it('separa las tres familias PPPD, las generales y las personales', () => {
    const groups = groupExerciseTemplates([
      record('template-h1', 'H1', { clinicalProtocol: 'pppd', purpose: 'visual_habituation' }),
      record('template-o1', 'O1', { clinicalProtocol: 'pppd', purpose: 'optokinetic' }),
      record('template-f1', 'F1', { clinicalProtocol: 'pppd', purpose: 'guided_functional' }),
      record('template-base', 'Base'),
      record('custom', 'Mía'),
    ])
    expect(groups.map((group) => group.label)).toEqual(['PPPD · Habituación visual', 'PPPD · Optocinético', 'PPPD · Funcional', 'Mis plantillas', 'Plantillas generales'])
  })
})
