import { describe, expect, it, vi } from 'vitest'
import { classifyPage, comparePatientIdentity, extractFields } from './extractor'
import type { ExtractedPage, PageClassification } from './types'

function page(text: string, classification: PageClassification, confidence = .94): ExtractedPage {
  return { pageNumber: 1, proposedClassification: classification, classification, classificationConfidence: confidence, rotationDegrees: 0, width: 1000, height: 1400, previewUrl: '', text, lines: text.split('\n').map((line, index) => ({ text: line, confidence: confidence * 100, region: { x: .05, y: index * .04, width: .8, height: .03 } })) }
}

describe('clasificación clínica local', () => {
  it.each([
    ['Posturografía BAP organización sensorial Score LOS Sway', 'posturography'],
    ['Informe vestibular Antecedentes Supresión visual Head Shaking Test En suma', 'vestibular_report'],
    ['vHIT HIMP SHIMP gain curva canal horizontal', 'vhit_graph'],
    ['Orden médica Motivo de derivación Solicito evaluación', 'referral'],
    ['Informe clínico Paciente Examen clínico', 'other_clinical'],
    ['ALFA 123 BETA XYZ', 'unrecognized'],
  ])('clasifica %s', (text, expected) => expect(classifyPage(text).classification).toBe(expected))

  it('no escribe el texto clínico en consola', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined)
    const sensitiveSyntheticMarker = 'MARCADOR-SINTETICO-NO-LOG'
    classifyPage(`Posturografía BAP ${sensitiveSyntheticMarker}`)
    extractFields([page(`Condición 1: 82,5 %\nConclusión: ${sensitiveSyntheticMarker}`, 'posturography')], 'posturography_bap')
    expect(log).not.toHaveBeenCalled()
    log.mockRestore()
  })
})

describe('extracción literal revisable', () => {
  it('preserva coma decimal, negativos, porcentajes, infinito, No aplica y blancos', () => {
    const fields = extractFields([page('Adelante: 82,5 %\nIzquierda: -3,5 %\nÁrea: 12,4 cm2\nPatrón Afis: No aplica\nÍndice PPPD: ∞\nCondición 1: 91 %\nCondición 2: 86 %\nCondición 3: 73 %\nCondición 4: 64 %\nCondición 5:', 'posturography')], 'posturography_bap')
    expect(fields.find((field) => field.code === 'los_forward')).toMatchObject({ rawValue: '82,5 %', normalizedValue: '82.5' })
    expect(fields.find((field) => field.code === 'los_left')).toMatchObject({ rawValue: '-3,5 %', normalizedValue: '-3.5' })
    expect(fields.find((field) => field.code === 'los_area')).toMatchObject({ rawValue: '12,4 cm2', normalizedValue: '12.4' })
    expect(fields.find((field) => field.code === 'afis_pattern')).toMatchObject({ rawValue: 'No aplica', normalizedValue: 'not_applicable' })
    expect(fields.find((field) => field.code === 'pppd_index')).toMatchObject({ rawValue: '∞', normalizedValue: 'infinite' })
    expect(fields.find((field) => field.code === 'condition_1')).toMatchObject({ rawValue: '91 %', normalizedValue: '91' })
    expect(fields.find((field) => field.code === 'condition_5')).toMatchObject({ rawValue: '', status: 'unrecognized' })
  })

  it('extrae ganancias por lado sin interpretar curvas', () => {
    const fields = extractFields([page('vHIT curva canal horizontal\nGanancia derecha: 0,88\nGanancia izquierda: 0,82\nValor ilegible:', 'vhit_graph', .72)], 'vestibular_and_reports')
    expect(fields.find((field) => field.code === 'gain_right')).toMatchObject({ rawValue: '0,88', normalizedValue: '0.88', side: 'right', status: 'review' })
    expect(fields.find((field) => field.code === 'gain_left')).toMatchObject({ rawValue: '0,82', normalizedValue: '0.82', side: 'left' })
    expect(fields.some((field) => field.metricCode.includes('curve_interpretation'))).toBe(false)
  })

  it('marca OCR parcial y campos obligatorios faltantes sin inventarlos', () => {
    const fields = extractFields([page('Informe vestibular\nFecha del estudio: 17/07/2026\nConclusión:', 'vestibular_report', .58)], 'vestibular_and_reports')
    expect(fields.find((field) => field.code === 'study_date')?.status).toBe('review')
    expect(fields.find((field) => field.code === 'conclusion')).toMatchObject({ rawValue: '', required: true, status: 'unrecognized' })
  })
})

describe('coincidencia de paciente', () => {
  it('detecta discrepancia sin cambiar el paciente ni devolver los valores del documento', () => {
    const result = comparePatientIdentity([page('Paciente: CASO DIFERENTE\nFecha de nacimiento: 02/02/1999', 'other_clinical')], { fullName: 'PACIENTE FICTICIO', birthDate: '2000-01-01', affiliateNumber: '' })
    expect(result).toEqual({ status: 'mismatch', mismatchFields: ['name', 'birth_date'] })
  })

  it('permite continuar sin inferir cuando no hay identidad legible', () => {
    expect(comparePatientIdentity([page('Gráfico parcialmente ilegible', 'unrecognized')], { fullName: 'PACIENTE FICTICIO', birthDate: '', affiliateNumber: '' }).status).toBe('not_checked')
  })
})
