import { Eye, Play } from 'lucide-react'
import { useState } from 'react'
import { ExerciseCanvas } from '../exercise/ExerciseCanvas'
import { ExercisePlayer } from '../exercise/ExercisePlayer'
import type { BackgroundType, ExerciseConfig, MotionDirection, PreparationSeconds } from '../exercise/types'

interface SessionExerciseEditorProps {
  config: ExerciseConfig
  isFirst?: boolean
  onChange: (config: ExerciseConfig) => void
}

export function SessionExerciseEditor({ config, isFirst = false, onChange }: SessionExerciseEditorProps) {
  const [playing, setPlaying] = useState(false)
  const set = <Key extends keyof ExerciseConfig>(key: Key, value: ExerciseConfig[Key]) => onChange({ ...config, [key]: value })
  const input = 'mt-2 h-11 w-full rounded-2xl border border-[#E9E7E7] bg-white px-3 text-sm'
  const directions: MotionDirection[] = config.backgroundType === 'spiral' ? ['clockwise', 'counterclockwise'] : ['left', 'right', 'up', 'down']

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_.9fr]">
      <div className="space-y-5">
        <section className="rounded-2xl border border-[#E9E7E7] bg-white p-5">
          <h3 className="font-black text-[#171717]">Identificación y fondo</h3>
          <label className="mt-4 block text-xs font-black text-[#2F2F2F]">Nombre<input className={input} value={config.name} onChange={(event) => set('name', event.target.value)} /></label>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <label className="text-xs font-black text-[#2F2F2F]">Fondo<select className={input} value={config.backgroundType} onChange={(event) => set('backgroundType', event.target.value as BackgroundType)}><option value="solid">Color sólido</option><option value="bars">Barras</option><option value="spiral">Espiral</option><option value="checkerboard">Damero</option><option value="dots">Puntos</option></select></label>
            <label className="text-xs font-black text-[#2F2F2F]">Dirección<select className={input} value={config.backgroundDirection} onChange={(event) => set('backgroundDirection', event.target.value as MotionDirection)}>{directions.map((direction) => <option key={direction}>{direction}</option>)}</select></label>
          </div>
          <label className="mt-4 block text-xs font-black text-[#2F2F2F]">Velocidad de fondo: {config.backgroundSpeed}<input type="range" min="0" max="160" step="5" className="mt-3 w-full accent-[#E49A02]" value={config.backgroundSpeed} onChange={(event) => set('backgroundSpeed', Number(event.target.value))} /></label>
        </section>

        <section className="rounded-2xl border border-[#E9E7E7] bg-white p-5">
          <div className="flex items-center justify-between"><h3 className="font-black text-[#171717]">Objeto</h3><label className="text-xs font-bold"><input type="checkbox" checked={config.objectEnabled} onChange={(event) => set('objectEnabled', event.target.checked)} /> Mostrar pelota</label></div>
          <div className={`mt-4 grid grid-cols-2 gap-4 ${config.objectEnabled ? '' : 'pointer-events-none opacity-40'}`}>
            <label className="text-xs font-black text-[#2F2F2F]">Comportamiento<select className={input} value={config.objectMode} onChange={(event) => set('objectMode', event.target.value as ExerciseConfig['objectMode'])}><option value="fixed">Fijo</option><option value="tracking">Seguimiento</option><option value="saccades">Sacadas</option></select></label>
            <label className="text-xs font-black text-[#2F2F2F]">Tamaño: {config.objectSize}px<input type="range" min="12" max="90" step="2" className="mt-4 w-full accent-[#E49A02]" value={config.objectSize} onChange={(event) => set('objectSize', Number(event.target.value))} /></label>
            {config.objectMode === 'tracking' && <><label className="text-xs font-black text-[#2F2F2F]">Dirección<select className={input} value={config.objectDirection} onChange={(event) => set('objectDirection', event.target.value as 'horizontal' | 'vertical')}><option value="horizontal">Horizontal</option><option value="vertical">Vertical</option></select></label><label className="text-xs font-black text-[#2F2F2F]">Frecuencia: {config.objectSpeedHz} Hz<input type="range" min="0.1" max="1.5" step="0.1" className="mt-4 w-full accent-[#E49A02]" value={config.objectSpeedHz} onChange={(event) => set('objectSpeedHz', Number(event.target.value))} /></label></>}
            {config.objectMode === 'saccades' && <><label className="text-xs font-black text-[#2F2F2F]">Patrón<select className={input} value={config.saccadePattern} onChange={(event) => set('saccadePattern', event.target.value as ExerciseConfig['saccadePattern'])}><option value="horizontal">Lateral</option><option value="vertical">Arriba/abajo</option><option value="random">Aleatorio</option></select></label><label className="text-xs font-black text-[#2F2F2F]">Ritmo: {config.saccadeFrequencyHz} Hz<input type="range" min="0.2" max="2" step="0.1" className="mt-4 w-full accent-[#E49A02]" value={config.saccadeFrequencyHz} onChange={(event) => set('saccadeFrequencyHz', Number(event.target.value))} /></label></>}
          </div>
        </section>

        <section className="rounded-2xl border border-[#E9E7E7] bg-white p-5">
          <h3 className="font-black text-[#171717]">Visualización</h3>
          <label className="mt-4 block text-xs font-black text-[#2F2F2F]">Modo<select className={input} value={config.displayMode ?? 'standard'} onChange={(event) => set('displayMode', event.target.value as ExerciseConfig['displayMode'])}><option value="standard">Pantalla 2D</option><option value="vr_box">VR Box · celular dividido</option><option value="quest_browser">Meta Quest · navegador BETA</option></select></label>
          <p className="mt-3 text-[11px] leading-5 text-[#747474]">VR Box duplica la imagen sincronizada para cada ojo. Quest navegador usa pantalla completa; la inmersión WebXR requiere validación con el visor físico.</p>
        </section>

        <section className="rounded-2xl border border-[#E9E7E7] bg-white p-5">
          <h3 className="font-black text-[#171717]">Tiempo y ritmo</h3>
          {isFirst && (
            <div className="mt-4 rounded-xl border border-[#E8CE99] bg-[#FFF7E8] p-4">
              <p className="text-xs font-black text-[#2F2F2F]">Preparación antes de comenzar</p>
              <div className="mt-3 grid grid-cols-3 gap-2">
                {([5, 10, 20] as PreparationSeconds[]).map((seconds) => (
                  <button key={seconds} type="button" onClick={() => set('preparationSeconds', seconds)} aria-pressed={config.preparationSeconds === seconds} className={`h-11 rounded-lg border text-sm font-black ${config.preparationSeconds === seconds ? 'border-[#E49A02] bg-[#E49A02] text-white' : 'border-[#E8CE99] bg-white text-[#8A5B00]'}`}>
                    {seconds} s
                  </button>
                ))}
              </div>
              <p className="mt-3 text-[11px] leading-5 text-[#8A5B00]">La cuenta regresiva aparece una sola vez, antes del primer ejercicio de la sesión.</p>
            </div>
          )}
          <div className="mt-4 grid grid-cols-3 gap-3">
            {([['durationSeconds', 'Ejercicio', 's', 10, 300], ['restSeconds', 'Descanso', 's', 0, 180], ['rounds', 'Vueltas', '', 1, 10]] as const).map(([key, label, unit, min, max]) => (
              <label key={key} className="text-xs font-black text-[#2F2F2F]">{label}<span className="relative block"><input type="number" min={min} max={max} className={input} value={config[key]} onChange={(event) => set(key, Number(event.target.value))} /><span className="absolute bottom-3 right-3 text-[10px] text-[#747474]">{unit}</span></span></label>
            ))}
          </div>
          <div className="mt-5 flex items-center gap-4"><label className="inline-flex items-center gap-2 text-xs font-black text-[#2F2F2F]"><input type="checkbox" checked={config.metronomeEnabled} onChange={(event) => set('metronomeEnabled', event.target.checked)} className="size-4 accent-[#E49A02]" /> Metrónomo</label>{config.metronomeEnabled && <label className="flex-1 text-xs font-black text-[#2F2F2F]">{config.metronomeHz.toFixed(1)} Hz<input type="range" min="0.2" max="3" step="0.1" value={config.metronomeHz} onChange={(event) => set('metronomeHz', Number(event.target.value))} className="mt-2 w-full accent-[#E49A02]" /></label>}</div>
        </section>
      </div>

      <aside className="xl:sticky xl:top-24 xl:self-start">
        <div className="overflow-hidden rounded-2xl border border-[#E9E7E7] bg-white">
          <div className="flex items-center gap-2 p-4 text-sm font-black text-[#171717]"><Eye size={17} className="text-[#E49A02]" /> Vista previa</div>
          <div className="aspect-video bg-[#081113]"><ExerciseCanvas config={config} className="size-full" /></div>
          <div className="p-5">
            <p className="text-sm font-black text-[#2F2F2F]">{config.name}</p>
            <p className="mt-2 text-xs text-[#747474]">{config.durationSeconds}s × {config.rounds} vueltas · {config.restSeconds}s de descanso{isFirst ? ` · ${config.preparationSeconds}s de preparación` : ''}</p>
            <button type="button" onClick={() => setPlaying(true)} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#E49A02] px-4 py-3 text-xs font-black text-white"><Play size={16} /> Probar ejercicio</button>
          </div>
        </div>
      </aside>
      {playing && <ExercisePlayer config={config} onExit={() => setPlaying(false)} onSkip={() => setPlaying(false)} />}
    </div>
  )
}
