export interface Quaternion {
  x: number
  y: number
  z: number
  w: number
}

export interface CardboardHeadPose {
  yawRadians: number
  pitchRadians: number
  rollRadians: number
  absolute: boolean
  updatedAt: number
}

export interface CardboardCanvasTransform {
  offsetX: number
  offsetY: number
  rotationRadians: number
}

export type CardboardTrackingPermission = 'granted' | 'denied' | 'unsupported' | 'insecure'

type DeviceOrientationConstructor = typeof DeviceOrientationEvent & {
  requestPermission?: (absolute?: boolean) => Promise<'granted' | 'denied'>
}

const DEG_TO_RAD = Math.PI / 180
const HALF_PI = Math.PI / 2

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value))
}

export function normalizeQuaternion(quaternion: Quaternion): Quaternion {
  const length = Math.hypot(quaternion.x, quaternion.y, quaternion.z, quaternion.w) || 1
  return { x: quaternion.x / length, y: quaternion.y / length, z: quaternion.z / length, w: quaternion.w / length }
}

export function multiplyQuaternions(left: Quaternion, right: Quaternion): Quaternion {
  return normalizeQuaternion({
    x: left.w * right.x + left.x * right.w + left.y * right.z - left.z * right.y,
    y: left.w * right.y - left.x * right.z + left.y * right.w + left.z * right.x,
    z: left.w * right.z + left.x * right.y - left.y * right.x + left.z * right.w,
    w: left.w * right.w - left.x * right.x - left.y * right.y - left.z * right.z,
  })
}

export function quaternionFromAxisAngle(axis: { x: number; y: number; z: number }, radians: number): Quaternion {
  const axisLength = Math.hypot(axis.x, axis.y, axis.z) || 1
  const sine = Math.sin(radians / 2)
  return normalizeQuaternion({
    x: axis.x / axisLength * sine,
    y: axis.y / axisLength * sine,
    z: axis.z / axisLength * sine,
    w: Math.cos(radians / 2),
  })
}

function quaternionFromEulerYXZ(x: number, y: number, z: number): Quaternion {
  const c1 = Math.cos(x / 2)
  const c2 = Math.cos(y / 2)
  const c3 = Math.cos(z / 2)
  const s1 = Math.sin(x / 2)
  const s2 = Math.sin(y / 2)
  const s3 = Math.sin(z / 2)
  return normalizeQuaternion({
    x: s1 * c2 * c3 + c1 * s2 * s3,
    y: c1 * s2 * c3 - s1 * c2 * s3,
    z: c1 * c2 * s3 - s1 * s2 * c3,
    w: c1 * c2 * c3 + s1 * s2 * s3,
  })
}

export function quaternionFromDeviceOrientation(alphaDegrees: number, betaDegrees: number, gammaDegrees: number, screenAngleDegrees = 0): Quaternion {
  const deviceRotation = quaternionFromEulerYXZ(betaDegrees * DEG_TO_RAD, alphaDegrees * DEG_TO_RAD, -gammaDegrees * DEG_TO_RAD)
  const cameraAlignment = quaternionFromAxisAngle({ x: 1, y: 0, z: 0 }, -HALF_PI)
  const screenAlignment = quaternionFromAxisAngle({ x: 0, y: 0, z: 1 }, -screenAngleDegrees * DEG_TO_RAD)
  return multiplyQuaternions(multiplyQuaternions(deviceRotation, cameraAlignment), screenAlignment)
}

function inverseQuaternion(quaternion: Quaternion): Quaternion {
  const normalized = normalizeQuaternion(quaternion)
  return { x: -normalized.x, y: -normalized.y, z: -normalized.z, w: normalized.w }
}

function rotateVector(quaternion: Quaternion, vector: { x: number; y: number; z: number }) {
  const vectorQuaternion: Quaternion = { ...vector, w: 0 }
  const rotated = multiplyQuaternions(multiplyQuaternions(quaternion, vectorQuaternion), inverseQuaternion(quaternion))
  return { x: rotated.x, y: rotated.y, z: rotated.z }
}

export function relativeHeadPose(reference: Quaternion, current: Quaternion, absolute = false, updatedAt = performance.now()): CardboardHeadPose {
  const relative = multiplyQuaternions(inverseQuaternion(reference), current)
  const forward = rotateVector(relative, { x: 0, y: 0, z: -1 })
  const up = rotateVector(relative, { x: 0, y: 1, z: 0 })
  return {
    yawRadians: Math.atan2(-forward.x, -forward.z),
    pitchRadians: Math.asin(clamp(forward.y, -1, 1)),
    rollRadians: Math.atan2(-up.x, up.y),
    absolute,
    updatedAt,
  }
}

export function headPoseToCanvasTransform(pose: CardboardHeadPose, width: number, height: number): CardboardCanvasTransform {
  const yaw = clamp(pose.yawRadians, -Math.PI / 3, Math.PI / 3)
  const pitch = clamp(pose.pitchRadians, -Math.PI / 3, Math.PI / 3)
  const horizontalFov = 90 * DEG_TO_RAD
  const verticalFov = 80 * DEG_TO_RAD
  return {
    offsetX: clamp(-Math.tan(yaw) / Math.tan(horizontalFov / 2) * width / 2, -width * 1.5, width * 1.5),
    offsetY: clamp(Math.tan(pitch) / Math.tan(verticalFov / 2) * height / 2, -height * 1.5, height * 1.5),
    rotationRadians: -pose.rollRadians,
  }
}

export function currentScreenOrientationAngle() {
  const angle = screen.orientation?.angle
  if (typeof angle === 'number') return angle
  const legacyOrientation = (window as Window & { orientation?: number }).orientation
  return typeof legacyOrientation === 'number' ? legacyOrientation : 0
}

export async function requestCardboardTrackingPermission(): Promise<CardboardTrackingPermission> {
  if (!window.isSecureContext && !['localhost', '127.0.0.1'].includes(window.location.hostname)) return 'insecure'
  const constructor = window.DeviceOrientationEvent as DeviceOrientationConstructor | undefined
  if (!constructor) return 'unsupported'
  if (typeof constructor.requestPermission !== 'function') return 'granted'
  try {
    return await constructor.requestPermission(false)
  } catch {
    return 'denied'
  }
}
