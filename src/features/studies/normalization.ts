import { metricDefinition } from './catalog'
import type { MetricQualityIssue, MetricRowInput, NormalizedMetricRow } from './types'

export const NORMALIZATION_RULE_VERSION = 'onur-normalization-1.0'

const missingTokens = new Set(['nr', 'n/r', 'no registrado', 'sin dato', 's/d', 'sd', '-'])
const notApplicableTokens = new Set(['na', 'n/a', 'no aplica', 'no aplicable'])
const unknownTokens = new Set(['desconocido', 'unknown', 'no informado'])
const infiniteTokens = new Set(['∞', 'infinito', 'infinity'])

function normalizedToken(value: string) {
  return value.trim().toLocaleLowerCase('es-UY').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

export function parseLocaleNumber(rawValue: string): number | null {
  let value = rawValue.trim().replace(/\s/g, '').replace(/%$/, '')
  if (!value) return null
  const comma = value.lastIndexOf(',')
  const dot = value.lastIndexOf('.')
  if (comma >= 0 && dot >= 0) {
    value = comma > dot ? value.replace(/\./g, '').replace(',', '.') : value.replace(/,/g, '')
  } else if (comma >= 0) {
    value = value.replace(',', '.')
  }
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(value)) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function statusFrom(issues: MetricQualityIssue[]): NormalizedMetricRow['qualityStatus'] {
  if (issues.some((issue) => issue.severity === 'blocked')) return 'blocked'
  if (issues.some((issue) => issue.severity === 'quarantine')) return 'quarantine'
  if (issues.some((issue) => issue.severity === 'review')) return 'review'
  return 'ok'
}

function normalizeBoolean(rawValue: string) {
  const token = normalizedToken(rawValue)
  if (['si', 'sí', 'true', '1', 'presente', 'positivo'].includes(token)) return 'yes'
  if (['no', 'false', '0', 'ausente', 'negativo'].includes(token)) return 'no'
  return null
}

export function normalizeMetricRow(row: MetricRowInput): NormalizedMetricRow {
  const definition = metricDefinition(row.metricCode)
  const issues: MetricQualityIssue[] = []
  const token = normalizedToken(row.rawValue)
  let normalizedNumericValue: number | null = null
  let normalizedTextValue: string | null = null

  if (!definition) issues.push({ ruleCode: 'DQ-001', severity: 'blocked', message: 'Seleccioná una métrica reconocida por el diccionario versionado.' })
  if (!row.rawValue.trim()) issues.push({ ruleCode: 'DQ-001', severity: 'blocked', message: 'El valor original es obligatorio.' })

  if (notApplicableTokens.has(token)) {
    normalizedTextValue = 'not_applicable'
    if (definition?.requiresCondition && !row.conditionCode.trim()) issues.push({ ruleCode: 'DQ-001', severity: 'blocked', message: 'La condición del protocolo es obligatoria incluso cuando el resultado no aplica.' })
    return { ...row, normalizedNumericValue, normalizedTextValue, normalizationRuleVersion: NORMALIZATION_RULE_VERSION, qualityStatus: issues.some((issue) => issue.severity === 'blocked') ? 'blocked' : 'not_applicable', issues }
  }
  if (infiniteTokens.has(token)) {
    normalizedTextValue = 'infinite'
    issues.push({ ruleCode: 'DQ-006', severity: 'review', message: 'El origen informa infinito; se conserva como texto y nunca se convierte en cero.' })
  } else if (missingTokens.has(token)) {
    normalizedTextValue = 'not_recorded'
    issues.push({ ruleCode: 'DQ-001', severity: 'review', message: 'El origen indica que el dato no fue registrado; no se imputa ningún valor.' })
  } else if (unknownTokens.has(token)) {
    normalizedTextValue = 'unknown'
    issues.push({ ruleCode: 'DQ-001', severity: 'review', message: 'El origen informa un valor desconocido; no participa en cálculos.' })
  } else if (definition?.valueKind === 'numeric' && row.rawValue.trim()) {
    normalizedNumericValue = parseLocaleNumber(row.rawValue)
    if (normalizedNumericValue === null) issues.push({ ruleCode: 'DQ-006', severity: 'quarantine', message: 'El formato numérico no pudo normalizarse de forma segura.' })
  } else if (definition?.valueKind === 'boolean' && row.rawValue.trim()) {
    normalizedTextValue = normalizeBoolean(row.rawValue)
    if (!normalizedTextValue) issues.push({ ruleCode: 'DQ-006', severity: 'quarantine', message: 'El valor booleano debe indicar sí/no, presente/ausente o equivalente.' })
  } else if (definition?.valueKind === 'categorical' && row.rawValue.trim()) {
    normalizedTextValue = token.replace(/\s+/g, '_')
  } else if (definition?.valueKind === 'text' && row.rawValue.trim()) {
    normalizedTextValue = row.rawValue.trim()
  }

  const detectedPercent = row.rawValue.trim().endsWith('%')
  const effectiveUnit = row.unitCode || (detectedPercent ? 'percent' : '')
  if (definition?.requiresUnit && (!effectiveUnit || effectiveUnit === 'unknown')) {
    issues.push({ ruleCode: 'DQ-002', severity: 'blocked', message: 'La unidad no está confirmada; la comparación queda bloqueada.' })
  } else if (definition?.allowedUnits.length && effectiveUnit && !definition.allowedUnits.includes(effectiveUnit)) {
    issues.push({ ruleCode: 'DQ-002', severity: 'blocked', message: 'La unidad seleccionada no es compatible con esta métrica.' })
  }
  if (definition?.requiresCondition && !row.conditionCode.trim()) {
    issues.push({ ruleCode: 'DQ-001', severity: 'blocked', message: 'La condición del protocolo es obligatoria para esta métrica.' })
  }
  if (normalizedNumericValue !== null && effectiveUnit === 'percent' && (normalizedNumericValue < 0 || normalizedNumericValue > 100)) {
    issues.push({ ruleCode: 'DQ-003', severity: 'quarantine', message: 'El porcentaje está fuera del rango técnico 0–100. Se conserva sin corregir.' })
  }
  if (normalizedNumericValue === 0 && definition?.zeroAllowed === false) {
    issues.push({ ruleCode: 'DQ-004', severity: 'review', message: 'Confirmá si cero es un valor real o representa un dato ausente.' })
  }
  const trial = row.trialNumber.trim() ? Number(row.trialNumber) : null
  if (trial !== null && (!Number.isInteger(trial) || trial < 1)) {
    issues.push({ ruleCode: 'DQ-006', severity: 'quarantine', message: 'La repetición debe ser un entero mayor o igual a 1.' })
  }

  return {
    ...row,
    unitCode: effectiveUnit,
    normalizedNumericValue,
    normalizedTextValue,
    normalizationRuleVersion: NORMALIZATION_RULE_VERSION,
    qualityStatus: statusFrom(issues),
    issues,
  }
}

function comparisonKey(row: MetricRowInput) {
  return [row.metricCode, row.conditionCode, row.side, row.axis, row.trialNumber].join('|')
}

export function normalizeMetricRows(rows: MetricRowInput[]): NormalizedMetricRow[] {
  const counts = new Map<string, number>()
  rows.forEach((row) => counts.set(comparisonKey(row), (counts.get(comparisonKey(row)) ?? 0) + 1))
  return rows.map((row) => {
    const normalized = normalizeMetricRow(row)
    if ((counts.get(comparisonKey(row)) ?? 0) > 1) {
      const issues = [...normalized.issues, { ruleCode: 'DQ-007', severity: 'review' as const, message: 'Existe otra fila con la misma métrica, condición, lado, eje y repetición.' }]
      return { ...normalized, issues, qualityStatus: statusFrom(issues) }
    }
    return normalized
  })
}

function splitDelimitedLine(line: string, delimiter: string) {
  const cells: string[] = []
  let value = ''
  let quoted = false
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index]
    if (character === '"') {
      if (quoted && line[index + 1] === '"') { value += '"'; index += 1 } else quoted = !quoted
    } else if (character === delimiter && !quoted) { cells.push(value.trim()); value = '' } else value += character
  }
  cells.push(value.trim())
  return cells
}

