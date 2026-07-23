import { useCallback, useEffect, useRef, useState } from 'react'
import { averageQuaternions, currentScreenOrientationAngle, quaternionAngularDistance, quaternionFromDeviceOrientation, relativeHeadPose, requestCardboardTrackingPermission, type CardboardHeadPose, type Quaternion } from './cardboardTracking'

export type CardboardTrackingStatus = 'idle' | 'waiting' | 'calibrating' | 'tracking' | 'denied' | 'unavailable' | 'lost'

export interface CardboardTrackingState {
  status: CardboardTrackingStatus
  pose: CardboardHeadPose | null
  calibrationProgress: number
  recenterCount: number
  trackingLossCount: number
}

interface OrientationSample {
  quaternion: Quaternion
  at: number
}

const STABLE_WINDOW_MILLISECONDS = 1_000
const MINIMUM_STABLE_SAMPLES = 10
const MAXIMUM_STABLE_SPREAD_RADIANS = 2 * Math.PI / 180
const INITIAL_SIGNAL_TIMEOUT_MILLISECONDS = 2_500
const TRACKING_LOSS_MILLISECONDS = 1_500

export function useCardboardHeadTracking(enabled: boolean, calibrationReady = true) {
  const initialStatus: CardboardTrackingStatus = enabled ? calibrationReady ? 'calibrating' : 'waiting' : 'idle'
  const [generation, setGeneration] = useState(0)
  const [state, setState] = useState<CardboardTrackingState>({ status: initialStatus, pose: null, calibrationProgress: 0, recenterCount: 0, trackingLossCount: 0 })
  const statusRef = useRef<CardboardTrackingStatus>(initialStatus)
  const calibrationReadyRef = useRef(calibrationReady)
  const referenceRef = useRef<Quaternion | null>(null)
  const latestRef = useRef<Quaternion | null>(null)
  const samplesRef = useRef<OrientationSample[]>([])
  const lastEventRef = useRef(0)
  const recenterCountRef = useRef(0)
  const lossCountRef = useRef(0)

  const updateStatus = useCallback((status: CardboardTrackingStatus, pose: CardboardHeadPose | null = null, calibrationProgress = 0) => {
    statusRef.current = status
    setState({ status, pose, calibrationProgress, recenterCount: recenterCountRef.current, trackingLossCount: lossCountRef.current })
  }, [])

  const beginCalibration = useCallback((countRecenter = false) => {
    if (!enabled || !calibrationReadyRef.current) return updateStatus(enabled ? 'waiting' : 'idle')
    if (countRecenter) recenterCountRef.current += 1
    referenceRef.current = null
    samplesRef.current = []
    updateStatus('calibrating')
  }, [enabled, updateStatus])

  const requestAndRecenter = useCallback(async () => {
    const permission = await requestCardboardTrackingPermission()
    if (permission === 'denied') return updateStatus('denied')
    if (permission === 'unsupported' || permission === 'insecure') return updateStatus('unavailable')
    latestRef.current = null
    referenceRef.current = null
    samplesRef.current = []
    lastEventRef.current = 0
    updateStatus(calibrationReadyRef.current ? 'calibrating' : 'waiting')
    setGeneration((value) => value + 1)
  }, [updateStatus])

  useEffect(() => {
    calibrationReadyRef.current = calibrationReady
    if (!enabled) return updateStatus('idle')
    if (!calibrationReady) {
      referenceRef.current = null
      samplesRef.current = []
      updateStatus('waiting')
      return
    }
    beginCalibration(false)
  }, [beginCalibration, calibrationReady, enabled, updateStatus])

  useEffect(() => {
    if (!enabled) return
    if (!window.isSecureContext && !['localhost', '127.0.0.1'].includes(window.location.hostname)) {
      updateStatus('unavailable')
      return
    }
    if (!window.DeviceOrientationEvent) {
      updateStatus('unavailable')
      return
    }

    const startedAt = performance.now()

    const handleOrientation = (event: DeviceOrientationEvent) => {
      if (event.alpha === null || event.beta === null || event.gamma === null) return
      const now = performance.now()
      const quaternion = quaternionFromDeviceOrientation(event.alpha, event.beta, event.gamma, currentScreenOrientationAngle())
      latestRef.current = quaternion
      lastEventRef.current = now

      if (statusRef.current === 'waiting' || statusRef.current === 'lost' || statusRef.current === 'unavailable' || statusRef.current === 'denied' || statusRef.current === 'idle') return
      if (statusRef.current === 'calibrating') {
        const samples = [...samplesRef.current, { quaternion, at: now }].filter((sample) => now - sample.at <= STABLE_WINDOW_MILLISECONDS)
        samplesRef.current = samples
        const elapsed = samples.length > 1 ? samples.at(-1)!.at - samples[0].at : 0
        const average = averageQuaternions(samples.map((sample) => sample.quaternion))
        const maximumSpread = samples.reduce((maximum, sample) => Math.max(maximum, quaternionAngularDistance(average, sample.quaternion)), 0)
        if (maximumSpread > MAXIMUM_STABLE_SPREAD_RADIANS) {
          samplesRef.current = [{ quaternion, at: now }]
          updateStatus('calibrating')
          return
        }
        const progress = Math.min(1, elapsed / STABLE_WINDOW_MILLISECONDS)
        if (elapsed < STABLE_WINDOW_MILLISECONDS * 0.9 || samples.length < MINIMUM_STABLE_SAMPLES) {
          updateStatus('calibrating', null, progress)
          return
        }
        referenceRef.current = average
        updateStatus('tracking', relativeHeadPose(average, quaternion, event.absolute, now), 1)
        return
      }
      if (referenceRef.current) updateStatus('tracking', relativeHeadPose(referenceRef.current, quaternion, event.absolute, now), 1)
    }

    let lastOrientationChangeAt = Number.NEGATIVE_INFINITY
    const handleOrientationChange = () => {
      const now = performance.now()
      if (now - lastOrientationChangeAt < 250) return
      lastOrientationChangeAt = now
      if (calibrationReadyRef.current) beginCalibration(true)
    }
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        referenceRef.current = null
        samplesRef.current = []
        updateStatus('waiting')
      } else if (calibrationReadyRef.current) beginCalibration(true)
    }

    window.addEventListener('deviceorientation', handleOrientation)
    window.addEventListener('orientationchange', handleOrientationChange)
    screen.orientation?.addEventListener?.('change', handleOrientationChange)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    const monitor = window.setInterval(() => {
      const now = performance.now()
      if (lastEventRef.current === 0 && now - startedAt >= INITIAL_SIGNAL_TIMEOUT_MILLISECONDS) {
        updateStatus('unavailable')
        return
      }
      if ((statusRef.current === 'tracking' || statusRef.current === 'calibrating') && lastEventRef.current > 0 && now - lastEventRef.current >= TRACKING_LOSS_MILLISECONDS) {
        lossCountRef.current += 1
        referenceRef.current = null
        samplesRef.current = []
        updateStatus('lost')
      }
    }, 250)

    return () => {
      window.removeEventListener('deviceorientation', handleOrientation)
      window.removeEventListener('orientationchange', handleOrientationChange)
      screen.orientation?.removeEventListener?.('change', handleOrientationChange)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.clearInterval(monitor)
    }
  }, [beginCalibration, enabled, generation, updateStatus])

  const recenter = useCallback(() => {
    if (!latestRef.current) return void requestAndRecenter()
    beginCalibration(true)
  }, [beginCalibration, requestAndRecenter])

  return { ...state, recenter, requestAndRecenter }
}
