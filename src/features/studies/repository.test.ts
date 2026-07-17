import { beforeEach, describe, expect, it } from 'vitest'
import { normalizeMetricRows } from './normalization'
import { finalizeClinicalStudy, getStudyReview, listClinicalStudies, listStatisticalSuggestions, reviewStatisticalSuggestion, saveStudyImport } from './repository'

describe('flujo demo de estudios estructurados', () => {
  beforeEach(() => localStorage.clear())

  it('confirma métricas, genera una sugerencia y registra la revisión', async () => {
    const study = await getStudyReview('study-demo-1')
    expect(study).not.toBeNull()
    const result = await saveStudyImport({ studyId: study!.id, metrics: normalizeMetricRows(study!.metrics), qualityNotes: 'Condiciones verificadas.', interpretable: true })
    expect(result).toMatchObject({ metricCount: 4, issueCount: 0, suggestionCount: 1 })
    const saved = await getStudyReview(study!.id)
    expect(saved).toMatchObject({ status: 'reviewed', interpretable: true })
    const suggestion = (await listStatisticalSuggestions()).find((item) => item.studyId === study!.id)
    expect(suggestion?.ruleCode).toBe('BAP-001 · v1')
    await reviewStatisticalSuggestion(suggestion!.id, 'edited', 'Texto revisado por el profesional.')
    expect((await listStatisticalSuggestions()).find((item) => item.id === suggestion!.id)).toMatchObject({ status: 'edited', professionalText: 'Texto revisado por el profesional.' })
  })

  it('no permite marcar interpretable un estudio con valores bloqueados', async () => {
    const study = await getStudyReview('study-demo-1')
    const metrics = normalizeMetricRows(study!.metrics.map((metric) => ({ ...metric, unitCode: '' })))
    await saveStudyImport({ studyId: study!.id, metrics, qualityNotes: '', interpretable: true })
    expect((await getStudyReview(study!.id))?.interpretable).toBe(false)
  })

  it('finaliza una revisión e impide reemplazar sus valores', async () => {
    const study = await getStudyReview('study-demo-1')
    const input = { studyId: study!.id, metrics: normalizeMetricRows(study!.metrics), qualityNotes: 'Revisado.', interpretable: true }
    await saveStudyImport(input)
    expect(await finalizeClinicalStudy(study!.id)).toBe('demo-study-demo-1')
    expect((await getStudyReview(study!.id))?.status).toBe('finalized')
    await expect(saveStudyImport(input)).rejects.toThrow('finalizado')
    expect((await listClinicalStudies()).find((item)=>item.id===study!.id)?.status).toBe('finalized')
  })

  it('lista estudios ordenados para el índice profesional',async()=>{const studies=await listClinicalStudies();expect(studies.map(item=>item.id)).toEqual(['study-demo-1','study-demo-2']);expect(studies[0]).toMatchObject({patientName:'Ana Pereira',studyType:'posturography',metricCount:4})})
})
