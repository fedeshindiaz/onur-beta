import { Accessibility, CircleCheck, Eye, Play, ShieldAlert } from 'lucide-react'
import { useState } from 'react'
import { ExerciseCanvas } from '../exercise/ExerciseCanvas'
import { analyzeExerciseCompatibility, applyExercisePurpose, exercisePurposeLabels } from '../exercise/compatibility'
import { ExercisePlayer } from '../exercise/ExercisePlayer'
import type { BackgroundType, ExerciseConfig, ExercisePurpose, MotionDirection, PreparationSeconds } from '../exercise/types'

interface SessionExerciseEditorProps {
  config: ExerciseConfig
  isFirst?: boolean
  onChange: (config: ExerciseConfig) => void
}

const input = 'mt-2 h-11 w-full rounded-2xl border border-[#E9E7E7] bg-white px-3 text-sm'

export function SessionExerciseEditor({ config, isFirst = false, onChange }: SessionExerciseEditorProps) {
  const [playing, setPlaying] = useState(false)
  const set = <Key extends keyof ExerciseConfig>(key: Key, value: ExerciseConfig[Key]) => onChange({ ...config, [key]: value })
  const directions: MotionDirection[] = config.backgroundType === 'spiral' ? ['clockwise', 'counterclockwise'] : ['left', 'right', 'up', 'down']
  const isPhysical = config.kind === 'guided_physical'
  const compatibility = analyzeExerciseCompatibility(config)
  const setKind = (kind: ExerciseConfig['kind']) => onChange(applyExercisePurpose(config, kind === 'guided_physical' ? 'guided_functional' : 'gaze_stabilization'))
  const setPurpose = (purpose: ExercisePurpose) => onChange(applyExercisePurpose(config, purpose))
  const setDisplayMode = (displayMode: ExerciseConfig['displayMode']) => onChange(displayMode === 'vr_box'
    ? { ...config, displayMode, doseMode: 'time', advanceMode: 'automatic' }
    : { ...config, displayMode })

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_.9fr]">
      <div className="space-y-5">
        <section className="rounded-2xl border border-[#E9E7E7] bg-white p-5">
          <h3 className="font-black text-[#171717]">Identificación</h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="text-xs font-black text-[#2F2F2F]">Nombre<input className={input} value={config.name} onChange={(event) => set('name', event.target.value)} /></label>
            <label className="text-xs font-black text-[#2F2F2F]">Tipo<select className={input} value={config.kind} onChange={(event) => setKind(event.target.value as ExerciseConfig['kind'])}><option value="visual_stimulus">Estímulo visual</option><option value="guided_physical">Ejercicio físico guiado</option></select></label>
          </div>
          <label className="mt-4 block text-xs font-black text-[#2F2F2F]">Objetivo del ejercicio<select className={input} value={config.purpose} onChange={(event) => setPurpose(event.target.value as ExercisePurpose)}>{isPhysical
            ? <option value="guided_functional">{exercisePurposeLabels.guided_functional}</option>
            : <>
              <option value="gaze_stabilization">{exercisePurposeLabels.gaze_stabilization}</option>
              <option value="smooth_pursuit">{exercisePurposeLabels.smooth_pursuit}</option>
              <option value="saccades">{exercisePurposeLabels.saccades}</option>
              <option value="optokinetic">{exercisePurposeLabels.optokinetic}</option>
              <option value="visual_habituation">{exercisePurposeLabels.visual_habituation}</option>
            </>}</select></label>
          <label className="mt-4 block text-xs font-black text-[#2F2F2F]">Instrucción para el paciente<textarea rows={3} className="mt-2 w-full rounded-2xl border border-[#E9E7E7] bg-white p-3 text-sm font-normal" value={config.patientInstruction} onChange={(event) => set('patientInstruction', event.target.value)} /></label>
        </section>

        {!isPhysical && <>
          <section className="rounded-2xl border border-[#E9E7E7] bg-white p-5">
            <h3 className="font-black text-[#171717]">Fondo visual</h3>
            <div className="mt-4 grid grid-cols-2 gap-4">
              <label className="text-xs font-black text-[#2F2F2F]">Fondo<select className={input} value={config.backgroundType} onChange={(event) => set('backgroundType', event.target.value as BackgroundType)}><option value="solid">Color sólido</option><option value="bars">Barras</option><option value="spiral">Espiral</option><option value="checkerboard">Damero</option><option value="dots">Puntos</option></select></label>
              <label className="text-xs font-black text-[#2F2F2F]">Dirección<select className={input} value={config.backgroundDirection} onChange={(event) => set('backgroundDirection', event.target.value as MotionDirection)}>{directions.map((direction) => <option key={direction} value={direction}>{direction}</option>)}</select></label>
            </div>
            <label className="mt-4 block text-xs font-black text-[#2F2F2F]">Velocidad de fondo: {config.backgroundSpeed}<input type="range" min="0" max="160" step="5" className="mt-3 w-full accent-[#E49A02]" value={config.backgroundSpeed} onChange={(event) => set('backgroundSpeed', Number(event.target.value))} /></label>
          </section>

          <section className="rounded-2xl border border-[#E9E7E7] bg-white p-5">
            <div className="flex items-center justify-between"><h3 className="font-black text-[#171717]">Objeto</h3><label className="text-xs font-bold"><input type="checkbox" checked={config.objectEnabled} onChange={(event) => set('objectEnabled', event.target.checked)} /> Mostrar blanco</label></div>
            <div className={`mt-4 grid grid-cols-2 gap-4 ${config.objectEnabled ? '' : 'pointer-events-none opacity-40'}`}>
              <label className="text-xs font-black text-[#2F2F2F]">Comportamiento<select className={input} value={config.objectMode} onChange={(event) => set('objectMode', event.target.value as ExerciseConfig['objectMode'])}><option value="fixed">Fijo</option><option value="tracking">Seguimiento</option><option value="saccades">Sacadas</option></select></label>
              <label className="text-xs font-black text-[#2F2F2F]">Tamaño: {config.objectSize}px<input type="range" min="12" max="90" step="2" className="mt-4 w-full accent-[#E49A02]" value={config.objectSize} onChange={(event) => set('objectSize', Number(event.target.value))} /></label>
              {config.objectMode === 'tracking' && <><label className="text-xs font-black text-[#2F2F2F]">Dirección<select className={input} value={config.objectDirection} onChange={(event) => set('objectDirection', event.target.value as 'horizontal' | 'vertical')}><option value="horizontal">Horizontal</option><option value="vertical">Vertical</option></select></label><label className="text-xs font-black text-[#2F2F2F]">Frecuencia: {config.objectSpeedHz} Hz<input type="range" min="0.1" max="1.5" step="0.1" className="mt-4 w-full accent-[#E49A02]" value={config.objectSpeedHz} onChange={(event) => set('objectSpeedHz', Number(event.target.value))} /></label></>}
              {config.objectMode === 'saccades' && <><label className="text-xs font-black text-[#2F2F2F]">Patrón<select className={input} value={config.saccadePattern} onChange={(event) => set('saccadePattern', event.target.value as ExerciseConfig['saccadePattern'])}><option value="horizontal">Lateral</option><option value="vertical">Arriba/abajo</option><option value="random">Aleatorio</option></select></label><label className="text-xs font-black text-[#2F2F2F]">Ritmo: {config.saccadeFrequencyHz} Hz<input type="range" min="0.2" max="2" step="0.1" className="mt-4 w-full accent-[#E49A02]" value={config.saccadeFrequencyHz} onChange={(event) => set('saccadeFrequencyHz', Number(event.target.value))} /></label></>}
            </div>
          </section>
        </>}

        {isPhysical && <section className="rounded-2xl border border-[#E9E7E7] bg-white p-5">
          <h3 className="font-black text-[#171717]">Condiciones físicas</h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <label className="text-xs font-black text-[#2F2F2F]">Postura<select className={input} value={config.posture} onChange={(event) => set('posture', event.target.value as ExerciseConfig['posture'])}><option value="seated">Sentado</option><option value="standing">De pie</option><option value="walking">Marcha</option></select></label>
            <label className="text-xs font-black text-[#2F2F2F]">Superficie<select className={input} value={config.surface} onChange={(event) => set('surface', event.target.value as ExerciseConfig['surface'])}><option value="firm">Firme</option><option value="unstable">Inestable</option></select></label>
            <label className="text-xs font-black text-[#2F2F2F]">Supervisión<select className={input} value={config.supervision} onChange={(event) => set('supervision', event.target.value as ExerciseConfig['supervision'])}><option value="independent_after_approval">Independiente aprobado</option><option value="trained_helper">Ayudante entrenado</option><option value="direct_clinician">Profesional directo</option></select></label>
          </div>
          {(config.surface === 'unstable' || config.posture === 'walking') && <p className="mt-4 flex gap-2 rounded-xl bg-[#FFF7E8] p-3 text-[11px] leading-5 text-[#8A5B00]"><ShieldAlert className="mt-0.5 shrink-0" size={16}/> Esta condición debe conservar una indicación explícita de supervisión y entorno despejado.</p>}
        </section>}

        <section className="rounded-2xl border border-[#E9E7E7] bg-white p-5">
          <h3 className="font-black text-[#171717]">Dispositivo y confirmación</h3>
          <label className="mt-4 block text-xs font-black text-[#2F2F2F]">Modo<select className={input} value={config.displayMode} onChange={(event) => setDisplayMode(event.target.value as ExerciseConfig['displayMode'])}><option value="standard">Pantalla 2D</option><option value="vr_box" disabled={config.purpose === 'gaze_stabilization' || isPhysical}>VR Box · estímulo visual sin anclaje</option><option value="quest_browser" disabled={config.purpose === 'gaze_stabilization' || isPhysical}>Meta Quest · navegador sin anclaje</option></select></label>
          <p className="mt-3 text-[11px] leading-5 text-[#747474]">{config.displayMode === 'standard' ? 'La pantalla debe permanecer inmóvil. El paciente puede confirmar con controles visibles.' : config.displayMode === 'vr_box' ? 'VR Box duplica el estímulo para ambos ojos y solo admite ejercicios por tiempo. No usa botones, mirada ni controles externos.' : 'Quest usa el navegador 2D actual y sus controles, pero todavía no ancla objetos al ambiente mediante WebXR.'}</p>
          {config.displayMode === 'vr_box' && <p className="mt-3 rounded-xl bg-[#FFF7E8] p-3 text-[11px] font-bold leading-5 text-[#8A5B00]">La sesión agregará una pantalla previa y 20 segundos para colocar el celular en el visor, y otros 20 segundos para retirarlo antes de volver a una tarea manual.</p>}
          <div role={compatibility.valid ? 'status' : 'alert'} className={`mt-4 rounded-2xl border p-4 ${compatibility.valid ? 'border-[#B9D9C5] bg-[#F0F8F3] text-[#28613D]' : 'border-[#eccfd2] bg-[#fceced] text-[#9A3842]'}`}>
            <p className="flex gap-2 text-xs font-black">{compatibility.valid ? <CircleCheck className="shrink-0" size={17}/> : <ShieldAlert className="shrink-0" size={17}/>} {compatibility.valid ? 'Configuración coherente' : 'Configuración bloqueada'}</p>
            <p className="mt-2 text-[11px] font-bold leading-5">{compatibility.explanation}</p>
            {!compatibility.valid && <ul className="mt-3 space-y-2 text-[11px] leading-5">{compatibility.issues.map((item) => <li key={item.code}><strong>{item.message}</strong> {item.correction}</li>)}</ul>}
            {compatibility.clinicalNote && <p className="mt-3 border-t border-current/15 pt-3 text-[11px] leading-5">{compatibility.clinicalNote}</p>}
          </div>
        </section>

        <section className="rounded-2xl border border-[#E9E7E7] bg-white p-5">
          <h3 className="font-black text-[#171717]">Dosis y avance</h3>
          {isFirst && <div className="mt-4 rounded-xl border border-[#E8CE99] bg-[#FFF7E8] p-4">
            <p className="text-xs font-black text-[#2F2F2F]">Preparación antes de comenzar</p>
            <div className="mt-3 grid grid-cols-3 gap-2">{([5, 10, 20] as PreparationSeconds[]).map((seconds) => <button key={seconds} type="button" onClick={() => set('preparationSeconds', seconds)} aria-pressed={config.preparationSeconds === seconds} className={`h-11 rounded-lg border text-sm font-black ${config.preparationSeconds === seconds ? 'border-[#E49A02] bg-[#E49A02] text-white' : 'border-[#E8CE99] bg-white text-[#8A5B00]'}`}>{seconds} s</button>)}</div>
            <p className="mt-3 text-[11px] leading-5 text-[#8A5B00]">La cuenta regresiva aparece una sola vez antes del primer ejercicio.</p>
          </div>}
          <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl bg-[#F7F6F4] p-1">
            <button type="button" onClick={() => set('doseMode', 'time')} aria-pressed={config.doseMode === 'time'} className={`h-10 rounded-lg text-xs font-black ${config.doseMode === 'time' ? 'bg-white text-[#E49A02] shadow-sm' : 'text-[#747474]'}`}>Por tiempo</button>
            <button type="button" disabled={config.displayMode === 'vr_box'} onClick={() => onChange({ ...config, doseMode: 'repetitions', advanceMode: 'manual' })} aria-pressed={config.doseMode === 'repetitions'} className={`h-10 rounded-lg text-xs font-black disabled:cursor-not-allowed disabled:opacity-35 ${config.doseMode === 'repetitions' ? 'bg-white text-[#E49A02] shadow-sm' : 'text-[#747474]'}`}>Por repeticiones</button>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3">
            {config.doseMode === 'time' ? <label className="text-xs font-black text-[#2F2F2F]">Ejercicio<span className="relative block"><input type="number" min="10" max="300" className={input} value={config.durationSeconds} onChange={(event) => set('durationSeconds', Number(event.target.value))} /><span className="absolute bottom-3 right-3 text-[10px] text-[#747474]">s</span></span></label> : <label className="text-xs font-black text-[#2F2F2F]">Objetivo<span className="relative block"><input type="number" min="1" max="100" className={input} value={config.targetRepetitions} onChange={(event) => set('targetRepetitions', Number(event.target.value))} /><span className="absolute bottom-3 right-3 text-[10px] text-[#747474]">rep.</span></span></label>}
            <label className="text-xs font-black text-[#2F2F2F]">Descanso<span className="relative block"><input type="number" min="0" max="180" className={input} value={config.restSeconds} onChange={(event) => set('restSeconds', Number(event.target.value))} /><span className="absolute bottom-3 right-3 text-[10px] text-[#747474]">s</span></span></label>
            <label className="text-xs font-black text-[#2F2F2F]">Vueltas<input type="number" min="1" max="10" className={input} value={config.rounds} onChange={(event) => set('rounds', Number(event.target.value))} /></label>
          </div>
          <label className="mt-4 block text-xs font-black text-[#2F2F2F]">Avance<select disabled={config.displayMode === 'vr_box'} className={`${input} disabled:bg-[#F7F6F4] disabled:text-[#747474]`} value={config.advanceMode} onChange={(event) => set('advanceMode', event.target.value as ExerciseConfig['advanceMode'])}><option value="manual">Confirmación manual</option><option value="automatic" disabled={config.doseMode === 'repetitions'}>Automático al terminar el tiempo</option></select></label>
          {config.doseMode === 'repetitions' && <p className="mt-3 text-[11px] leading-5 text-[#747474]">La aplicación no contará movimientos: el paciente informará si completó el objetivo o cuántas repeticiones realizó.</p>}
          <div className="mt-5 flex items-center gap-4"><label className="inline-flex items-center gap-2 text-xs font-black text-[#2F2F2F]"><input type="checkbox" checked={config.metronomeEnabled} onChange={(event) => set('metronomeEnabled', event.target.checked)} className="size-4 accent-[#E49A02]" /> Metrónomo</label>{config.metronomeEnabled && <label className="flex-1 text-xs font-black text-[#2F2F2F]">{config.metronomeHz.toFixed(1)} Hz<input type="range" min="0.2" max="3" step="0.1" value={config.metronomeHz} onChange={(event) => set('metronomeHz', Number(event.target.value))} className="mt-2 w-full accent-[#E49A02]" /></label>}</div>
        </section>
      </div>

      <aside className="xl:sticky xl:top-24 xl:self-start">
        <div className="overflow-hidden rounded-2xl border border-[#E9E7E7] bg-white">
          <div className="flex items-center gap-2 p-4 text-sm font-black text-[#171717]"><Eye size={17} className="text-[#E49A02]" /> Vista previa</div>
          <div className="aspect-video bg-[#081113]">{isPhysical ? <div className="grid size-full place-items-center p-6 text-center text-white"><div><Accessibility className="mx-auto text-[#E49A02]" size={54}/><p className="mt-4 text-sm font-black">{config.patientInstruction || 'Instrucción física pendiente'}</p><p className="mt-3 text-xs text-white/55">{config.posture === 'seated' ? 'Sentado' : config.posture === 'standing' ? 'De pie' : 'Marcha'} · {config.surface === 'firm' ? 'Superficie firme' : 'Superficie inestable'}</p></div></div> : <ExerciseCanvas config={config} className="size-full" />}</div>
          <div className="p-5">
            <p className="text-sm font-black text-[#2F2F2F]">{config.name}</p>
            <p className="mt-2 text-xs text-[#747474]">{config.doseMode === 'time' ? `${config.durationSeconds} s` : `${config.targetRepetitions} repeticiones`} × {config.rounds} vueltas · avance {config.advanceMode === 'manual' ? 'manual' : 'automático'}</p>
            <button type="button" disabled={!compatibility.valid} onClick={() => setPlaying(true)} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#E49A02] px-4 py-3 text-xs font-black text-white disabled:cursor-not-allowed disabled:opacity-40"><Play size={16} /> {compatibility.valid ? 'Probar ejercicio' : 'Corregí la compatibilidad para probar'}</button>
          </div>
        </div>
      </aside>
      {playing && compatibility.valid && <ExercisePlayer config={config} onExit={() => setPlaying(false)} onSkip={() => setPlaying(false)} onComplete={() => setPlaying(false)} />}
    </div>
  )
}
