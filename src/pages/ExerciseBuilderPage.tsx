import { FolderOpen, RotateCcw, Save, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { PageHeader } from '../components/PageHeader'
import { analyzeExerciseCompatibility } from '../features/exercise/compatibility'
import { defaultExerciseConfig, type ExerciseConfig } from '../features/exercise/types'
import { SessionExerciseEditor } from '../features/sessions/SessionExerciseEditor'
import { useDeleteExerciseTemplate, useExerciseTemplates, useSaveExerciseTemplate } from '../features/templates/hooks'

function doseLabel(config: ExerciseConfig) {
  return config.doseMode === 'time' ? `${config.durationSeconds} s` : `${config.targetRepetitions} rep.`
}

export function ExerciseBuilderPage() {
  const [config, setConfig] = useState<ExerciseConfig>(defaultExerciseConfig)
  const [notice, setNotice] = useState('')
  const { data: templates = [] } = useExerciseTemplates()
  const saveTemplate = useSaveExerciseTemplate()
  const deleteTemplate = useDeleteExerciseTemplate()
  const compatibility = analyzeExerciseCompatibility(config)

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Constructor de ejercicios"
        title="Crear ejercicio"
        description="Configurá el estímulo o la tarea física, su dosis y el modo de confirmación. Toda prescripción necesita revisión profesional antes de asignarse."
        actions={<>
          <button type="button" onClick={() => { setConfig(defaultExerciseConfig); setNotice('') }} className="inline-flex items-center gap-2 rounded-2xl border border-[#E9E7E7] bg-white px-4 py-3 text-sm font-black text-[#2F2F2F]"><RotateCcw size={17}/> Restablecer</button>
          <button type="button" disabled={saveTemplate.isPending || (!compatibility.valid && config.purpose !== 'custom_free')} onClick={async () => { try { await saveTemplate.mutateAsync(config); setNotice(config.purpose === 'custom_free' ? 'Plantilla Libre guardada. Requiere revisión profesional antes de asignarse.' : 'Plantilla guardada en la biblioteca.') } catch (caught) { setNotice(caught instanceof Error ? caught.message : 'No fue posible guardar.') } }} className="inline-flex items-center gap-2 rounded-2xl bg-[#E49A02] px-4 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-50"><Save size={17}/> Guardar plantilla</button>
        </>}
      />

      {notice && <p className="rounded-2xl bg-[#FFF7E8] px-4 py-3 text-sm font-bold text-[#A36B00]">{notice}</p>}

      <section className="rounded-2xl border border-[#E9E7E7] bg-white p-5">
        <div className="flex items-center gap-2"><FolderOpen size={18} className="text-[#E49A02]"/><h2 className="text-sm font-black text-[#171717]">Biblioteca de ejercicios</h2></div>
        <div className="mt-4 flex gap-3 overflow-x-auto pb-1">
          {templates.map((template) => <div key={template.id} className="flex min-w-64 items-center gap-2 rounded-2xl border border-[#E9E7E7] p-3">
            <button type="button" onClick={() => { setConfig({ ...template.config }); setNotice(`Plantilla “${template.name}” cargada.`) }} className="min-w-0 flex-1 text-left">
              <p className="truncate text-xs font-black text-[#2F2F2F]">{template.name}</p>
              <p className="mt-1 text-[10px] text-[#747474]">{doseLabel(template.config)} × {template.config.rounds} · {template.config.advanceMode === 'manual' ? 'avance manual' : 'avance automático'}</p>
            </button>
            <button type="button" onClick={() => deleteTemplate.mutate(template.id)} className="grid size-8 place-items-center rounded-xl text-[#a94952]" aria-label={`Eliminar ${template.name}`}><Trash2 size={15}/></button>
          </div>)}
        </div>
      </section>

      <SessionExerciseEditor config={config} isFirst onChange={setConfig}/>
    </div>
  )
}
