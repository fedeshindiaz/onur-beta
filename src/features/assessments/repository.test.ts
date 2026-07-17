import { beforeEach, describe, expect, it } from 'vitest'
import { assessmentComparison, createAssessment, listPatientAssessments } from './repository'

const base = { patientId: 'ana-p', treatmentCycleId: 'cycle-ana-2', sourceDocumentId: '', phase: 'final' as const, assessmentDate: '2026-07-16', generalRating: 7, fallsCount: 0, walkingAidUsed: false }

describe('evaluaciones descriptivas', () => {
  beforeEach(() => localStorage.clear())

  it('compara una evaluación inicial y final v2 completas sin interpretar', async () => {
    await createAssessment({ ...base, responses: Array(18).fill(1) })
    const comparison = assessmentComparison(await listPatientAssessments('ana-p'), 'cycle-ana-2')
    expect(comparison?.initialComparableTotal).toBe(38)
    expect(comparison?.finalComparableTotal).toBe(18)
    expect(comparison?.difference).toBe(-20)
    expect(comparison?.maximumScore).toBe(54)
  })

  it('no compara formularios incompletos', async () => {
    await createAssessment({ ...base, responses: [1, null, ...Array(16).fill(1)] })
    expect(assessmentComparison(await listPatientAssessments('ana-p'), 'cycle-ana-2')).toBeNull()
  })

  it('excluye No aplica del numerador y denominador comparables', async () => {
    await createAssessment({ ...base, responses: ['not_applicable', ...Array(17).fill(1)] })
    const comparison = assessmentComparison(await listPatientAssessments('ana-p'), 'cycle-ana-2')
    expect(comparison?.comparedCount).toBe(17)
    expect(comparison?.maximumScore).toBe(51)
    expect(comparison?.initialComparableTotal).toBe(35)
    expect(comparison?.finalComparableTotal).toBe(17)
  })
})
