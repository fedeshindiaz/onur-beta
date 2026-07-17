import { parseLocaleNumber } from '../studies/normalization'
import { posturographyFieldDefinitions, vestibularFieldDefinitions } from './catalog'
import type { ExtractedField, ExtractedPage, ExtractionFieldDefinition, IntakeKind, PageClassification, PatientMatchStatus, SourceRegion } from './types'

export const EXTRACTOR_VERSION = 'onur-local-ocr-1.1'

function fold(value: string) {
  return value.toLocaleLowerCase('es-UY').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

const pageSignals: Array<{ type: PageClassification; words: string[] }> = [
  { type: 'posturography', words: ['posturograf', 'bap', 'limite de estabilidad', 'organizacion sensorial', 'sway', 'score los'] },
  { type: 'vhit_graph', words: ['head impulse', 'vhit', 'himp', 'shimp', 'gain', 'ganancia', 'saccade', 'sacada', 'oculomotor'] },
  { type: 'vestibular_report', words: ['otoneurolog', 'vestibular', 'nistag', 'supresion visual', 'head shaking', 'pruebas posicionales', 'en suma'] },
  { type: 'referral', words: ['orden medica', 'derivacion', 'solicito', 'motivo de derivacion'] },
  { type: 'other_clinical', words: ['informe clinico', 'paciente', 'examen clinico', 'antecedentes'] },
]

export function classifyPage(text: string): { classification: PageClassification; confidence: number } {
  const source = fold(text)
  const ranked = pageSignals.map((signal) => ({ ...signal, score: signal.words.filter((word) => source.includes(word)).length })).sort((a, b) => b.score - a.score)
  const best = ranked[0]
  if (!best || best.score === 0) return { classification: 'unrecognized', confidence: 0 }
  const reportScore = ranked.find((item) => item.type === 'vestibular_report')?.score ?? 0
  if (reportScore >= 2 && /(?:antecedentes|motivo|conclusion|en suma|examen clinico)/.test(source)) return { classification: 'vestibular_report', confidence: Math.min(.98, .6 + reportScore * .08) }
  const graphHints = /(?:curva|canal|impulso|velocity|velocidad)/.test(source)
  if (best.type === 'vhit_graph' && !graphHints && ranked.find((item) => item.type === 'vestibular_report')?.score) return { classification: 'vestibular_report', confidence: Math.min(.96, .55 + best.score * .1) }
  return { classification: best.type, confidence: Math.min(.98, .55 + best.score * .1) }
}

function lineValue(text: string, alias: string) {
  const foldedText = fold(text)
  const foldedAlias = fold(alias)
  const escapedAlias = foldedAlias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  for (const pattern of [`${escapedAlias}\\s*(?::|=|-)\\s*(.*)$`, `${escapedAlias}\\s+(.+)$`]) {
    const match = foldedText.match(new RegExp(pattern, 'iu'))
    if (!match || match.index === undefined) continue
    const valueStart = match.index + match[0].length - match[1].length
    return text.slice(valueStart).trim()
  }
  return ''
}

const compactValueCodes = new Set([
  'study_date', 'study_time', 'duration', 'reported_age', 'los_forward', 'los_backward', 'los_left', 'los_right',
  'los_area', 'sway_x', 'sway_y', 'afis_pattern', 'los_score', 'mix_ve_som', 'mix_ve_vi', 'pppd_index',
  'composite_score', 'condition_percentage', 'sensory_somatosensory', 'sensory_visual', 'sensory_vestibular',
  'visual_preference', 'gain_right', 'gain_left', 'symmetry', 'saccadic_velocity',
])

function compactCandidate(definition: ExtractionFieldDefinition, value: string) {
  const trimmed = value.trim()
  if (!trimmed || !compactValueCodes.has(definition.code) && !definition.conditionCode) return trimmed
  if (definition.code === 'study_date') return trimmed.match(/\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/)?.[0] ?? trimmed
  if (definition.code === 'study_time') return trimmed.match(/\b\d{1,2}:\d{2}(?::\d{2})?\b/)?.[0] ?? trimmed
  const literal = trimmed.match(/(?:no\s+aplica|no\s+registrado|n\/?a|n\/?r|∞|infinito)|[+-]?\s*(?:\d+(?:[.,]\d+)?|[.,]\d+)\s*(?:%|cm[²2]|mm[²2]|deg|°|hz|s|seg(?:undos?)?)?/i)?.[0]
  return literal?.replace(/\s+/g, ' ').trim() ?? trimmed
}

function normalizedValue(raw: string) {
  const number = parseLocaleNumber(raw)
  if (number !== null) return String(number)
  const measurement = raw.trim().match(/^([+-]?(?:\d+(?:[.,]\d*)?|[.,]\d+))\s*(?:cm2|cm²|mm2|mm²|deg|°|hz|s|seg|segundos?)$/i)
  if (measurement) {
    const measuredNumber = parseLocaleNumber(measurement[1])
    if (measuredNumber !== null) return String(measuredNumber)
  }
  const token = fold(raw.trim())
  if (['infinito', '∞'].includes(token)) return 'infinite'
  if (['no aplica', 'n/a'].includes(token)) return 'not_applicable'
  if (['no registrado', 'n/r'].includes(token)) return 'not_recorded'
  return raw.trim()
}

interface LocatedValue { value: string; confidence: number; region: SourceRegion | null }

function numericFragments(page: ExtractedPage) {
  return page.lines.flatMap((line) => [...line.text.matchAll(/[+-]?(?:\d+(?:[.,]\d+)?|[.,]\d+)\s*%?/g)].flatMap((match) => {
    if (match.index === undefined) return []
    const value = match[0].trim()
    const normalized = parseLocaleNumber(value)
    if (normalized === null) return []
    const characterWidth = line.region.width / Math.max(1, line.text.length)
    return [{
      raw: value,
      value: normalized,
      confidence: line.confidence / 100,
      region: {
        x: line.region.x + characterWidth * match.index,
        y: line.region.y,
        width: Math.max(.008, characterWidth * value.length),
        height: line.region.height,
      },
    }]
  }))
}

function valuesByHorizontalPosition(page: ExtractedPage, bounds: SourceRegion) {
  const candidates = numericFragments(page)
    .filter((item) => item.value >= 0 && item.value <= 100 && item.region.x >= bounds.x && item.region.x <= bounds.x + bounds.width && item.region.y >= bounds.y && item.region.y <= bounds.y + bounds.height)
    .sort((a, b) => a.region.x - b.region.x || a.region.y - b.region.y)
  const columns: typeof candidates[] = []
  for (const candidate of candidates) {
    const column = columns.find((items) => Math.abs(items[0].region.x - candidate.region.x) < .025)
    if (column) column.push(candidate)
    else columns.push([candidate])
  }
  return columns.map((items) => items.sort((a, b) => a.region.y - b.region.y)[0]).sort((a, b) => a.region.x - b.region.x)
}

function positionalBapValue(definition: ExtractionFieldDefinition, page: ExtractedPage): LocatedValue | null {
  if (page.classification !== 'posturography') return null
  const dateLine = page.lines.find((line) => line.region.y > .78 && /\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/.test(line.text))
  if (definition.code === 'study_date' && dateLine) {
    return { value: dateLine.text.match(/\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/)?.[0] ?? '', confidence: dateLine.confidence / 100, region: dateLine.region }
  }
  if (definition.code === 'study_status') {
    const statusLine = page.lines.find((line) => /\b(?:finalizad[ao]|completad[ao]|pendiente)\b/i.test(fold(line.text)))
    if (statusLine) return { value: statusLine.text.trim(), confidence: statusLine.confidence / 100, region: statusLine.region }
  }

  const conditionIndex = definition.code.match(/^condition_([1-6])$/)?.[1]
  if (conditionIndex) {
    // En los informes BAP los valores se ubican arriba de las barras; las
    // condiciones con mejor puntaje quedan muy cerca del encabezado del gráfico.
    const values = valuesByHorizontalPosition(page, { x: .67, y: .10, width: .31, height: .42 })
    const candidate = values[Number(conditionIndex) - 1]
    if (candidate) return { value: candidate.raw, confidence: Math.min(candidate.confidence, .72), region: candidate.region }
  }
  if (definition.code === 'composite_score') {
    const values = valuesByHorizontalPosition(page, { x: .67, y: .10, width: .31, height: .42 })
    const candidate = values[6]
    if (candidate) return { value: candidate.raw, confidence: Math.min(candidate.confidence, .72), region: candidate.region }
  }

  const sensoryCodes = ['sensory_somatosensory', 'sensory_visual', 'sensory_vestibular', 'visual_preference']
  const sensoryIndex = sensoryCodes.indexOf(definition.code)
  if (sensoryIndex >= 0) {
    const values = valuesByHorizontalPosition(page, { x: .67, y: .56, width: .31, height: .34 })
    const candidate = values[sensoryIndex]
    if (candidate) return { value: candidate.raw, confidence: Math.min(candidate.confidence, .68), region: candidate.region }
  }
  return null
}

function findDefinitionValue(definition: ExtractionFieldDefinition, page: ExtractedPage): LocatedValue | null {
  for (const line of page.lines) {
    for (const alias of definition.aliases) {
      const value = lineValue(line.text, alias)
      if (value) return { value: compactCandidate(definition, value), confidence: line.confidence / 100, region: line.region }
    }
  }
  for (const textLine of page.text.split(/\r?\n/)) {
    for (const alias of definition.aliases) {
      const value = lineValue(textLine, alias)
      if (value) return { value: compactCandidate(definition, value), confidence: page.classificationConfidence * .95, region: null }
    }
  }
  for (const alias of definition.aliases) {
    const value = lineValue(page.text, alias)
    if (value) return { value: compactCandidate(definition, value), confidence: page.classificationConfidence * .8, region: null }
  }
  return positionalBapValue(definition, page)
}

export function extractFields(pages: ExtractedPage[], intakeKind: IntakeKind): ExtractedField[] {
  const definitions = intakeKind === 'posturography_bap' ? posturographyFieldDefinitions : [...vestibularFieldDefinitions, ...posturographyFieldDefinitions]
  return definitions.map((definition) => {
    const relevantPages = pages.filter((page) => definition.studyType === 'posturography' ? page.classification === 'posturography' : ['vestibular_report', 'vhit_graph', 'referral', 'other_clinical'].includes(page.classification))
    const found = relevantPages.map((page) => ({ page, found: findDefinitionValue(definition, page) })).find((candidate) => candidate.found)
    const value = found?.found?.value ?? ''
    const confidence = found?.found?.confidence ?? 0
    return {
      clientId: crypto.randomUUID(), code: definition.code, label: definition.label, group: definition.group,
      studyType: definition.studyType, required: Boolean(definition.required), metricCode: definition.metricCode ?? '',
      rawValue: value, normalizedValue: normalizedValue(value), unitCode: definition.unitCode ?? '', conditionCode: definition.conditionCode ?? '', side: definition.side ?? '',
      pageNumber: found?.page.pageNumber ?? (relevantPages[0]?.pageNumber ?? 1), region: found?.found?.region as SourceRegion | null ?? null,
      confidence, status: !value ? 'unrecognized' : confidence >= .82 ? 'read' : 'review', extractorMethod: 'local_ocr' as const,
      extractorVersion: EXTRACTOR_VERSION, professionalValue: value, confirmed: false,
    }
  })
}

export interface PatientIdentityForMatch { fullName: string; birthDate: string; affiliateNumber: string; insurer?: string }

export function comparePatientIdentity(pages: ExtractedPage[], patient: PatientIdentityForMatch): { status: PatientMatchStatus; mismatchFields: string[] } {
  const text = fold(pages.map((page) => page.text).join('\n'))
  const mismatches: string[] = []
  const normalizedName = fold(patient.fullName).replace(/\s+/g, ' ').trim()
  const nameWords = normalizedName.split(' ').filter((word) => word.length > 2)
  const documentHasIdentity = /(?:paciente|nombre|fecha de nacimiento|cedula|afiliad)/.test(text)
  if (!documentHasIdentity) return { status: 'not_checked', mismatchFields: [] }
  if (nameWords.length && nameWords.filter((word) => text.includes(word)).length < Math.min(2, nameWords.length)) mismatches.push('name')
  if (patient.birthDate) {
    const [year, month, day] = patient.birthDate.split('-')
    const variants = [`${day}/${month}/${year}`, `${day}-${month}-${year}`, patient.birthDate]
    if (/fecha de nacimiento|nacimiento/.test(text) && !variants.some((value) => text.includes(value))) mismatches.push('birth_date')
  }
  if (patient.affiliateNumber && /afiliad/.test(text) && !text.includes(fold(patient.affiliateNumber))) mismatches.push('affiliate_number')
  if (patient.insurer && /(?:mutualista|aseguradora|seguro de salud)/.test(text) && !text.includes(fold(patient.insurer))) mismatches.push('insurer')
  return { status: mismatches.length ? 'mismatch' : 'match', mismatchFields: mismatches }
}
