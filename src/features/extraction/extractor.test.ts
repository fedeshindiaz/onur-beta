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

  it('lee panel BAP compacto y porcentajes ubicados por columna', () => {
    const bapPage: ExtractedPage = {
      ...page('Posturografía BAP\nPorcent. de condiciones\nTest de organización sensorial', 'posturography'),
      lines: [
        { text: 'Adel = -07,73   Atrás = 04,31', confidence: 91, region: { x: .02, y: .27, width: .2, height: .03 } },
        { text: 'Izqui = -03,37   Derech = 03,02', confidence: 90, region: { x: .02, y: .31, width: .2, height: .03 } },
        { text: '17/7/2026', confidence: 96, region: { x: .61, y: .91, width: .08, height: .02 } },
        // Las etiquetas del eje Y no son condiciones y no deben desplazar
        // las siete lecturas BAP (C1..C6 y Compuesto).
        ...[100, 80, 60].map((value, index) => ({ text: String(value), confidence: 88, region: { x: .685, y: .16 + index * .08, width: .02, height: .02 } })),
        // En un BAP, los puntajes altos aparecen arriba de cada barra.
        ...[90, 99, 98, 82, 79, 27, 81].map((value, index) => ({ text: String(value), confidence: 88, region: { x: .71 + index * .043, y: .14 + index * .01, width: .025, height: .02 } })),
        ...[100, 82, 80, 70].map((value, index) => ({ text: String(value), confidence: 86, region: { x: .72 + index * .07, y: .65 + index * .01, width: .03, height: .02 } })),
      ],
    }
    const fields = extractFields([bapPage], 'posturography_bap')
    expect(fields.find((field) => field.code === 'los_forward')).toMatchObject({ rawValue: '-07,73', normalizedValue: '-7.73' })
    expect(fields.find((field) => field.code === 'los_backward')).toMatchObject({ rawValue: '04,31', normalizedValue: '4.31' })
    expect(fields.find((field) => field.code === 'condition_1')).toMatchObject({ rawValue: '90', normalizedValue: '90', status: 'review' })
    expect(fields.find((field) => field.code === 'condition_4')).toMatchObject({ rawValue: '82', normalizedValue: '82' })
    expect(fields.find((field) => field.code === 'composite_score')).toMatchObject({ rawValue: '81', normalizedValue: '81' })
    expect(fields.find((field) => field.code === 'sensory_somatosensory')).toMatchObject({ rawValue: '100', normalizedValue: '100' })
    expect(fields.find((field) => field.code === 'study_date')).toMatchObject({ rawValue: '17/7/2026' })
  })

  it('conserva los cuatro valores Sway de BAP 2.3.2 sin confundir segundos con minutos', () => {
    const fields = extractFields([page('Posturografía BAP\nSway/s X = 3 · Sway/m X = 204\nSway/s Y = 4 · Sway/m Y = 252\nPatrón Afis. = 27,5 %\nScore LOS = 100,0 %', 'posturography')], 'posturography_bap')

    expect(fields.find((field) => field.code === 'sway_per_second_x')).toMatchObject({ rawValue: '3', metricCode: 'sway_per_second_x', unitCode: 'oscillations_per_second' })
    expect(fields.find((field) => field.code === 'sway_per_second_y')).toMatchObject({ rawValue: '4', metricCode: 'sway_per_second_y', unitCode: 'oscillations_per_second' })
    expect(fields.find((field) => field.code === 'sway_per_minute_x')).toMatchObject({ rawValue: '204', metricCode: 'sway_per_minute_x', unitCode: 'oscillations_per_minute' })
    expect(fields.find((field) => field.code === 'sway_per_minute_y')).toMatchObject({ rawValue: '252', metricCode: 'sway_per_minute_y', unitCode: 'oscillations_per_minute' })
    expect(fields.find((field) => field.code === 'afis_pattern')).toMatchObject({ rawValue: '27,5 %', metricCode: 'aphysiological_pattern', unitCode: 'percent' })
    expect(fields.find((field) => field.code === 'los_score')).toMatchObject({ rawValue: '100,0 %', unitCode: 'percent' })
  })

  it('define seis condiciones BAP y no convierte los iconos 7 y 8 en condiciones', () => {
    const fields = extractFields([page('Posturografía BAP', 'posturography')], 'posturography_bap')
    expect(fields.filter((field) => /^condition_\d+$/.test(field.code))).toHaveLength(6)
    expect(fields.some((field) => field.code === 'condition_7' || field.code === 'condition_8')).toBe(false)
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