const headerAliases: Record<string, keyof Omit<MetricRowInput, 'clientId'>> = {
  metrica: 'metricCode', metric_code: 'metricCode', codigo: 'metricCode',
  valor: 'rawValue', raw_value: 'rawValue', valor_original: 'rawValue',
  unidad: 'unitCode', unit: 'unitCode', unit_code: 'unitCode',
  condicion: 'conditionCode', condition: 'conditionCode', condition_code: 'conditionCode',
  lado: 'side', side: 'side', eje: 'axis', axis: 'axis',
  repeticion: 'trialNumber', trial: 'trialNumber', trial_number: 'trialNumber',
  origen: 'sourceLocation', source_location: 'sourceLocation', ubicacion: 'sourceLocation',
}

export function parseMetricTable(text: string): MetricRowInput[] {
  const lines = text.split(/\r?\n/).filter((line) => line.trim())
  if (lines.length < 2) throw new Error('La tabla debe incluir encabezados y al menos una fila.')
  const first = lines[0]
  const delimiter = first.includes('\t') ? '\t' : first.includes(';') ? ';' : ','
  const headers = splitDelimitedLine(first, delimiter).map((header) => normalizedToken(header).replace(/\s+/g, '_'))
  const mapped = headers.map((header) => headerAliases[header])
  if (!mapped.includes('metricCode') || !mapped.includes('rawValue')) throw new Error('La tabla necesita las columnas métrica y valor.')
  return lines.slice(1).map((line) => {
    const cells = splitDelimitedLine(line, delimiter)
    const row: MetricRowInput = { clientId: crypto.randomUUID(), metricCode: '', rawValue: '', unitCode: '', conditionCode: '', side: '', axis: '', trialNumber: '', sourceLocation: 'Tabla pegada' }
    mapped.forEach((field, index) => { if (field) (row[field] as string) = cells[index] ?? '' })
    return row
  })
}
