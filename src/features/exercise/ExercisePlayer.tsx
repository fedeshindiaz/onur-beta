import { Accessibility, Check, Clock3, Expand, LogOut, Pause, Play, ShieldAlert, SkipForward } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { ExerciseCanvas } from './ExerciseCanvas'
import { analyzeExerciseCompatibility } from './compatibility'
import { StereoscopicExerciseCanvas } from './StereoscopicExerciseCanvas'
import type { ExerciseCompletionReport, ExerciseConfig } from './types'

interface ExercisePlayerProps {
  config: ExerciseConfig
  onExit: () => void
  onSkip?: (activeSeconds: number, report?: ExerciseCompletionReport) => void
  onComplete?: (activeSeconds: number, report?: ExerciseCompletionReport) => void
  preparationSeconds?: number
}

function PreparationOverlay({ remaining, vrBox }: { remaining: number; vrBox: boolean }) {
  const content = (duplicate = false) => <div className="flex h-full flex-col items-center justify-center px-4 text-center" aria-hidden={duplicate || undefined}><Clock3 className="text-[#E49A02]" size={vrBox ? 26 : 38}/><p className="mt-4 text-[10px] font-black uppercase tracking-[0.2em] text-[#E49A02]">Preparación</p><p className={`${vrBox ? 'mt-2 text-6xl' : 'mt-4 text-8xl'} font-black tabular-nums`}>{remaining}</p><p className={`mt-3 max-w-xs leading-5 text-white/65 ${vrBox ? 'text-[10px]' : 'text-sm'}`}>{vrBox ? 'Colocá el celular en el visor VR Box.' : 'Prepará el equipo. El ejercicio comenzará automáticamente.'}</p></div>
  return <div className={`absolute inset-0 z-20 bg-[#171717] ${vrBox ? 'grid grid-cols-2 divide-x divide-white/12' : ''}`} aria-live="polite" aria-label={`Preparación: ${remaining} segundos`}>{content()}{vrBox && content(true)}</div>
}

function PhysicalStage({ config }: { config: ExerciseConfig }) {
  const vrBox = config.displayMode === 'vr_box'
  const content = (duplicate = false) => <div className="flex size-full flex-col items-center justify-center px-6 text-center text-white" aria-hidden={duplicate || undefined}><Accessibility className="text-[#E49A02]" size={vrBox ? 42 : 68}/><p className={`${vrBox ? 'mt-3 text-xs' : 'mt-6 text-2xl'} max-w-2xl font-black leading-tight`}>{config.patientInstruction}</p><div className={`mt-5 flex flex-wrap justify-center gap-2 ${vrBox ? 'text-[8px]' : 'text-[11px]'}`}><span className="rounded-full bg-white/10 px-3 py-1.5">{config.posture === 'seated' ? 'Sentado' : config.posture === 'standing' ? 'De pie' : 'Marcha'}</span><span className="rounded-full bg-white/10 px-3 py-1.5">{config.surface === 'firm' ? 'Superficie firme' : 'Superficie inestable'}</span><span className="rounded-full bg-white/10 px-3 py-1.5">{config.supervision === 'direct_clinician' ? 'Profesional directo' : config.supervision === 'trained_helper' ? 'Ayudante entrenado' : 'Independiente aprobado'}</span></div><p className={`${vrBox ? 'mt-5 text-lg' : 'mt-8 text-4xl'} font-black text-[#E49A02]`}>{config.doseMode === 'repetitions' ? `${config.targetRepetitions} repeticiones` : `${config.durationSeconds} segundos`}</p></div>
  return <div className={`absolute inset-0 bg-[radial-gradient(circle_at_center,#17343a_0%,#081113_64%)] ${vrBox ? 'grid grid-cols-2 divide-x divide-white/10' : ''}`}>{content()}{vrBox && content(true)}</div>
}

