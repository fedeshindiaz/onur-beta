import { Clock3, Expand, LogOut, Pause, Play, SkipForward } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { ExerciseCanvas } from './ExerciseCanvas'
import { StereoscopicExerciseCanvas } from './StereoscopicExerciseCanvas'
import type { ExerciseConfig } from './types'

interface ExercisePlayerProps {
  config: ExerciseConfig
  onExit: () => void
  onSkip?: (activeSeconds: number) => void
  onComplete?: (activeSeconds: number) => void
  preparationSeconds?: number
}

function PreparationOverlay({ remaining, vrBox }: { remaining: number; vrBox: boolean }) {
  const content = (duplicate = false) => (
    <div className="flex h-full flex-col items-center justify-center px-4 text-center" aria-hidden={duplicate || undefined}>
      <Clock3 className="text-[#E49A02]" size={vrBox ? 26 : 38} />
      <p className="mt-4 text-[10px] font-black uppercase tracking-[0.2em] text-[#E49A02]">Preparación</p>
      <p className={`${vrBox ? 'mt-2 text-6xl' : 'mt-4 text-8xl'} font-black tabular-nums`}>{remaining}</p>
      <p className={`mt-3 max-w-xs leading-5 text-white/65 ${vrBox ? 'text-[10px]' : 'text-sm'}`}>
        {vrBox ? 'Colocá el celular en el visor VR Box.' : 'Prepará el equipo. El ejercicio comenzará automáticamente.'}
      </p>
    </div>
  )

  return (
    <div className={`absolute inset-0 z-20 bg-[#171717] ${vrBox ? 'grid grid-cols-2 divide-x divide-white/12' : ''}`} aria-live="polite" aria-label={`Preparación: ${remaining} segundos`}>
      {content()}
      {vrBox && content(true)}
    </div>
  )
}

