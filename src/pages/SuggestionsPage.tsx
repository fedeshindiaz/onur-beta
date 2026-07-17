import { BookOpenCheck, Check, Edit3, ExternalLink, Save, X } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader } from '../components/PageHeader'
import { StatusBadge } from '../components/StatusBadge'
import { useReviewSuggestion, useStatisticalSuggestions } from '../features/studies/hooks'

export function SuggestionsPage() {
  const { data: suggestions = [], isPending, error: loadError } = useStatisticalSuggestions()
  const review = useReviewSuggestion()
  const [editingId, setEditingId] = useState('')
  const [professionalText, setProfessionalText] = useState('')
  const [error, setError] = useState('')

  const decide = async (id: string, status: 'accepted' | 'edited' | 'discarded', text = '') => {
    setError('')
    try {
      await review.mutateAsync({ id, status, professionalText: text })
      setEditingId('')
      setProfessionalText('')
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'No fue posible registrar la revisión.') }
  }

  return <div className="space-y-7">
    <PageHeader eyebrow="Motor estadístico" title="Sugerencias para revisar" description="Toda salida automática permanece interna hasta que el profesional la acepte, edite o descarte."/>
    <div className="rounded-3xl border border-[#bcded9] bg-[#e8f5f2] p-5 text-sm leading-6 text-[#286b67]"><strong>Resultado estadístico orientativo.</strong> Requiere correlación clínica y revisión profesional. No constituye diagnóstico ni recomendación médica.</div>
    {error && <p role="alert" className="rounded-2xl bg-[#fceced] p-4 text-sm font-bold text-[#a94952]">{error}</p>}
    {loadError && <p role="alert" className="rounded-2xl bg-[#fceced] p-4 text-sm font-bold text-[#a94952]">{loadError instanceof Error ? loadError.message : 'No fue posible cargar las sugerencias.'}</p>}
    {isPending ? <p className="text-sm text-[#60777d]">Cargando sugerencias…</p> : suggestions.length === 0 ? <div className="rounded-3xl border border-dashed border-[#c8d9d6] bg-white p-10 text-center"><BookOpenCheck className="mx-auto text-[#8aa19e]" size={30}/><p className="mt-4 text-sm font-black text-[#29474d]">No hay sugerencias pendientes</p><p className="mt-2 text-xs leading-5 text-[#71878c]">Se generan únicamente después de confirmar métricas estructuradas y ejecutar una regla aprobada.</p></div> : <section className="space-y-5">
      {suggestions.map((suggestion) => <article key={suggestion.id} className="rounded-3xl border border-[#dce7e5] bg-white p-5 shadow-[0_12px_30px_rgba(21,54,60,0.05)] sm:p-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between"><div className="flex gap-4"><span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[#e8f5f2] text-[#08746e]"><BookOpenCheck size={20}/></span><div><div className="flex flex-wrap items-center gap-3"><h2 className="text-lg font-black text-[#123238]">{suggestion.patientName}</h2><StatusBadge status={suggestion.status}/></div><p className="mt-1 text-xs text-[#71878c]">{suggestion.studyLabel} · {new Date(suggestion.createdAt).toLocaleString('es-UY')}</p></div></div><Link to={`/app/estudios/${suggestion.studyId}/revisar`} className="inline-flex items-center gap-2 text-xs font-black text-[#0b7a75]">Ver estudio <ExternalLink size={14}/></Link></div>
        <div className="mt-6 grid gap-4 lg:grid-cols-[0.72fr_1.28fr]"><div className="rounded-2xl bg-[#f5f8f7] p-4"><p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#71878c]">Regla ejecutada</p><p className="mt-2 text-sm font-black text-[#29474d]">{suggestion.ruleCode}</p><p className="mt-1 text-xs font-bold text-[#60777d]">{suggestion.ruleTitle}</p><p className="mt-3 text-xs leading-5 text-[#667d82]">Las entradas, el resultado observado y la versión quedan vinculados al registro.</p></div><div className="rounded-2xl border border-[#dce7e5] p-4"><p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#71878c]">Hallazgo descriptivo</p><p className="mt-2 text-sm leading-6 text-[#29474d]">{suggestion.summary}</p><p className="mt-3 text-xs leading-5 text-[#936611]"><strong>Limitación:</strong> {suggestion.limitation}</p></div></div>
        {suggestion.professionalText && <div className="mt-4 rounded-2xl border border-[#bcded9] bg-[#f2faf8] p-4"><p className="text-[10px] font-black uppercase tracking-[.14em] text-[#0b7a75]">Texto profesional</p><p className="mt-2 text-sm leading-6 text-[#29474d]">{suggestion.professionalText}</p></div>}
        {editingId === suggestion.id && <div className="mt-5 rounded-2xl bg-[#f5f8f7] p-4"><label className="text-xs font-black text-[#29474d]">Redacción profesional editable<textarea autoFocus className="mt-2 min-h-28 w-full rounded-2xl border border-[#cfddda] bg-white p-4 text-sm font-normal" value={professionalText} onChange={(event) => setProfessionalText(event.target.value)} placeholder="Reescribí el hallazgo con tu interpretación profesional, sin ocultar las limitaciones."/></label><div className="mt-3 flex justify-end"><button type="button" disabled={!professionalText.trim() || review.isPending} onClick={() => decide(suggestion.id, 'edited', professionalText.trim())} className="inline-flex items-center gap-2 rounded-2xl bg-[#123238] px-4 py-2.5 text-xs font-black text-white disabled:opacity-50"><Save size={15}/> Guardar texto revisado</button></div></div>}
        <div className="mt-6 flex flex-wrap justify-end gap-2"><button type="button" disabled={review.isPending} onClick={() => decide(suggestion.id, 'discarded')} className="inline-flex items-center gap-2 rounded-2xl border border-[#d6e1df] px-4 py-2.5 text-xs font-black text-[#667d82]"><X size={15}/> Descartar</button><button type="button" disabled={review.isPending} onClick={() => { setEditingId(suggestion.id); setProfessionalText(suggestion.professionalText || suggestion.summary) }} className="inline-flex items-center gap-2 rounded-2xl border border-[#b9d5d1] px-4 py-2.5 text-xs font-black text-[#0b7a75]"><Edit3 size={15}/> Editar texto</button><button type="button" disabled={review.isPending} onClick={() => decide(suggestion.id, 'accepted')} className="inline-flex items-center gap-2 rounded-2xl bg-[#0b7a75] px-4 py-2.5 text-xs font-black text-white"><Check size={15}/> Aceptar</button></div>
      </article>)}
    </section>}
  </div>
}