function CompletionPanel({ config, onTarget, onPartial, onSkip }: { config: ExerciseConfig; onTarget: () => void; onPartial: (repetitions: number) => void; onSkip: () => void }) {
  const [partial, setPartial] = useState(false)
  const [reported, setReported] = useState(Math.max(1, config.targetRepetitions - 1))
  const repetitions = config.doseMode === 'repetitions'
  return <div className="w-full max-w-md rounded-3xl border border-white/12 bg-black/72 p-5 text-center shadow-2xl backdrop-blur-md sm:p-7"><Check className="mx-auto text-[#E49A02]" size={36}/><p className="mt-4 text-xs font-black uppercase tracking-[.16em] text-[#E49A02]">Confirmación manual</p><h2 className="mt-3 text-xl font-black sm:text-2xl">{repetitions ? `¿Terminaste las ${config.targetRepetitions} repeticiones?` : 'El tiempo terminó'}</h2><p className="mt-2 text-xs leading-5 text-white/60">La siguiente fase no comenzará hasta que la confirmes.</p>{partial && repetitions ? <div className="mt-5"><label className="text-xs font-black text-white/75">Repeticiones realizadas aproximadamente<input type="number" min="1" max={Math.max(1, config.targetRepetitions - 1)} value={reported} onChange={(event) => setReported(Math.min(Math.max(1, Number(event.target.value)), Math.max(1, config.targetRepetitions - 1)))} className="mt-2 h-12 w-full rounded-xl border border-white/16 bg-white/10 px-4 text-center text-lg font-black text-white"/></label><button type="button" onClick={() => onPartial(reported)} className="mt-4 h-12 w-full rounded-xl bg-[#E49A02] text-sm font-black text-white">Confirmar y continuar</button><button type="button" onClick={() => setPartial(false)} className="mt-3 text-xs font-bold text-white/55">Volver</button></div> : <div className="mt-6 space-y-3"><button type="button" onClick={onTarget} className="h-13 w-full rounded-xl bg-[#E49A02] px-4 text-sm font-black text-white">{repetitions ? `Completé las ${config.targetRepetitions}` : 'Continuar'}</button>{repetitions && <button type="button" onClick={() => setPartial(true)} className="h-12 w-full rounded-xl bg-white/12 px-4 text-xs font-black">Hice menos</button>}<button type="button" onClick={onSkip} className="text-xs font-bold text-white/55">No pude completar</button></div>}</div>
}

function CompletionOverlay({ config, onTarget, onPartial, onSkip }: { config: ExerciseConfig; onTarget: () => void; onPartial: (repetitions: number) => void; onSkip: () => void }) {
  const vrBox = config.displayMode === 'vr_box'
  if (!vrBox) return <div className="absolute inset-0 z-50 grid place-items-center bg-black/48 p-5"><CompletionPanel config={config} onTarget={onTarget} onPartial={onPartial} onSkip={onSkip}/></div>
  return <div className="absolute inset-0 z-50 grid grid-cols-2 divide-x divide-white/10 bg-[#171717]"><div className="grid place-items-center p-3"><CompletionPanel config={config} onTarget={onTarget} onPartial={onPartial} onSkip={onSkip}/></div><div className="grid place-items-center p-3" aria-hidden="true"><CompletionPanel config={config} onTarget={onTarget} onPartial={onPartial} onSkip={onSkip}/></div></div>
}

