import { Glasses, WandSparkles } from 'lucide-react'
import type { ExerciseConfig } from '../exercise/types'
import { analyzeSessionSequence, orderExercisesForVrBox, VR_BOX_TRANSITION_SECONDS } from './sequence'

export function SessionSequenceWarning({ exercises, onReorder }: { exercises: ExerciseConfig[]; onReorder: (exercises: ExerciseConfig[]) => void }) {
  const analysis = analyzeSessionSequence(exercises)
  if (!analysis.mixesRepetitionsAndVrBox) return null

  return <aside className="mb-5 rounded-2xl border border-[#E8CE99] bg-[#FFF7E8] p-5 text-[#8A5B00]">
    <div className="flex gap-3">
      <Glasses className="mt-0.5 shrink-0" size={20}/>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-black">Esta sesión mezcla repeticiones y VR Box</p>
        <p className="mt-2 text-xs leading-5">Las repeticiones se confirman con el celular fuera del visor. La plataforma agregará {VR_BOX_TRANSITION_SECONDS} segundos para colocar o retirar el VR Box en cada cambio.</p>
        <p className="mt-2 text-xs font-bold">{analysis.optimizedForVrBox ? `El orden actual deja las repeticiones antes del bloque VR y requiere ${analysis.visorChanges} cambios de visor.` : `El orden actual requiere ${analysis.visorChanges} cambios de visor. Se recomienda realizar primero las repeticiones y dejar el bloque VR para el final.`}</p>
        {!analysis.optimizedForVrBox && <button type="button" onClick={() => onReorder(orderExercisesForVrBox(exercises))} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#8A5B00] px-4 py-3 text-xs font-black text-white"><WandSparkles size={15}/> Ordenar para usar el visor una sola vez</button>}
      </div>
    </div>
  </aside>
}
