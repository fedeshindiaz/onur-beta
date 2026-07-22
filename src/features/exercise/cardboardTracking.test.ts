import { describe, expect, it } from 'vitest'
import { headPoseToCanvasTransform, quaternionFromAxisAngle, relativeHeadPose } from './cardboardTracking'

const identity = { x: 0, y: 0, z: 0, w: 1 }

describe('seguimiento Cardboard 3DoF', () => {
  it('calibra la orientación actual como origen angular', () => {
    const pose = relativeHeadPose(identity, identity, false, 10)
    expect(Math.abs(pose.yawRadians)).toBe(0)
    expect(Math.abs(pose.pitchRadians)).toBe(0)
    expect(Math.abs(pose.rollRadians)).toBe(0)
    expect(pose.updatedAt).toBe(10)
  })

  it('recupera yaw, pitch y roll desde la orientación relativa', () => {
    expect(relativeHeadPose(identity, quaternionFromAxisAngle({ x: 0, y: 1, z: 0 }, Math.PI / 6)).yawRadians).toBeCloseTo(Math.PI / 6, 5)
    expect(relativeHeadPose(identity, quaternionFromAxisAngle({ x: 1, y: 0, z: 0 }, Math.PI / 8)).pitchRadians).toBeCloseTo(Math.PI / 8, 5)
    expect(relativeHeadPose(identity, quaternionFromAxisAngle({ x: 0, y: 0, z: 1 }, Math.PI / 10)).rollRadians).toBeCloseTo(Math.PI / 10, 5)
  })

  it('contrarresta el giro de cabeza para mantener la dirección virtual', () => {
    const transform = headPoseToCanvasTransform({ yawRadians: Math.PI / 12, pitchRadians: Math.PI / 18, rollRadians: Math.PI / 20, absolute: false, updatedAt: 0 }, 400, 300)
    expect(transform.offsetX).toBeLessThan(0)
    expect(transform.offsetY).toBeGreaterThan(0)
    expect(transform.rotationRadians).toBeCloseTo(-Math.PI / 20, 5)
  })
})
