import { useEffect, useRef } from 'react'
import { renderExerciseFrame } from './engine'
import type { ExerciseConfig } from './types'

interface ExerciseCanvasProps {
  config: ExerciseConfig
  paused?: boolean
  className?: string
}

export function ExerciseCanvas({ config, paused = false, className = '' }: ExerciseCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const configRef = useRef(config)
  const pausedRef = useRef(paused)
  const elapsedRef = useRef(0)
  const previousTimeRef = useRef<number | null>(null)

  useEffect(() => {
    configRef.current = config
  }, [config])

  useEffect(() => {
    pausedRef.current = paused
    previousTimeRef.current = null
  }, [paused])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const context = canvas.getContext('2d')
    if (!context) return

    let animationFrame = 0
    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      const ratio = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.max(1, Math.round(rect.width * ratio))
      canvas.height = Math.max(1, Math.round(rect.height * ratio))
      context.setTransform(ratio, 0, 0, ratio, 0, 0)
    }
    const observer = new ResizeObserver(resize)
    observer.observe(canvas)
    resize()

    const draw = (time: number) => {
      const rect = canvas.getBoundingClientRect()
      if (!pausedRef.current) {
        if (previousTimeRef.current !== null) {
          elapsedRef.current += Math.min((time - previousTimeRef.current) / 1000, 0.1)
        }
        previousTimeRef.current = time
      }
      renderExerciseFrame(context, configRef.current, elapsedRef.current, rect.width, rect.height)
      animationFrame = requestAnimationFrame(draw)
    }
    animationFrame = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(animationFrame)
      observer.disconnect()
    }
  }, [])

  return <canvas ref={canvasRef} className={className} aria-label="Vista previa del ejercicio visual" />
}
