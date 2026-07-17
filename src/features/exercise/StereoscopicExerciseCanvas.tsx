import { useEffect, useRef } from 'react'
import { renderExerciseFrame } from './engine'
import type { ExerciseConfig } from './types'

export function StereoscopicExerciseCanvas({ config, paused = false }: { config: ExerciseConfig; paused?: boolean }) {
  const leftRef = useRef<HTMLCanvasElement>(null)
  const rightRef = useRef<HTMLCanvasElement>(null)
  const configRef = useRef(config)
  const pausedRef = useRef(paused)
  const elapsedRef = useRef(0)
  const previousTimeRef = useRef<number | null>(null)

  useEffect(() => { configRef.current = config }, [config])
  useEffect(() => { pausedRef.current = paused; previousTimeRef.current = null }, [paused])

  useEffect(() => {
    const canvases = [leftRef.current, rightRef.current].filter((canvas): canvas is HTMLCanvasElement => Boolean(canvas))
    if (canvases.length !== 2) return
    const contexts = canvases.map((canvas) => canvas.getContext('2d'))
    if (contexts.some((context) => !context)) return
    let animationFrame = 0

    const resize = () => canvases.forEach((canvas, index) => {
      const context = contexts[index]!
      const rect = canvas.getBoundingClientRect()
      const ratio = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.max(1, Math.round(rect.width * ratio))
      canvas.height = Math.max(1, Math.round(rect.height * ratio))
      context.setTransform(ratio, 0, 0, ratio, 0, 0)
    })
    const observer = new ResizeObserver(resize)
    canvases.forEach((canvas) => observer.observe(canvas))
    resize()

    const draw = (time: number) => {
      if (!pausedRef.current) {
        if (previousTimeRef.current !== null) elapsedRef.current += Math.min((time - previousTimeRef.current) / 1000, 0.1)
        previousTimeRef.current = time
      }
      canvases.forEach((canvas, index) => {
        const rect = canvas.getBoundingClientRect()
        renderExerciseFrame(contexts[index]!, configRef.current, elapsedRef.current, rect.width, rect.height)
      })
      animationFrame = requestAnimationFrame(draw)
    }
    animationFrame = requestAnimationFrame(draw)
    return () => { cancelAnimationFrame(animationFrame); observer.disconnect() }
  }, [])

  return <div className="absolute inset-0 grid grid-cols-2 bg-black" aria-label="Vista estereoscópica para visor de celular">
    <canvas ref={leftRef} className="h-full w-full border-r-2 border-black" aria-label="Vista izquierda"/>
    <canvas ref={rightRef} className="h-full w-full border-l-2 border-black" aria-label="Vista derecha"/>
    <div className="pointer-events-none absolute left-1/2 top-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/45"/>
  </div>
}
