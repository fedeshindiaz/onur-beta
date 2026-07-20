import { describe, expect, it } from 'vitest'
import { calculateSaccadePosition, calculateTrackingPosition } from './engine'

describe('motor de posiciones del ejercicio', () => {
  it('mantiene el seguimiento vertical centrado en el eje horizontal', () => {
    const point = calculateTrackingPosition(0.25, 1000, 500, 'vertical', 1, 30)
    expect(point.x).toBe(500)
    expect(point.y).toBeCloseTo(400)
  })

  it.each([
    ['diagonal_down', 1],
    ['diagonal_up', -1],
  ] as const)('mueve el blanco sobre el eje %s sin aumentar artificialmente la amplitud', (direction, ySign) => {
    const point = calculateTrackingPosition(0.25, 1000, 500, direction, 1, 20)
    expect(point.x).toBeCloseTo(500 + 200 * Math.SQRT1_2)
    expect(point.y).toBeCloseTo(250 + 100 * Math.SQRT1_2 * ySign)
  })

  it('alterna sacadas horizontales según la frecuencia indicada', () => {
    const first = calculateSaccadePosition(0, 1000, 500, 1, 'horizontal', 25)
    const second = calculateSaccadePosition(1, 1000, 500, 1, 'horizontal', 25)
    expect(first).toEqual({ x: 250, y: 250 })
    expect(second).toEqual({ x: 750, y: 250 })
  })

  it('produce posiciones aleatorias deterministas para una misma etapa', () => {
    const first = calculateSaccadePosition(3.2, 1000, 500, 0.8, 'random', 30)
    const second = calculateSaccadePosition(3.2, 1000, 500, 0.8, 'random', 30)
    expect(first).toEqual(second)
  })

  it.each([
    ['diagonal_down', 1],
    ['diagonal_up', -1],
  ] as const)('alterna sacadas sobre el eje %s', (pattern, ySign) => {
    const first = calculateSaccadePosition(0, 1000, 500, 1, pattern, 20)
    const second = calculateSaccadePosition(1, 1000, 500, 1, pattern, 20)
    expect(first.x).toBeLessThan(500)
    expect(second.x).toBeGreaterThan(500)
    expect(Math.sign(second.y - 250)).toBe(ySign)
  })
})
