import { AlertTriangle, CheckCircle2, ClipboardCheck, Eye, FilePenLine, Save, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { definitionsFor } from '../studies/catalog'
import { normalizeMetricRow } from '../studies/normalization'
import type { ExtractedField, PageClassification, PatientMatchStatus } from './types'
import { pageClassificationLabels } from './types'
import { useConfirmExtraction, useDiscardExtraction, useManualExtraction, useSaveExtraction, useStudyExtraction } from './hooks'
import type { ExtractionReviewRecord } from './repository'
import { PrivateDocumentViewer } from './PrivateDocumentViewer'

const control = 'h-10 rounded-xl border border-[#cfddda] bg-white px-3 text-xs text-[#17363c]'

function normalizedField(field: ExtractedField, value: string) {
  if (!field.metricCode) return value.trim()
  const normalized = normalizeMetricRow({ clientId: field.clientId, metricCode: field.metricCode, rawValue: value, unitCode: field.unitCode, conditionCode: field.conditionCode, side: field.side, axis: '', trialNumber: '', sourceLocation: `Página ${field.pageNumber}` })
  return normalized.normalizedNumericValue !== null ? String(normalized.normalizedNumericValue) : normalized.normalizedTextValue ?? value.trim()
}

export function ClinicalExtractionReview({ studyId }: { studyId: string }) {
  const query = useStudyExtraction(studyId)
  const save = useSaveExtraction(studyId)
  const confirm = useConfirmExtraction(studyId)
  const manual = useManualExtraction(studyId)
  const discard = useDiscardExtraction(studyId)
  const [draft, setDraft] = useState<ExtractionReviewRecord | null>(null)
  const [pageNumber, setPageNumber] = useState(1)
  const [selectedField, setSelectedField] = useState('')
  const [onlyReview, setOnlyReview] = useState(false)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  useEffect(() => { if (query.data) { setDraft(query.data); setPageNumber(query.data.sectionPageNumbers[0] ?? 1) } }, [query.data])

  const counts = useMemo(() => ({
    read: draft?.fields.filter((field) => field.status === 'read' && field.professionalValue).length ?? 0,
    review: draft?.fields.filter((field) => field.status === 'review').length ?? 0,
    missing: draft?.fields.filter((field) => field.required && !field.professionalValue.trim()).length ?? 0,
    unconfirmed: draft?.fields.filter((field) => field.professionalValue.trim() && !field.confirmed).length ?? 0,
  }), [draft])
  const page = draft?.pages.find((item) => item.pageNumber === pageNumber)
  const activeField = draft?.fields.find((field) => field.clientId === selectedField)
  const visibleFields = useMemo(() => draft?.fields.filter((field) => !onlyReview || field.status !== 'read' || !field.confirmed) ?? [], [draft, onlyReview])
  const groups = useMemo(() => {
    const map = new Map<string, ExtractedField[]>()
    for (const field of visibleFields) { const key = `${field.studyType}|${field.group}`; map.set(key, [...(map.get(key) ?? []), field]) }
    return [...map.entries()]
  }, [visibleFields])
  const blocking = counts.missing > 0 || counts.unconfirmed > 0 || draft?.patientMatchStatus === 'mismatch' || draft?.pages.some((item) => item.classification === 'unrecognized')

  const updateField = (clientId: string, updater: (field: ExtractedField) => ExtractedField) => setDraft((current) => current ? { ...current, fields: current.fields.map((field) => field.clientId === clientId ? updater(field) : field) } : current)
  const updateValue = (field: ExtractedField, value: string) => updateField(field.clientId, (current) => ({ ...current, professionalValue: value, normalizedValue: normalizedField(current, value), status: value ? 'review' : 'unrecognized', confirmed: false }))
  const updateClassification = (targetPage: number, classification: PageClassification) => setDraft((current) => current ? { ...current, pages: current.pages.map((item) => item.pageNumber === targetPage ? { ...item, classification } : item) } : current)
  const updateMatch = (status: PatientMatchStatus) => setDraft((current) => current ? { ...current, patientMatchStatus: status } : current)

  const saveDraft = async () => { if (!draft) return; setError(''); try { await save.mutateAsync(draft); setNotice('Borrador guardado. Ningún valor se marcó como definitivo.') } catch (caught) { setError(caught instanceof Error ? caught.message : 'No fue posible guardar el borrador.') } }
  const confirmDraft = async () => { if (!draft || blocking) return; setError(''); try { await save.mutateAsync(draft); await confirm.mutateAsync(draft.id); setNotice('Transcripción confirmada por el profesional. Las secciones vinculadas quedaron revisadas.') } catch (caught) { setError(caught instanceof Error ? caught.message : 'No fue posible confirmar la transcripción.') } }
  const chooseManual = async () => { if (!draft || !window.confirm('¿Continuar con carga completamente manual? Los valores automáticos no serán confirmados.')) return; setError(''); try { await manual.mutateAsync(draft.id); setDraft({ ...draft, status: 'manual' }); setNotice('Carga manual habilitada. Usá la tabla manual debajo de esta sección.') } catch (caught) { setError(caught instanceof Error ? caught.message : 'No fue posible cambiar a carga manual.') } }
  const discardDraft = async () => { if (!draft || !window.confirm('¿Descartar el borrador automático? El original privado se conservará.')) return; setError(''); try { await discard.mutateAsync(draft.id); setDraft({ ...draft, status: 'discarded' }); setNotice('Borrador descartado. El original privado se conserva.') } catch (caught) { setError(caught instanceof Error ? caught.message : 'No fue posible descartar el borrador.') } }

  if (query.isPending) return <div className="rounded-3xl border border-[#dce7e5] bg-white p-6 text-sm text-[#60777d]">Buscando borrador automático…</div>
  if (!draft) return null
  const locked = draft.status !== 'review'
  return <section className="space-y-5">
    <div className="rounded-3xl border border-[#e2c684] bg-[#fff6e4] p-5 text-sm leading-6 text-[#805b16]"><strong>Extracción automática preliminar.</strong> Requiere revisión y confirmación profesional. ONUr no interpreta el estudio, no diagnostica y no recomienda tratamientos.</div>
    {draft.patientMatchStatus === 'mismatch' && <div className="rounded-3xl border border-[#efc3c7] bg-[#fceced] p-5"><div className="flex gap-3"><AlertTriangle className="shrink-0 text-[#a94952]"/><div><p className="text-sm font-black text-[#8d3c45]">Posible discrepancia de identidad</p><p className="mt-1 text-xs leading-5 text-[#8d3c45]">Hay {draft.mismatchFields.length} campo(s) distintos respecto del paciente seleccionado. No se modificó el perfil ni se cambió de paciente.</p></div></div><label className="mt-4 flex items-start gap-3 text-xs font-bold text-[#8d3c45]"><input type="checkbox" checked={false} onChange={(event) => updateMatch(event.target.checked ? 'confirmed_by_professional' : 'mismatch')}/> Confirmo, bajo mi responsabilidad profesional, que el documento corresponde al paciente seleccionado.</label></div>}
    {locked && <div className="flex gap-3 rounded-3xl border border-[#bcded9] bg-[#e8f5f2] p-5"><CheckCircle2 className="text-[#08746e]"/><p className="text-sm font-black text-[#075e5a]">Extracción en estado: {draft.status === 'confirmed' ? 'confirmada' : draft.status === 'manual' ? 'carga manual' : 'descartada'}.</p></div>}
    <div className="grid gap-5 xl:grid-cols-[.92fr_1.08fr]">
      <section className="overflow-hidden rounded-3xl border border-[#dce7e5] bg-white">
        <div className="border-b border-[#e8efed] p-5"><h2 className="font-black text-[#123238]">Visor del original privado</h2><p className="mt-1 text-xs text-[#71878c]">Página {pageNumber} de {draft.pages.length} · {draft.sourceFilename}</p></div>
        <div className="relative min-h-[540px] bg-[#edf2f1]"><PrivateDocumentViewer url={draft.documentUrl} mimeType={draft.mimeType} pageNumber={pageNumber} region={activeField?.pageNumber === pageNumber ? activeField.region : null}/></div>
        <div className="flex gap-2 overflow-x-auto border-t border-[#e8efed] p-4">{draft.pages.map((item) => <button key={item.pageNumber} type="button" onClick={() => setPageNumber(item.pageNumber)} className={`min-w-24 rounded-xl border p-3 text-left text-xs ${item.pageNumber === pageNumber ? 'border-[#0b7a75] bg-[#e8f5f2]' : 'border-[#dce7e5]'}`}><strong>Pág. {item.pageNumber}</strong><span className="mt-1 block text-[10px] text-[#60777d]">{pageClassificationLabels[item.classification]}</span></button>)}</div>
        {page && <label className="block border-t border-[#e8efed] p-4 text-xs font-black text-[#29474d]">Clasificación de página<select disabled={locked} value={page.classification} onChange={(event) => updateClassification(page.pageNumber, event.target.value as PageClassification)} className={`${control} mt-2 w-full`}>{Object.entries(pageClassificationLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>}
      </section>

      <section className="rounded-3xl border border-[#dce7e5] bg-white">
        <div className="border-b border-[#e8efed] p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-black text-[#123238]">Campos extraídos</h2><p className="mt-1 text-xs text-[#71878c]">Original, normalizado y corrección profesional se conservan por separado.</p></div><label className="flex items-center gap-2 text-xs font-black text-[#29474d]"><input type="checkbox" checked={onlyReview} onChange={(event) => setOnlyReview(event.target.checked)}/> Solo revisar</label></div><div className="mt-4 flex flex-wrap gap-2 text-[11px] font-black"><span className="rounded-full bg-[#e8f5f2] px-3 py-1 text-[#08746e]">Leídos {counts.read}</span><span className="rounded-full bg-[#fff6e4] px-3 py-1 text-[#98620b]">Dudosos {counts.review}</span><span className="rounded-full bg-[#fceced] px-3 py-1 text-[#a94952]">Faltantes {counts.missing}</span><span className="rounded-full bg-[#f5f8f7] px-3 py-1 text-[#60777d]">Sin confirmar {counts.unconfirmed}</span></div></div>
        {counts.missing > 0 && <div className="border-b border-[#efc3c7] bg-[#fff7f7] p-5"><p className="text-xs font-black uppercase tracking-wide text-[#a94952]">Datos que necesito que completes</p><p className="mt-2 text-xs text-[#8d3c45]">{draft.fields.filter((field) => field.required && !field.professionalValue.trim()).map((field) => field.label).join(' · ')}</p></div>}
        <div className="max-h-[760px] space-y-5 overflow-y-auto p-5">{groups.map(([key, fields]) => { const [studyType, group] = key.split('|'); return <div key={key}><p className="mb-2 text-[10px] font-black uppercase tracking-[.13em] text-[#71878c]">{studyType === 'posturography' ? 'Posturografía' : 'Vestibular / vHIT'} · {group}</p><div className="space-y-3">{fields.map((field) => <article key={field.clientId} onClick={() => { setSelectedField(field.clientId); setPageNumber(field.pageNumber) }} className={`rounded-2xl border p-4 ${selectedField === field.clientId ? 'border-[#e39a24] bg-[#fffbf2]' : 'border-[#e1e9e7]'}`}>
            <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-black text-[#29474d]">{field.label}{field.required ? ' *' : ''}</p><p className="mt-1 text-[10px] text-[#71878c]">Pág. {field.pageNumber} · confianza {Math.round(field.confidence * 100)}% · {field.extractorMethod} {field.extractorVersion}</p></div><span className={`rounded-full px-2 py-1 text-[9px] font-black uppercase ${field.status === 'read' ? 'bg-[#e8f5f2] text-[#08746e]' : field.status === 'review' ? 'bg-[#fff6e4] text-[#98620b]' : 'bg-[#fceced] text-[#a94952]'}`}>{field.status === 'read' ? 'Leído' : field.status === 'review' ? 'Revisar' : 'No reconocido'}</span></div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2"><label className="text-[10px] font-black text-[#71878c]">RAW EXACTO<input readOnly value={field.rawValue} className={`${control} mt-1 w-full bg-[#f5f8f7]`}/></label><label className="text-[10px] font-black text-[#29474d]">VALOR PROFESIONAL<input disabled={locked} value={field.professionalValue} onChange={(event) => updateValue(field, event.target.value)} className={`${control} mt-1 w-full`}/></label></div>
            {field.metricCode && <div className="mt-2 grid gap-2 sm:grid-cols-2"><label className="text-[10px] font-black text-[#71878c]">MÉTRICA<select disabled={locked} value={field.metricCode} onChange={(event) => updateField(field.clientId, (current) => ({ ...current, metricCode: event.target.value, confirmed: false }))} className={`${control} mt-1 w-full`}><option value="">Sin asignar</option>{definitionsFor(field.studyType).map((definition) => <option key={definition.code} value={definition.code}>{definition.label}</option>)}</select></label><label className="text-[10px] font-black text-[#71878c]">NORMALIZADO<input readOnly value={field.normalizedValue} className={`${control} mt-1 w-full bg-[#f5f8f7]`}/></label></div>}
            <label className="mt-3 flex items-start gap-2 text-xs font-black text-[#29474d]"><input disabled={locked || !field.professionalValue.trim()} type="checkbox" checked={field.confirmed} onChange={(event) => updateField(field.clientId, (current) => ({ ...current, confirmed: event.target.checked, status: event.target.checked ? 'read' : 'review' }))}/> Confirmo esta transcripción</label>
          </article>)}</div></div> })}</div>
      </section>
    </div>
    {error && <p role="alert" className="rounded-2xl bg-[#fceced] p-4 text-sm font-bold text-[#a94952]">{error}</p>}{notice && <p role="status" className="rounded-2xl bg-[#e8f5f2] p-4 text-sm font-bold text-[#08746e]">{notice}</p>}
    {!locked && <div className="flex flex-wrap justify-end gap-3"><button type="button" onClick={discardDraft} className="inline-flex items-center gap-2 rounded-2xl border border-[#efc3c7] px-4 py-3 text-xs font-black text-[#a94952]"><Trash2 size={15}/> Descartar borrador</button><button type="button" onClick={chooseManual} className="inline-flex items-center gap-2 rounded-2xl border border-[#cfddda] px-4 py-3 text-xs font-black text-[#29474d]"><FilePenLine size={15}/> Carga manual</button><button type="button" onClick={saveDraft} className="inline-flex items-center gap-2 rounded-2xl border border-[#0b7a75] px-4 py-3 text-xs font-black text-[#0b7a75]"><Save size={15}/> Guardar borrador</button><button type="button" disabled={Boolean(blocking)} onClick={confirmDraft} className="inline-flex items-center gap-2 rounded-2xl bg-[#0b7a75] px-5 py-3 text-xs font-black text-white disabled:opacity-50"><ClipboardCheck size={15}/> Confirmar transcripción</button></div>}
    {blocking && !locked && <p className="flex items-center justify-end gap-2 text-xs font-bold text-[#98620b]"><Eye size={14}/> Completá y confirmá los campos presentes, resolvé identidad y clasificá todas las páginas.</p>}
  </section>
}
