import { describe, expect, it } from 'vitest'
import { normalizeMetricRows, parseLocaleNumber, parseMetricTable } from './normalization'
import type { MetricRowInput } from './types'

function row(overrides: Partial<MetricRowInput> = {}): MetricRowInput {
  return { clientId: crypto.randomUUID(), metricCode: 'condition_score', rawValue: '74,1', unitCode: 'percent', conditionCode: 'D', side: '', axis: '', trialNumber: '1', sourceLocation: 'Página 1', ...overrides }
}

describe('normalización clínica trazable', () => {
  it('interpreta coma decimal y conserva el valor original', () => {
    const [result] = normalizeMetricRows([row()])
    expect(result.rawValue).toBe('74,1')
    expect(result.normalizedNumericValue).toBe(74.1)
    expect(result.qualityStatus).toBe('ok')
  })

  it('diferencia no aplica de un cero y de un dato no registrado', () => {
    const results = normalizeMetricRows([row({ rawValue: 'No aplica' }), row({ rawValue: '0', trialNumber: '2' }), row({ rawValue: 'No registrado', trialNumber: '3' })])
    expect(results[0].qualityStatus).toBe('not_applicable')
    expect(results[0].normalizedTextValue).toBe('not_applicable')
    expect(results[1].normalizedNumericValue).toBe(0)
    expect(results[2].normalizedTextValue).toBe('not_recorded')
  })

  it('exige identificar la métrica y condición aunque el valor no aplique', () => {
    const [result] = normalizeMetricRows([row({ metricCode: '', conditionCode: '', rawValue: 'No aplica' })])
    expect(result.qualityStatus).toBe('blocked')
  })

  it('bloquea la comparación cuando falta la unidad', () => {
    const [result] = normalizeMetricRows([row({ unitCode: '' })])
    expect(result.qualityStatus).toBe('blocked')
    expect(result.issues.some((issue) => issue.ruleCode === 'DQ-002')).toBe(true)
  })

  it('pone en cuarentena porcentajes fuera del rango técnico sin corregirlos', () => {
    const [result] = normalizeMetricRows([row({ rawValue: '140' })])
    expect(result.normalizedNumericValue).toBe(140)
    expect(result.qualityStatus).toBe('quarantine')
  })

  it('detecta filas posiblemente duplicadas', () => {
    const results = normalizeMetricRows([row(), row({ clientId: crypto.randomUUID() })])
    expect(results.every((item) => item.issues.some((issue) => issue.ruleCode === 'DQ-007'))).toBe(true)
  })

  it('importa una tabla separada por punto y coma', () => {
    const rows = parseMetricTable('metrica;valor;unidad;condicion\ncondition_score;82,5;percent;A')
    expect(rows[0]).toMatchObject({ metricCode: 'condition_score', rawValue: '82,5', unitCode: 'percent', conditionCode: 'A' })
  })
})

describe('lector numérico', () => {
  it.each([['1.234,56', 1234.56], ['1,234.56', 1234.56], ['74,1%', 74.1]])('normaliza %s', (raw, expected) => {
    expect(parseLocaleNumber(raw)).toBe(expected)
  })
})
