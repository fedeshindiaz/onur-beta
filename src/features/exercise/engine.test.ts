import { describe, expect, it } from 'vitest'
import { calculateSaccadePosition, calculateTrackingPosition } from './engine'

describe('motor de posiciones del ejercicio', () => {
  it('mantiene el seguimiento vertical centrado en el eje horizontal', () => {
    const point = calculateTrackingPosition(0.25, 1000, 500, 'vertical', 1, 30)
    expect(point.x).toBe(500)
    expect(point.y).toBeCloseTo(400)
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
})
