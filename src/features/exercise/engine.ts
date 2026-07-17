import type { ExerciseConfig, SaccadePattern } from './types'

export interface Point {
  x: number
  y: number
}

function positiveModulo(value: number, divisor: number) {
  return ((value % divisor) + divisor) % divisor
}

function deterministicUnit(seed: number) {
  const value = Math.sin(seed * 12.9898 + 78.233) * 43758.5453
  return value - Math.floor(value)
}

export function calculateTrackingPosition(
  elapsedSeconds: number,
  width: number,
  height: number,
  direction: 'horizontal' | 'vertical',
  frequencyHz: number,
  amplitudePercent: number,
): Point {
  const center = { x: width / 2, y: height / 2 }
  const phase = Math.sin(elapsedSeconds * Math.PI * 2 * frequencyHz)
  const amplitude = (direction === 'horizontal' ? width : height) * (amplitudePercent / 100)
  return direction === 'horizontal'
    ? { x: center.x + phase * amplitude, y: center.y }
    : { x: center.x, y: center.y + phase * amplitude }
}

export function calculateSaccadePosition(
  elapsedSeconds: number,
  width: number,
  height: number,
  frequencyHz: number,
  pattern: SaccadePattern,
  amplitudePercent: number,
): Point {
  const step = Math.floor(elapsedSeconds * frequencyHz)
  const center = { x: width / 2, y: height / 2 }
  const horizontalAmplitude = width * (amplitudePercent / 100)
  const verticalAmplitude = height * (amplitudePercent / 100)

  if (pattern === 'horizontal') {
    return { x: center.x + (step % 2 === 0 ? -horizontalAmplitude : horizontalAmplitude), y: center.y }
  }
  if (pattern === 'vertical') {
    return { x: center.x, y: center.y + (step % 2 === 0 ? -verticalAmplitude : verticalAmplitude) }
  }
  return {
    x: center.x + (deterministicUnit(step + 1) * 2 - 1) * horizontalAmplitude,
    y: center.y + (deterministicUnit(step + 101) * 2 - 1) * verticalAmplitude,
  }
}

function drawBars(
  context: CanvasRenderingContext2D,
  config: ExerciseConfig,
  elapsedSeconds: number,
  width: number,
  height: number,
) {
  const stripe = Math.max(config.stripeWidth, 8)
  const period = stripe * 2
  const signedSpeed = ['left', 'up', 'counterclockwise'].includes(config.backgroundDirection)
    ? -config.backgroundSpeed
    : config.backgroundSpeed
  const offset = positiveModulo(elapsedSeconds * signedSpeed, period)
  context.fillStyle = config.foregroundColor

  if (config.backgroundDirection === 'up' || config.backgroundDirection === 'down') {
    for (let y = -period + offset; y < height + period; y += period) {
      context.fillRect(0, y, width, stripe)
    }
  } else {
    for (let x = -period + offset; x < width + period; x += period) {
      context.fillRect(x, 0, stripe, height)
    }
  }
}

function drawCheckerboard(
  context: CanvasRenderingContext2D,
  config: ExerciseConfig,
  elapsedSeconds: number,
  width: number,
  height: number,
) {
  const tile = Math.max(config.stripeWidth, 18)
  const signedSpeed = ['left', 'up'].includes(config.backgroundDirection) ? -config.backgroundSpeed : config.backgroundSpeed
  const horizontal = config.backgroundDirection === 'left' || config.backgroundDirection === 'right'
  const offset = positiveModulo(elapsedSeconds * signedSpeed, tile * 2)
  context.fillStyle = config.foregroundColor

  for (let row = -2; row < Math.ceil(height / tile) + 2; row += 1) {
    for (let column = -2; column < Math.ceil(width / tile) + 2; column += 1) {
      if ((row + column) % 2 !== 0) continue
      const x = column * tile + (horizontal ? offset : 0)
      const y = row * tile + (horizontal ? 0 : offset)
      context.fillRect(x, y, tile, tile)
    }
  }
}

function drawDots(
  context: CanvasRenderingContext2D,
  config: ExerciseConfig,
  elapsedSeconds: number,
  width: number,
  height: number,
) {
  const gap = Math.max(config.stripeWidth, 22)
  const radius = Math.max(3, gap * 0.12)
  const signedSpeed = ['left', 'up'].includes(config.backgroundDirection) ? -config.backgroundSpeed : config.backgroundSpeed
  const horizontal = config.backgroundDirection === 'left' || config.backgroundDirection === 'right'
  const offset = positiveModulo(elapsedSeconds * signedSpeed, gap)
  context.fillStyle = config.foregroundColor

  for (let y = -gap; y < height + gap; y += gap) {
    for (let x = -gap; x < width + gap; x += gap) {
      context.beginPath()
      context.arc(x + (horizontal ? offset : 0), y + (horizontal ? 0 : offset), radius, 0, Math.PI * 2)
      context.fill()
    }
  }
}

function drawSpiral(
  context: CanvasRenderingContext2D,
  config: ExerciseConfig,
  elapsedSeconds: number,
  width: number,
  height: number,
) {
  const direction = config.backgroundDirection === 'counterclockwise' ? -1 : 1
  const rotation = elapsedSeconds * direction * (config.backgroundSpeed / 45)
  const maxRadius = Math.hypot(width, height) * 0.62
  const lineWidth = Math.max(7, config.stripeWidth * 0.42)
  context.save()
  context.translate(width / 2, height / 2)
  context.rotate(rotation)
  context.strokeStyle = config.foregroundColor
  context.lineWidth = lineWidth
  context.lineCap = 'round'
  context.beginPath()
  for (let angle = 0; angle <= Math.PI * 16; angle += 0.08) {
    const radius = (angle / (Math.PI * 16)) * maxRadius
    const x = Math.cos(angle) * radius
    const y = Math.sin(angle) * radius
    if (angle === 0) context.moveTo(x, y)
    else context.lineTo(x, y)
  }
  context.stroke()
  context.restore()
}

export function renderExerciseFrame(
  context: CanvasRenderingContext2D,
  config: ExerciseConfig,
  elapsedSeconds: number,
  width: number,
  height: number,
) {
  context.clearRect(0, 0, width, height)
  context.fillStyle = config.backgroundColor
  context.fillRect(0, 0, width, height)

  if (config.backgroundType === 'bars') drawBars(context, config, elapsedSeconds, width, height)
  if (config.backgroundType === 'checkerboard') drawCheckerboard(context, config, elapsedSeconds, width, height)
  if (config.backgroundType === 'dots') drawDots(context, config, elapsedSeconds, width, height)
  if (config.backgroundType === 'spiral') drawSpiral(context, config, elapsedSeconds, width, height)

  if (!config.objectEnabled) return

  let objectPosition = { x: width / 2, y: height / 2 }
  if (config.objectMode === 'tracking') {
    objectPosition = calculateTrackingPosition(
      elapsedSeconds,
      width,
      height,
      config.objectDirection,
      config.objectSpeedHz,
      config.objectAmplitude,
    )
  }
  if (config.objectMode === 'saccades') {
    objectPosition = calculateSaccadePosition(
      elapsedSeconds,
      width,
      height,
      config.saccadeFrequencyHz,
      config.saccadePattern,
      config.objectAmplitude,
    )
  }

  context.beginPath()
  context.fillStyle = config.objectColor
  context.shadowColor = 'rgba(0,0,0,0.22)'
  context.shadowBlur = Math.max(6, config.objectSize * 0.25)
  context.arc(objectPosition.x, objectPosition.y, config.objectSize / 2, 0, Math.PI * 2)
  context.fill()
  context.shadowBlur = 0
}
