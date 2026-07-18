import { describe, expect, it } from 'vitest'
import { BapConditionRecorder, metricsFromBapDirectCapture, parseBapSerialFrame, summarizeBapDirectCapture, type BapConditionResult } from './bapDirect'

function hexFloat(value: number) {
  const bytes = new Uint8Array(4)
  new DataView(bytes.buffer).setFloat32(0, value, true)
  return [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

function frame(w: number, x: number, y: number, z: number) {
  return [w, x, y, z, 0].map(hexFloat).join(',')
}

function condition(index: 1 | 2 | 3 | 4 | 5 | 6, score: number): BapConditionResult {
  return { condition: index, durationSeconds: 10, sampleCount: 120, area: (94 * (100 - score)) / 100, score, swayPerSecondX: 3, swayPerSecondY: 4, swayPerMinuteX: 204, swayPerMinuteY: 252 }
}

describe('captura directa BAP 2.32', () => {
  it('decodifica las cuatro componentes flotantes hexadecimales de la trama serie', () => {
    expect(parseBapSerialFrame(frame(1, 0, 0, 0))).toEqual({ w: 1, x: 0, y: 0, z: 0 })
    expect(() => parseBapSerialFrame('sin-trama')).toThrow('incompleta')
    expect(() => parseBapSerialFrame('0000803f,00000000,00000000,00000000')).toThrow('incompleta')
  })

  it('calcula área, puntaje y sway desde una condición sintética', () => {
    const recorder = new BapConditionRecorder(1, 10)
    recorder.ingest({ w: 1, x: 0, y: 0, z: 0 }, 0)
    recorder.ingest({ w: Math.cos(.1), x: 0, y: Math.sin(.1), z: 0 }, 120)
    recorder.ingest({ w: Math.cos(.1), x: 0, y: -Math.sin(.1), z: 0 }, 240)
    recorder.ingest({ w: Math.cos(.08), x: 0, y: 0, z: Math.sin(.08) }, 360)
    const result = recorder.finish()
    expect(result.sampleCount).toBe(4)
    expect(result.area).toBeGreaterThan(0)
    expect(result.score).toBeGreaterThanOrEqual(0)
    expect(result.score).toBeLessThanOrEqual(100)
    // BAP trunca las oscilaciones/segundo y anualiza por separado a minuto.
    expect(result.swayPerSecondX).toBe(0)
    expect(result.swayPerMinuteX).toBe(12)
  })

  it('reproduce el compuesto y los cocientes BAP sin producir una interpretación clínica', () => {
    const summary = summarizeBapDirectCapture([condition(1, 99), condition(2, 99), condition(3, 98), condition(4, 82), condition(5, 79), condition(6, 27)])
    expect(summary.composite).toBeCloseTo(80.666, 2)
    expect(summary.somatosensory).toBe(100)
    expect(summary.visual).toBeCloseTo(82.828, 2)
    expect(summary.vestibular).toBeCloseTo(79.798, 2)
    expect(summary.visualPreference).toBeCloseTo(70.225, 2)
    const metrics = metricsFromBapDirectCapture(summary)
    expect(metrics.filter((item) => item.metricCode === 'condition_score')).toHaveLength(6)
    expect(metrics.filter((item) => item.metricCode === 'sway_per_second_x')).toHaveLength(6)
    expect(metrics.some((item) => item.metricCode === 'reported_conclusion')).toBe(false)
  })
})