export function ExercisePlayer({ config, onExit, onSkip, onComplete, preparationSeconds }: ExercisePlayerProps) {
  const [paused, setPaused] = useState(false)
  const [controlsVisible, setControlsVisible] = useState(true)
  const [preparationRemaining, setPreparationRemaining] = useState(preparationSeconds ?? config.preparationSeconds ?? 0)
  const [remainingSeconds, setRemainingSeconds] = useState(config.durationSeconds)
  const [activityVersion, setActivityVersion] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const preparing = preparationRemaining > 0

  useEffect(() => {
    if (paused || !preparing) return
    const timeout = window.setTimeout(() => setPreparationRemaining((remaining) => Math.max(0, remaining - 1)), 1000)
    return () => window.clearTimeout(timeout)
  }, [paused, preparing, preparationRemaining])

  useEffect(() => {
    if (paused || preparing || remainingSeconds <= 0) return
    const interval = window.setInterval(() => {
      setRemainingSeconds((remaining) => Math.max(0, remaining - 0.25))
    }, 250)
    return () => window.clearInterval(interval)
  }, [paused, preparing, remainingSeconds])

  useEffect(() => {
    if (remainingSeconds === 0) (onComplete ? () => onComplete(config.durationSeconds) : onExit)()
  }, [remainingSeconds, onComplete, onExit, config.durationSeconds])

  useEffect(() => {
    if (!config.metronomeEnabled || paused || preparing) return
    let context: AudioContext | null = null
    const tick = () => {
      try {
        context ??= new AudioContext()
        void context.resume()
        const oscillator = context.createOscillator()
        const gain = context.createGain()
        oscillator.frequency.value = 880
        gain.gain.setValueAtTime(0.0001, context.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.16, context.currentTime + 0.005)
        gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.065)
        oscillator.connect(gain).connect(context.destination)
        oscillator.start()
        oscillator.stop(context.currentTime + 0.07)
      } catch {
        // El ejercicio continúa si el navegador bloquea audio automático.
      }
    }
    tick()
    const interval = window.setInterval(tick, 1000 / Math.max(0.2, config.metronomeHz))
    return () => { window.clearInterval(interval); if (context) void context.close() }
  }, [config.metronomeEnabled, config.metronomeHz, paused, preparing])

  useEffect(() => {
    if (paused) {
      setControlsVisible(true)
      return
    }
    const timeout = window.setTimeout(() => setControlsVisible(false), 3000)
    return () => window.clearTimeout(timeout)
  }, [paused, activityVersion])

  const showControls = () => {
    setControlsVisible(true)
    setActivityVersion((version) => version + 1)
  }

  const requestFullscreen = async () => {
    try {
      await containerRef.current?.requestFullscreen()
      if ((config.displayMode ?? 'standard') === 'vr_box') {
        const orientation = screen.orientation as ScreenOrientation & { lock?: (value: 'landscape') => Promise<void> }
        await orientation.lock?.('landscape')
      }
    } catch {
      // El reproductor continúa aunque el dispositivo no permita fullscreen.
    }
  }

  const formattedTime = `${String(Math.floor(remainingSeconds / 60)).padStart(2, '0')}:${String(Math.ceil(remainingSeconds % 60)).padStart(2, '0')}`

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[100] overflow-hidden bg-[#081113] text-white"
      onPointerMove={showControls}
      onPointerDown={showControls}
      onKeyDown={showControls}
      role="application"
      aria-label={`Reproductor: ${config.name}`}
    >
      {(config.displayMode ?? 'standard') === 'vr_box'
        ? <StereoscopicExerciseCanvas config={config} paused={paused || preparing}/>
        : <ExerciseCanvas config={config} paused={paused || preparing} className="absolute inset-0 size-full" />}

      {preparing && <PreparationOverlay remaining={preparationRemaining} vrBox={(config.displayMode ?? 'standard') === 'vr_box'} />}

      <div className={`absolute inset-x-0 top-0 z-30 flex items-center justify-between bg-gradient-to-b from-black/72 to-transparent p-5 transition-opacity duration-300 sm:p-7 ${controlsVisible ? 'opacity-100' : 'pointer-events-none opacity-0'}`}>
        <span className="max-w-[70vw] truncate rounded-full bg-black/48 px-4 py-2 text-xs font-black backdrop-blur">{config.name}{(config.displayMode ?? 'standard') === 'vr_box' ? ' · VR celular' : config.displayMode === 'quest_browser' ? ' · Quest navegador BETA' : ''}</span>
        <div className="flex items-center gap-2">
          <button type="button" onClick={requestFullscreen} className="grid size-10 place-items-center rounded-full bg-black/48 backdrop-blur" aria-label="Pantalla completa"><Expand size={17} /></button>
          <span className="rounded-full bg-black/48 px-4 py-2 text-xs font-black tabular-nums backdrop-blur">{formattedTime}</span>
        </div>
      </div>

      <div className={`absolute inset-x-0 bottom-0 z-30 flex items-center justify-center gap-3 bg-gradient-to-t from-black/78 to-transparent p-7 transition-opacity duration-300 ${controlsVisible ? 'opacity-100' : 'pointer-events-none opacity-0'}`}>
        <button
          type="button"
          onClick={() => setPaused((value) => !value)}
          className="grid size-13 place-items-center rounded-full bg-white text-[#171717] shadow-lg"
          aria-label={paused ? 'Continuar' : 'Pausar'}
        >
          {paused ? <Play size={20} /> : <Pause size={20} />}
        </button>
        {onSkip && (
          <button type="button" onClick={() => onSkip(Math.max(0, config.durationSeconds - remainingSeconds))} className="inline-flex h-12 items-center gap-2 rounded-full bg-white/16 px-5 text-xs font-black backdrop-blur" aria-label="Omitir ejercicio">
            <SkipForward size={17} /> Omitir
          </button>
        )}
        <button type="button" onClick={onExit} className="inline-flex h-12 items-center gap-2 rounded-full bg-[#c74750] px-5 text-xs font-black shadow-lg" aria-label="Salir del ejercicio">
          <LogOut size={17} /> Salir
        </button>
      </div>

      {paused && (
        <div className="pointer-events-none absolute inset-0 z-40 grid place-items-center bg-black/22">
          <span className="rounded-full bg-black/60 px-5 py-3 text-sm font-black backdrop-blur">{preparing ? 'Preparación en pausa' : 'Ejercicio en pausa'}</span>
        </div>
      )}
    </div>
  )
}
