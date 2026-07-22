import { useCallback, useEffect, useRef, useState } from 'react'
import { currentScreenOrientationAngle, quaternionFromDeviceOrientation, relativeHeadPose, requestCardboardTrackingPermission, type CardboardHeadPose, type Quaternion } from './cardboardTracking'

export type CardboardTrackingStatus = 'idle' | 'calibrating' | 'tracking' | 'denied' | 'unavailable' | 'lost'

export interface CardboardTrackingState {
  status: CardboardTrackingStatus
  pose: CardboardHeadPose | null
  recenterCount: number
  trackingLossCount: number
}

const CALIBRATION_MILLISECONDS = 600
const INITIAL_SIGNAL_TIMEOUT_MILLISECONDS = 2500
const TRACKING_LOSS_MILLISECONDS = 1500

export function useCardboardHeadTracking(enabled: boolean) {
  const [generation, setGeneration] = useState(0)
  const [state, setState] = useState<CardboardTrackingState>({ status: enabled ? 'calibrating' : 'idle', pose: null, recenterCount: 0, trackingLossCount: 0 })
  const statusRef = useRef<CardboardTrackingStatus>(enabled ? 'calibrating' : 'idle')
  const referenceRef = useRef<Quaternion | null>(null)
  const latestRef = useRef<Quaternion | null>(null)
  const calibrationStartedRef = useRef(0)
  const lastEventRef = useRef(0)
  const recenterCountRef = useRef(0)
  const lossCountRef = useRef(0)

  const updateStatus = useCallback((status: CardboardTrackingStatus, pose: CardboardHeadPose | null = null) => {
    statusRef.current = status
    setState({ status, pose, recenterCount: recenterCountRef.current, trackingLossCount: lossCountRef.current })
  }, [])

  const beginCalibration = useCallback((countRecenter = false) => {
    if (countRecenter) recenterCountRef.current += 1
    referenceRef.current = latestRef.current
    calibrationStartedRef.current = performance.now()
    updateStatus('calibrating')
  }, [updateStatus])

  const requestAndRecenter = useCallback(async () => {
    const permission = await requestCardboardTrackingPermission()
    if (permission === 'denied') return updateStatus('denied')
    if (permission === 'unsupported' || permission === 'insecure') return updateStatus('unavailable')
    latestRef.current = null
    referenceRef.current = null
    calibrationStartedRef.current = 0
    lastEventRef.current = 0
    setGeneration((value) => value + 1)
  }, [updateStatus])

  useEffect(() => {
    if (!enabled) {
      updateStatus('idle')
      return
    }
    if (!window.isSecureContext && !['localhost', '127.0.0.1'].includes(window.location.hostname)) {
      updateStatus('unavailable')
      return
    }
    if (!window.DeviceOrientationEvent) {
      updateStatus('unavailable')
      return
    }

    const startedAt = performance.now()
    calibrationStartedRef.current = startedAt
    updateStatus('calibrating')

    const handleOrientation = (event: DeviceOrientationEvent) => {
      if (event.alpha === null || event.beta === null || event.gamma === null) return
      const now = performance.now()
      const quaternion = quaternionFromDeviceOrientation(event.alpha, event.beta, event.gamma, currentScreenOrientationAngle())
      latestRef.current = quaternion
      lastEventRef.current = now

      if (statusRef.current === 'lost' || statusRef.current === 'unavailable' || statusRef.current === 'denied') return
      if (!referenceRef.current || statusRef.current === 'calibrating') {
        referenceRef.current = quaternion
        if (now - calibrationStartedRef.current < CALIBRATION_MILLISECONDS) return
        updateStatus('tracking', relativeHeadPose(quaternion, quaternion, event.absolute, now))
        return
      }
      updateStatus('tracking', relativeHeadPose(referenceRef.current, quaternion, event.absolute, now))
    }

    window.addEventListener('deviceorientation', handleOrientation)
    const monitor = window.setInterval(() => {
      const now = performance.now()
      if (lastEventRef.current === 0 && now - startedAt >= INITIAL_SIGNAL_TIMEOUT_MILLISECONDS) {
        updateStatus('unavailable')
        return
      }
      if (statusRef.current === 'tracking' && now - lastEventRef.current >= TRACKING_LOSS_MILLISECONDS) {
        lossCountRef.current += 1
        updateStatus('lost')
      }
    }, 250)

    return () => {
      window.removeEventListener('deviceorientation', handleOrientation)
      window.clearInterval(monitor)
    }
  }, [enabled, generation, updateStatus])

  const recenter = useCallback(() => {
    if (!latestRef.current) return void requestAndRecenter()
    beginCalibration(true)
  }, [beginCalibration, requestAndRecenter])

  return { ...state, recenter, requestAndRecenter }
}
