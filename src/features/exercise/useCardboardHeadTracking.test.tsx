import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useCardboardHeadTracking } from './useCardboardHeadTracking'

const originalDeviceOrientationEvent = window.DeviceOrientationEvent

function orientation(alpha: number, beta: number, gamma: number) {
  const event = new Event('deviceorientation')
  Object.defineProperties(event, {
    alpha: { value: alpha }, beta: { value: beta }, gamma: { value: gamma }, absolute: { value: false },
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
  it('calibra, sigue, detecta pérdida de señal y permite recentrar', () => {
    const { result } = renderHook(() => useCardboardHeadTracking(true))
    expect(result.current.status).toBe('calibrating')

    act(() => { orientation(0, 90, 0); vi.advanceTimersByTime(700); orientation(5, 90, 0) })
    expect(result.current.status).toBe('tracking')
    expect(result.current.pose).not.toBeNull()

    act(() => { vi.advanceTimersByTime(1750) })
    expect(result.current.status).toBe('lost')
    expect(result.current.trackingLossCount).toBe(1)

    act(() => { result.current.recenter() })
    expect(result.current.status).toBe('calibrating')
    expect(result.current.recenterCount).toBe(1)
  })

  it('se detiene si el navegador no entrega ninguna lectura', () => {
    const { result } = renderHook(() => useCardboardHeadTracking(true))
    act(() => { vi.advanceTimersByTime(2750) })
    expect(result.current.status).toBe('unavailable')
  })
})
