import { Eye, FolderOpen, Play, RotateCcw, Save, ShieldAlert, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { PageHeader } from '../components/PageHeader'
import { ExerciseCanvas } from '../features/exercise/ExerciseCanvas'
import { ExercisePlayer } from '../features/exercise/ExercisePlayer'
import { defaultExerciseConfig, type BackgroundType, type ExerciseConfig, type MotionDirection } from '../features/exercise/types'
import { useDeleteExerciseTemplate, useExerciseTemplates, useSaveExerciseTemplate } from '../features/templates/hooks'

const backgroundLabels: Record<BackgroundType, string> = {
  solid: 'Color sólido',
  bars: 'Barras optocinéticas',
  spiral: 'Espiral',
  checkerboard: 'Damero',
  dots: 'Campo de puntos',
}

const directionLabels: Record<MotionDirection, string> = {
  left: 'Izquierda',
  right: 'Derecha',
  up: 'Arriba',
  down: 'Abajo',
  clockwise: 'Horario',
  counterclockwise: 'Antihorario',
}

export function ExerciseBuilderPage() {
  const [config, setConfig] = useState<ExerciseConfig>(defaultExerciseConfig)
  const [playing, setPlaying] = useState(false)
  const [notice, setNotice] = useState('')
  const { data: templates = [] } = useExerciseTemplates()
  const saveTemplate = useSaveExerciseTemplate()
  const deleteTemplate = useDeleteExerciseTemplate()

  const update = <Key extends keyof ExerciseConfig>(key: Key, value: ExerciseConfig[Key]) => {
    setConfig((current) => ({ ...current, [key]: value }))
  }

  const setBackgroundType = (backgroundType: BackgroundType) => {
    setConfig((current) => ({
      ...current,
      backgroundType,
      backgroundDirection: backgroundType === 'spiral' ? 'clockwise' : 'left',
    }))
  }

  const directions: MotionDirection[] = config.backgroundType === 'spiral'
    ? ['clockwise', 'counterclockwise']
    : ['left', 'right', 'up', 'down']

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Constructor visual"
        title="Crear ejercicio"
        description="Fondo y objeto se configuran de forma independiente. El movimiento continúa en bucle hasta terminar el tiempo."
        actions={
          <>
            <button type="button" onClick={() => setConfig(defaultExerciseConfig)} className="inline-flex items-center gap-2 rounded-2xl border border-[#E9E7E7] bg-white px-4 py-3 text-sm font-black text-[#2F2F2F]">
              <RotateCcw size={17} /> Restablecer
            </button>
            <button type="button" disabled={saveTemplate.isPending} onClick={async()=>{try{await saveTemplate.mutateAsync(config);setNotice('Plantilla guardada en la biblioteca.')}catch(caught){setNotice(caught instanceof Error?caught.message:'No fue posible guardar.')}}} className="inline-flex items-center gap-2 rounded-2xl bg-[#E49A02] px-4 py-3 text-sm font-black text-white">
              <Save size={17} /> Guardar plantilla
            </button>
          </>
        }
      />

      {notice&&<p className="rounded-2xl bg-[#FFF7E8] px-4 py-3 text-sm font-bold text-[#A36B00]">{notice}</p>}
      <section className="rounded-2xl border border-[#E9E7E7] bg-white p-5"><div className="flex items-center gap-2"><FolderOpen size={18} className="text-[#E49A02]"/><h2 className="text-sm font-black text-[#171717]">Biblioteca de ejercicios</h2></div><div className="mt-4 flex gap-3 overflow-x-auto pb-1">{templates.map(template=><div key={template.id} className="flex min-w-56 items-center gap-2 rounded-2xl border border-[#E9E7E7] p-3"><button type="button" onClick={()=>{setConfig({...template.config});setNotice(`Plantilla “${template.name}” cargada.`)}} className="min-w-0 flex-1 text-left"><p className="truncate text-xs font-black text-[#2F2F2F]">{template.name}</p><p className="mt-1 text-[10px] text-[#747474]">{template.config.durationSeconds}s × {template.config.rounds}</p></button><button type="button" onClick={()=>deleteTemplate.mutate(template.id)} className="grid size-8 place-items-center rounded-xl text-[#a94952]" aria-label={`Eliminar ${template.name}`}><Trash2 size={15}/></button></div>)}</div></section>

      <section className="grid gap-6 xl:grid-cols-[0.78fr_1.22fr]">
        <div className="space-y-5">
          <article className="rounded-2xl border border-[#E9E7E7] bg-white p-5 sm:p-6">
            <h2 className="text-lg font-black text-[#171717]">Fondo</h2>
            <div className="mt-5 grid grid-cols-2 gap-2">
              {(Object.keys(backgroundLabels) as BackgroundType[]).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setBackgroundType(type)}
                  className={`rounded-2xl border px-3 py-3 text-left text-xs font-black transition ${
                    config.backgroundType === type
                      ? 'border-[#E49A02] bg-[#FFF7E8] text-[#7A5100]'
                      : 'border-[#E9E7E7] bg-white text-[#747474]'
                  }`}
                >
                  {backgroundLabels[type]}
                </button>
              ))}
            </div>

            {config.backgroundType !== 'solid' && (
              <div className="mt-5 grid gap-5 sm:grid-cols-2">
                <label className="block">
                  <span className="text-xs font-black text-[#2F2F2F]">Dirección</span>
                  <select value={config.backgroundDirection} onChange={(event) => update('backgroundDirection', event.target.value as MotionDirection)} className="mt-2 h-11 w-full rounded-2xl border border-[#E9E7E7] bg-white px-3 text-sm">
                    {directions.map((direction) => <option key={direction} value={direction}>{directionLabels[direction]}</option>)}
                  </select>
                </label>
                <label className="block">
                  <span className="flex justify-between text-xs font-black text-[#2F2F2F]"><span>Velocidad</span><span>{config.backgroundSpeed}</span></span>
                  <input type="range" min="0" max="160" step="5" value={config.backgroundSpeed} onChange={(event) => update('backgroundSpeed', Number(event.target.value))} className="mt-4 w-full accent-[#E49A02]" />
                </label>
                {config.backgroundType !== 'spiral' && (
                  <label className="block sm:col-span-2">
                    <span className="flex justify-between text-xs font-black text-[#2F2F2F]"><span>Tamaño del patrón</span><span>{config.stripeWidth}px</span></span>
                    <input type="range" min="16" max="120" step="2" value={config.stripeWidth} onChange={(event) => update('stripeWidth', Number(event.target.value))} className="mt-4 w-full accent-[#E49A02]" />
                  </label>
                )}
              </div>
            )}

            <div className="mt-5 grid grid-cols-2 gap-4">
              <label className="text-xs font-black text-[#2F2F2F]">Color claro<input type="color" value={config.backgroundColor} onChange={(event) => update('backgroundColor', event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-[#E9E7E7] bg-white p-1" /></label>
              <label className="text-xs font-black text-[#2F2F2F]">Color oscuro<input type="color" value={config.foregroundColor} onChange={(event) => update('foregroundColor', event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-[#E9E7E7] bg-white p-1" /></label>
            </div>
          </article>

          <article className="rounded-2xl border border-[#E9E7E7] bg-white p-5 sm:p-6">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-lg font-black text-[#171717]">Objeto</h2>
              <label className="inline-flex items-center gap-2 text-xs font-black text-[#747474]">
                <input type="checkbox" checked={config.objectEnabled} onChange={(event) => update('objectEnabled', event.target.checked)} className="size-4 accent-[#E49A02]" /> Mostrar pelota
              </label>
            </div>
            <div className={`mt-5 space-y-5 ${config.objectEnabled ? '' : 'pointer-events-none opacity-40'}`}>
              <label className="block">
                <span className="text-xs font-black text-[#2F2F2F]">Comportamiento</span>
                <select value={config.objectMode} onChange={(event) => update('objectMode', event.target.value as ExerciseConfig['objectMode'])} className="mt-2 h-11 w-full rounded-2xl border border-[#E9E7E7] bg-white px-3 text-sm">
                  <option value="fixed">Fijo al centro</option>
                  <option value="tracking">Seguimiento suave</option>
                  <option value="saccades">Sacadas</option>
                </select>
              </label>
              <label className="block">
                <span className="flex justify-between text-xs font-black text-[#2F2F2F]"><span>Tamaño</span><span>{config.objectSize}px</span></span>
                <input type="range" min="12" max="90" step="2" value={config.objectSize} onChange={(event) => update('objectSize', Number(event.target.value))} className="mt-4 w-full accent-[#E49A02]" />
              </label>

              {config.objectMode === 'tracking' && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="text-xs font-black text-[#2F2F2F]">Dirección<select value={config.objectDirection} onChange={(event) => update('objectDirection', event.target.value as 'horizontal' | 'vertical')} className="mt-2 h-11 w-full rounded-2xl border border-[#E9E7E7] bg-white px-3 text-sm"><option value="horizontal">Horizontal</option><option value="vertical">Vertical</option></select></label>
                  <label className="text-xs font-black text-[#2F2F2F]">Frecuencia: {config.objectSpeedHz.toFixed(1)} Hz<input type="range" min="0.1" max="1.5" step="0.1" value={config.objectSpeedHz} onChange={(event) => update('objectSpeedHz', Number(event.target.value))} className="mt-4 w-full accent-[#E49A02]" /></label>
                </div>
              )}

              {config.objectMode === 'saccades' && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="text-xs font-black text-[#2F2F2F]">Patrón<select value={config.saccadePattern} onChange={(event) => update('saccadePattern', event.target.value as ExerciseConfig['saccadePattern'])} className="mt-2 h-11 w-full rounded-2xl border border-[#E9E7E7] bg-white px-3 text-sm"><option value="horizontal">Lateral</option><option value="vertical">Arriba / abajo</option><option value="random">Aleatorio</option></select></label>
                  <label className="text-xs font-black text-[#2F2F2F]">Ritmo: {config.saccadeFrequencyHz.toFixed(1)} Hz<input type="range" min="0.2" max="2" step="0.1" value={config.saccadeFrequencyHz} onChange={(event) => update('saccadeFrequencyHz', Number(event.target.value))} className="mt-4 w-full accent-[#E49A02]" /></label>
                </div>
              )}

              {config.objectMode !== 'fixed' && (
                <label className="block">
                  <span className="flex justify-between text-xs font-black text-[#2F2F2F]"><span>Amplitud</span><span>{config.objectAmplitude}%</span></span>
                  <input type="range" min="10" max="45" step="1" value={config.objectAmplitude} onChange={(event) => update('objectAmplitude', Number(event.target.value))} className="mt-4 w-full accent-[#E49A02]" />
                </label>
              )}
            </div>
          </article>

          <article className="rounded-2xl border border-[#E9E7E7] bg-white p-5 sm:p-6">
            <h2 className="text-lg font-black text-[#171717]">Visualización</h2>
            <label className="mt-4 block text-xs font-black text-[#2F2F2F]">Modo de salida<select value={config.displayMode ?? 'standard'} onChange={(event) => update('displayMode', event.target.value as ExerciseConfig['displayMode'])} className="mt-2 h-11 w-full rounded-2xl border border-[#E9E7E7] bg-white px-3 text-sm"><option value="standard">Pantalla 2D</option><option value="vr_box">VR Box · celular dividido</option><option value="quest_browser">Meta Quest · navegador BETA</option></select></label>
            <p className="mt-3 text-[11px] leading-5 text-[#747474]">El modo VR Box crea dos vistas sincronizadas. El modo Quest actual funciona en el navegador del visor; WebXR inmersivo se validará con hardware.</p>
          </article>

          <article className="rounded-2xl border border-[#E9E7E7] bg-white p-5 sm:p-6">
            <h2 className="text-lg font-black text-[#171717]">Duración y vueltas</h2>
            <div className="mt-5 grid grid-cols-3 gap-3">
              {[
                ['durationSeconds', 'Ejercicio', 's', 10, 300],
                ['restSeconds', 'Descanso', 's', 0, 180],
                ['rounds', 'Vueltas', '', 1, 10],
              ].map(([key, label, unit, min, max]) => (
                <label key={String(key)} className="text-xs font-black text-[#2F2F2F]">
                  {String(label)}
                  <span className="relative mt-2 block">
                    <input type="number" min={Number(min)} max={Number(max)} value={Number(config[key as keyof ExerciseConfig])} onChange={(event) => update(key as 'durationSeconds' | 'restSeconds' | 'rounds', Number(event.target.value))} className="h-11 w-full rounded-2xl border border-[#E9E7E7] px-3 pr-7 text-sm" />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-[#747474]">{String(unit)}</span>
                  </span>
                </label>
              ))}
            </div>
            <div className="mt-5 border-t border-[#E9E7E7] pt-5"><label className="inline-flex items-center gap-2 text-xs font-black text-[#2F2F2F]"><input type="checkbox" checked={config.metronomeEnabled} onChange={(event)=>update('metronomeEnabled',event.target.checked)} className="size-4 accent-[#E49A02]"/> Activar metrónomo</label>{config.metronomeEnabled&&<label className="mt-4 block text-xs font-black text-[#2F2F2F]">Ritmo: {config.metronomeHz.toFixed(1)} Hz<input type="range" min="0.2" max="3" step="0.1" value={config.metronomeHz} onChange={(event)=>update('metronomeHz',Number(event.target.value))} className="mt-3 w-full accent-[#E49A02]"/></label>}</div>
          </article>
        </div>

        <div className="xl:sticky xl:top-[104px] xl:self-start">
          <article className="overflow-hidden rounded-2xl border border-[#E9E7E7] bg-white shadow-[0_16px_40px_rgba(21,54,60,0.07)]">
            <div className="flex items-center justify-between border-b border-[#E9E7E7] px-5 py-4">
              <div className="flex items-center gap-2"><Eye size={17} className="text-[#E49A02]" /><h2 className="text-sm font-black text-[#171717]">Vista previa continua</h2></div>
              <span className="rounded-full bg-[#FFF7E8] px-3 py-1 text-[10px] font-black text-[#A36B00]">EN VIVO</span>
            </div>
            <div className="aspect-video bg-[#081113]">
              <ExerciseCanvas config={config} className="size-full" />
            </div>
            <div className="p-5 sm:p-6">
              <input value={config.name} onChange={(event) => update('name', event.target.value)} className="h-12 w-full rounded-2xl border border-[#E9E7E7] px-4 text-sm font-black text-[#2F2F2F]" aria-label="Nombre del ejercicio" />
              <div className="mt-4 flex flex-wrap gap-2 text-[11px] font-black text-[#747474]">
                <span className="rounded-full bg-[#F7F6F4] px-3 py-1.5">{backgroundLabels[config.backgroundType]}</span>
                <span className="rounded-full bg-[#F7F6F4] px-3 py-1.5">{config.durationSeconds}s × {config.rounds}</span>
                <span className="rounded-full bg-[#F7F6F4] px-3 py-1.5">Objeto: {config.objectMode}</span>
              </div>
              <button type="button" onClick={() => setPlaying(true)} className="mt-5 flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-[#E49A02] text-sm font-black text-white shadow-[0_10px_22px_rgba(11,122,117,0.2)]">
                <Play size={18} /> Probar en pantalla completa
              </button>
            </div>
          </article>

          <aside className="mt-5 flex gap-3 rounded-2xl border border-[#E8CE99] bg-[#FFF7E8] p-5">
            <ShieldAlert className="mt-0.5 shrink-0 text-[#8A5B00]" size={20} />
            <p className="text-xs leading-5 text-[#8A5B00]">Los límites mostrados son controles técnicos iniciales, no parámetros clínicos validados. La configuración final requiere criterio profesional.</p>
          </aside>
        </div>
      </section>

      {playing && <ExercisePlayer config={config} onExit={() => setPlaying(false)} onSkip={() => setPlaying(false)} />}
    </div>
  )
}
