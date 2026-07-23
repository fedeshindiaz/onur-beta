import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useCardboardHeadTracking } from './useCardboardHeadTracking'

const originalDeviceOrientationEvent = window.DeviceOrientationEvent

function orientation(alpha: number, beta: number, gamma: number, eventName: 'deviceorientation' | 'deviceorientationabsolute' = 'deviceorientation') {
  const event = new Event(eventName)
  Object.defineProperties(event, {
    alpha: { value: alpha }, beta: { value: beta }, gamma: { value: gamma }, absolute: { value: eventName === 'deviceorientationabsolute' },
  })
  window.dispatchEvent(event)
}

beforeEach(() => {
  vi.useFakeTimers()
  Object.defineProperty(window, 'DeviceOrientationEvent', { configurable: true, value: function DeviceOrientationEvent() {} })
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  Object.defineProperty(window, 'DeviceOrientationEvent', { configurable: true, value: originalDeviceOrientationEvent })
})

describe('ciclo de vida del seguimiento Cardboard', () => {
  it('espera la preparación y recién después calibra con una ventana estable', () => {
    const { result, rerender } = renderHook(({ ready }) => useCardboardHeadTracking(true, ready), { initialProps: { ready: false } })
    expect(result.current.status).toBe('waiting')
    act(() => { orientation(0, 90, 0); vi.advanceTimersByTime(1_500) })
    expect(result.current.status).toBe('waiting')

    rerender({ ready: true })
    expect(result.current.status).toBe('calibrating')
    act(() => {
      for (let index = 0; index < 12; index += 1) {
        orientation(0.2, 90, 0)
        vi.advanceTimersByTime(100)
      }
    })
    expect(result.current.status).toBe('tracking')
    expect(result.current.calibrationProgress).toBe(1)
  })

  it('reinicia la ventana si la cabeza se mueve y luego permite recentrar', () => {
    const { result } = renderHook(() => useCardboardHeadTracking(true))
    act(() => {
      orientation(0, 90, 0)
      vi.advanceTimersByTime(500)
      orientation(15, 90, 0)
    })
    expect(result.current.status).toBe('calibrating')
    expect(result.current.calibrationProgress).toBe(0)

    act(() => {
      for (let index = 0; index < 12; index += 1) {
        orientation(15, 90, 0)
        vi.advanceTimersByTime(100)
      }
    })
    expect(result.current.status).toBe('tracking')
    expect(result.current.pose).not.toBeNull()

    act(() => { vi.advanceTimersByTime(2750) })
    expect(result.current.status).toBe('lost')
    expect(result.current.trackingLossCount).toBe(1)

    act(() => { result.current.recenter() })
    expect(result.current.status).toBe('calibrating')
    expect(result.current.recenterCount).toBe(1)
  })

  it('se detiene si el navegador no entrega ninguna lectura', () => {
    const { result } = renderHook(() => useCardboardHeadTracking(true))
    act(() => { vi.advanceTimersByTime(8250) })
    expect(result.current.status).toBe('unavailable')
    expect(result.current.failureReason).toBe('no_sensor_signal')
  })

  it('no declara un fallo mientras el paciente todavía está colocando el visor', () => {
    const { result } = renderHook(() => useCardboardHeadTracking(true, false))
    act(() => { vi.advanceTimersByTime(20_000) })
    expect(result.current.status).toBe('waiting')
    expect(result.current.failureReason).toBeNull()
  })

  it('acepta deviceorientationabsolute como respaldo en Android', () => {
    const { result } = renderHook(() => useCardboardHeadTracking(true))
    act(() => {
      for (let index = 0; index < 12; index += 1) {
        orientation(0, 90, 0, 'deviceorientationabsolute')
        vi.advanceTimersByTime(100)
      }
    })
    expect(result.current.status).toBe('tracking')
    expect(result.current.pose?.absolute).toBe(true)
  })

  it('recalibra si cambia la orientación física de la pantalla', () => {
    const { result } = renderHook(() => useCardboardHeadTracking(true))
    act(() => {
      for (let index = 0; index < 12; index += 1) {
        orientation(0, 90, 0)
        vi.advanceTimersByTime(100)
      }
    })
    expect(result.current.status).toBe('tracking')
    act(() => { window.dispatchEvent(new Event('orientationchange')) })
    expect(result.current.status).toBe('calibrating')
    expect(result.current.recenterCount).toBe(1)
  })
})