function CompatibleExercisePlayer({ config, onExit, onSkip, onComplete, preparationSeconds }: ExercisePlayerProps) {
  const [paused, setPaused] = useState(false)
  const [controlsVisible, setControlsVisible] = useState(true)
  const [preparationRemaining, setPreparationRemaining] = useState(preparationSeconds ?? config.preparationSeconds ?? 0)
  const [remainingSeconds, setRemainingSeconds] = useState(config.durationSeconds)
  const [activeSeconds, setActiveSeconds] = useState(0)
  const [completionOpen, setCompletionOpen] = useState(false)
  const [activityVersion, setActivityVersion] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const completedRef = useRef(false)
  const preparing = preparationRemaining > 0
  const timedFinished = config.doseMode === 'time' && remainingSeconds <= 0
  const inactive = paused || preparing || completionOpen || timedFinished

  useEffect(() => { containerRef.current?.focus() }, [])
  useEffect(() => { if (paused || !preparing) return; const timeout = window.setTimeout(() => setPreparationRemaining((remaining) => Math.max(0, remaining - 1)), 1000); return () => window.clearTimeout(timeout) }, [paused, preparing, preparationRemaining])
  useEffect(() => { if (inactive) return; const interval = window.setInterval(() => { setActiveSeconds((seconds) => seconds + 0.25); if (config.doseMode === 'time') setRemainingSeconds((remaining) => Math.max(0, remaining - 0.25)) }, 250); return () => window.clearInterval(interval) }, [config.doseMode, inactive])

  const finish = (report: ExerciseCompletionReport) => {
    if (completedRef.current) return
    completedRef.current = true
    const seconds = Math.max(0, Math.round(activeSeconds))
    if (report.completion === 'skipped') onSkip?.(seconds, report)
    else if (onComplete) onComplete(seconds, report)
    else onExit()
  }

  useEffect(() => {
    if (!timedFinished || completedRef.current) return
    if (config.displayMode === 'vr_box' || config.advanceMode === 'automatic') finish({ doseMode: 'time', completion: 'target_completed' })
    else setCompletionOpen(true)
    // finish depende del tiempo activo actual; el efecto solo se dispara al alcanzar cero.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timedFinished, config.advanceMode, config.displayMode])

  useEffect(() => {
    if (!config.metronomeEnabled || inactive) return
    let context: AudioContext | null = null
    const tick = () => { try { context ??= new AudioContext(); void context.resume(); const oscillator = context.createOscillator(); const gain = context.createGain(); oscillator.frequency.value = 880; gain.gain.setValueAtTime(0.0001, context.currentTime); gain.gain.exponentialRampToValueAtTime(0.16, context.currentTime + 0.005); gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.065); oscillator.connect(gain).connect(context.destination); oscillator.start(); oscillator.stop(context.currentTime + 0.07) } catch { /* El ejercicio continúa si el navegador bloquea audio automático. */ } }
    tick(); const interval = window.setInterval(tick, 1000 / Math.max(0.2, config.metronomeHz)); return () => { window.clearInterval(interval); if (context) void context.close() }
  }, [config.metronomeEnabled, config.metronomeHz, inactive])

  useEffect(() => { if (paused || completionOpen) { setControlsVisible(true); return }; const timeout = window.setTimeout(() => setControlsVisible(false), 3000); return () => window.clearTimeout(timeout) }, [paused, completionOpen, activityVersion])
  const showControls = () => { setControlsVisible(true); setActivityVersion((version) => version + 1) }
  const requestFullscreen = async () => { try { await containerRef.current?.requestFullscreen(); if (config.displayMode === 'vr_box') { const orientation = screen.orientation as ScreenOrientation & { lock?: (value: 'landscape') => Promise<void> }; await orientation.lock?.('landscape') } } catch { /* Continúa sin fullscreen. */ } }
  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    showControls()
    if (config.displayMode === 'vr_box') return
    if ((event.key !== 'Enter' && event.key !== ' ') || preparing || paused) return
    event.preventDefault()
    if (completionOpen) {
      finish({ doseMode: config.doseMode, completion: 'target_completed', targetRepetitions: config.doseMode === 'repetitions' ? config.targetRepetitions : undefined, reportedRepetitions: config.doseMode === 'repetitions' ? config.targetRepetitions : undefined })
    } else if (config.doseMode === 'repetitions') {
      setCompletionOpen(true)
    }
  }
  const formattedTime = `${String(Math.floor(Math.max(0, remainingSeconds) / 60)).padStart(2, '0')}:${String(Math.ceil(Math.max(0, remainingSeconds) % 60)).padStart(2, '0')}`

  return <div ref={containerRef} className="fixed inset-0 z-[100] overflow-hidden bg-[#081113] text-white" onPointerMove={showControls} onPointerDown={showControls} onKeyDown={handleKeyDown} role="application" aria-label={`Reproductor: ${config.name}`} tabIndex={-1}>
    {config.kind === 'guided_physical' ? <PhysicalStage config={config}/> : config.displayMode === 'vr_box' ? <StereoscopicExerciseCanvas config={config} paused={inactive}/> : <ExerciseCanvas config={config} paused={inactive} className="absolute inset-0 size-full"/>}
    {preparing && <PreparationOverlay remaining={preparationRemaining} vrBox={config.displayMode === 'vr_box'}/>}
    <div className={`absolute inset-x-0 top-0 z-30 flex items-center justify-between bg-gradient-to-b from-black/72 to-transparent p-5 transition-opacity duration-300 sm:p-7 ${controlsVisible ? 'opacity-100' : 'pointer-events-none opacity-0'}`}><span className="max-w-[70vw] truncate rounded-full bg-black/48 px-4 py-2 text-xs font-black backdrop-blur">{config.name}{config.displayMode === 'vr_box' ? ' · VR celular' : config.displayMode === 'quest_browser' ? ' · Quest navegador BETA' : ''}</span><div className="flex items-center gap-2"><button type="button" onClick={requestFullscreen} className="grid size-10 place-items-center rounded-full bg-black/48 backdrop-blur" aria-label="Pantalla completa"><Expand size={17}/></button><span className="rounded-full bg-black/48 px-4 py-2 text-xs font-black tabular-nums backdrop-blur">{config.doseMode === 'time' ? formattedTime : `${config.targetRepetitions} rep.`}</span></div></div>
    <div className={`absolute inset-x-0 bottom-0 z-30 flex flex-wrap items-center justify-center gap-3 bg-gradient-to-t from-black/78 to-transparent p-7 transition-opacity duration-300 ${controlsVisible ? 'opacity-100' : 'pointer-events-none opacity-0'}`}><button type="button" onClick={() => setPaused((value) => !value)} className="grid size-13 place-items-center rounded-full bg-white text-[#171717] shadow-lg" aria-label={paused ? 'Continuar' : 'Pausar'}>{paused ? <Play size={20}/> : <Pause size={20}/>}</button>{config.doseMode === 'repetitions' && !preparing && <button type="button" onClick={() => setCompletionOpen(true)} className="inline-flex h-12 items-center gap-2 rounded-full bg-[#E49A02] px-5 text-xs font-black shadow-lg"><Check size={17}/> Informar finalización</button>}{onSkip && <button type="button" onClick={() => finish({ doseMode: config.doseMode, completion: 'skipped', targetRepetitions: config.doseMode === 'repetitions' ? config.targetRepetitions : undefined })} className="inline-flex h-12 items-center gap-2 rounded-full bg-white/16 px-5 text-xs font-black backdrop-blur"><SkipForward size={17}/> Omitir</button>}<button type="button" onClick={onExit} className="inline-flex h-12 items-center gap-2 rounded-full bg-[#c74750] px-5 text-xs font-black shadow-lg"><LogOut size={17}/> Salir</button></div>
    {paused && <div className="pointer-events-none absolute inset-0 z-40 grid place-items-center bg-black/22"><span className="rounded-full bg-black/60 px-5 py-3 text-sm font-black backdrop-blur">{preparing ? 'Preparación en pausa' : 'Ejercicio en pausa'}</span></div>}
    {completionOpen && <CompletionOverlay
      config={config}
      onTarget={() => finish({ doseMode: config.doseMode, completion: 'target_completed', targetRepetitions: config.doseMode === 'repetitions' ? config.targetRepetitions : undefined, reportedRepetitions: config.doseMode === 'repetitions' ? config.targetRepetitions : undefined })}
      onPartial={(reportedRepetitions) => finish({ doseMode: 'repetitions', completion: 'partial', targetRepetitions: config.targetRepetitions, reportedRepetitions })}
      onSkip={() => finish({ doseMode: config.doseMode, completion: 'skipped', targetRepetitions: config.doseMode === 'repetitions' ? config.targetRepetitions : undefined })}
    />}
  </div>
}

export function ExercisePlayer(props: ExercisePlayerProps) {
  const compatibility = analyzeExerciseCompatibility(props.config)
  if (compatibility.valid) return <CompatibleExercisePlayer {...props}/>
  return <div className="fixed inset-0 z-[100] grid place-items-center bg-[#171717] p-6 text-white" role="alert">
    <div className="w-full max-w-xl rounded-3xl border border-[#c74750]/50 bg-white/[0.06] p-7 text-center shadow-2xl">
      <ShieldAlert className="mx-auto text-[#ef6b74]" size={48}/>
      <p className="mt-5 text-xs font-black uppercase tracking-[.16em] text-[#ef6b74]">Ejercicio no ejecutable</p>
      <h2 className="mt-3 text-2xl font-black">La configuración no representa la tarea indicada</h2>
      <p className="mt-4 text-sm leading-6 text-white/70">{compatibility.issues[0].message}</p>
      <p className="mt-2 text-sm font-bold leading-6 text-white/85">{compatibility.issues[0].correction}</p>
      <button type="button" onClick={props.onExit} className="mt-7 h-13 w-full rounded-2xl bg-white px-5 text-sm font-black text-[#171717]">Salir y avisar al profesional</button>
    </div>
  </div>
}
