import { AlertTriangle, CheckCircle2, ChevronLeft, ClipboardPaste, LockKeyhole, Plus, Save, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { PageHeader } from '../components/PageHeader'
import { StatusBadge } from '../components/StatusBadge'
import { ClinicalExtractionReview } from '../features/extraction/ClinicalExtractionReview'
import { useStudyExtraction } from '../features/extraction/hooks'
import { definitionsFor, metricLabel, unitOptions } from '../features/studies/catalog'
import { useFinalizeStudy, useSaveStudyImport, useStudyReview } from '../features/studies/hooks'
import { normalizeMetricRows, parseMetricTable } from '../features/studies/normalization'
import type { MetricRowInput } from '../features/studies/types'

function emptyMetric(): MetricRowInput {
  return { clientId: crypto.randomUUID(), metricCode: '', rawValue: '', unitCode: '', conditionCode: '', side: '', axis: '', trialNumber: '', sourceLocation: 'Transcripción manual' }
}

const fieldClass = 'h-10 min-w-28 rounded-xl border border-[#cfddda] bg-white px-3 text-xs text-[#17363c]'

export function StudyReviewPage() {
  const { studyId = '' } = useParams()
  const { data: study, isPending, error: loadError } = useStudyReview(studyId)
  const { data: extraction, isPending: extractionPending } = useStudyExtraction(studyId)
  const save = useSaveStudyImport(studyId)
  const finalize = useFinalizeStudy(studyId)
  const [rows, setRows] = useState<MetricRowInput[]>([])
  const [qualityNotes, setQualityNotes] = useState('')
  const [interpretable, setInterpretable] = useState(false)
  const [pasteOpen, setPasteOpen] = useState(false)
  const [pasteText, setPasteText] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    if (!study) return
    setRows(study.metrics.length ? study.metrics : [emptyMetric()])
    setQualityNotes(study.qualityNotes)
    setInterpretable(study.interpretable)
    setDirty(false)
  }, [study])

  const normalized = useMemo(() => normalizeMetricRows(rows), [rows])
  const counts = useMemo(() => ({
    ok: normalized.filter((row) => row.qualityStatus === 'ok').length,
    review: normalized.filter((row) => row.qualityStatus === 'review').length,
    quarantine: normalized.filter((row) => row.qualityStatus === 'quarantine').length,
    blocked: normalized.filter((row) => row.qualityStatus === 'blocked').length,
    notApplicable: normalized.filter((row) => row.qualityStatus === 'not_applicable').length,
    issues: normalized.reduce((total, row) => total + row.issues.length, 0),
  }), [normalized])
  const hasBlockingValues = counts.blocked + counts.quarantine > 0

  const update = (id: string, field: keyof MetricRowInput, value: string) => {
    setRows((current) => current.map((row) => row.clientId === id ? { ...row, [field]: value } : row))
    setNotice('')
    setDirty(true)
  }

  const importTable = () => {
    setError('')
    try {
      const imported = parseMetricTable(pasteText)
      setRows((current) => [...current.filter((row) => row.metricCode || row.rawValue), ...imported])
      setDirty(true)
      setPasteText('')
      setPasteOpen(false)
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'No fue posible leer la tabla.') }
  }

  const confirm = async () => {
    if (!study) return
    if (!rows.some((row) => row.metricCode || row.rawValue)) { setError('Agregá al menos una métrica.'); return }
    setError(''); setNotice('')
    try {
      const result = await save.mutateAsync({ studyId: study.id, metrics: normalized, qualityNotes, interpretable: interpretable && !hasBlockingValues })
      setNotice(`Importación confirmada: ${result.metricCount} métricas, ${result.issueCount} incidencias y ${result.suggestionCount} sugerencias descriptivas generadas.`)
      setDirty(false)
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'No fue posible confirmar la importación.') }
  }

  const finalizeReview = async () => {
    if (!study || dirty || !window.confirm('¿Finalizar este estudio? Los valores, incidencias y metadatos quedarán bloqueados y no podrán editarse.')) return
    setError('');setNotice('')
    try { const hash=await finalize.mutateAsync();setNotice(`Estudio finalizado y bloqueado. Huella: ${hash.slice(0,12)}…`) }
    catch(caught){setError(caught instanceof Error?caught.message:'No fue posible finalizar el estudio.')}
  }

  if (isPending || extractionPending) return <p className="text-sm text-[#60777d]">Cargando estudio…</p>
  if (loadError || !study) return <p role="alert" className="rounded-2xl bg-[#fceced] p-4 text-sm font-bold text-[#a94952]">{loadError instanceof Error ? loadError.message : 'Estudio no encontrado.'}</p>
  const definitions = definitionsFor(study.studyType)

  if (extraction && extraction.status !== 'manual') return <div className="space-y-7">
    <Link to={`/app/pacientes/${study.patientId}`} className="inline-flex items-center gap-2 text-xs font-black text-[#0b7a75]"><ChevronLeft size={16}/> Volver al paciente</Link>
    <PageHeader eyebrow="Estudio clínico" title={`Revisar ${study.studyType === 'posturography' ? 'posturografía' : 'vHIT'}`} description={`${study.patientName} · ${study.performedAt.slice(0, 10)} · ${study.sourceFilename}`}/>
    <ClinicalExtractionReview studyId={study.id}/>
  </div>

  return <div className="space-y-7">
    <Link to={`/app/pacientes/${study.patientId}`} className="inline-flex items-center gap-2 text-xs font-black text-[#0b7a75]"><ChevronLeft size={16}/> Volver al paciente</Link>
    <PageHeader eyebrow="Importación estructurada" title={`Revisar ${study.studyType === 'posturography' ? 'posturografía' : 'vHIT'}`} description={`${study.patientName} · ${study.performedAt.slice(0, 10)} · ${study.sourceFilename}`}/>
    {study.status==='finalized'&&<div className="flex gap-3 rounded-3xl border border-[#bcded9] bg-[#e8f5f2] p-5"><LockKeyhole className="shrink-0 text-[#08746e]" size={20}/><div><p className="text-sm font-black text-[#075e5a]">Estudio finalizado</p><p className="mt-1 text-xs leading-5 text-[#3e716f]">La revisión quedó bloqueada para preservar el registro confirmado. Las sugerencias profesionales pueden seguir revisándose por separado.</p></div></div>}

    <fieldset disabled={study.status==='finalized'||extraction?.status==='review'||extraction?.status==='discarded'} className="contents disabled:opacity-90">

    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <article className="rounded-3xl border border-[#dce7e5] bg-white p-5"><p className="text-[10px] font-black uppercase tracking-[.14em] text-[#71878c]">Protocolo</p><p className="mt-2 text-sm font-black text-[#29474d]">{study.protocolCode} · v{study.protocolVersion}</p><p className="mt-1 text-xs text-[#71878c]">{study.deviceName || 'Equipo no informado'}</p></article>
      <article className="rounded-3xl border border-[#dce7e5] bg-white p-5"><p className="text-[10px] font-black uppercase tracking-[.14em] text-[#71878c]">Valores utilizables</p><p className="mt-2 text-2xl font-black text-[#27734c]">{counts.ok}</p><p className="mt-1 text-xs text-[#71878c]">Sin incidencias abiertas</p></article>
      <article className="rounded-3xl border border-[#dce7e5] bg-white p-5"><p className="text-[10px] font-black uppercase tracking-[.14em] text-[#71878c]">A revisar</p><p className="mt-2 text-2xl font-black text-[#98620b]">{counts.review}</p><p className="mt-1 text-xs text-[#71878c]">Requieren confirmación</p></article>
      <article className="rounded-3xl border border-[#dce7e5] bg-white p-5"><p className="text-[10px] font-black uppercase tracking-[.14em] text-[#71878c]">Bloqueados / cuarentena</p><p className="mt-2 text-2xl font-black text-[#a94952]">{counts.blocked + counts.quarantine}</p><p className="mt-1 text-xs text-[#71878c]">No participan en sugerencias</p></article>
    </section>

    <div className="rounded-3xl border border-[#bcded9] bg-[#e8f5f2] p-5 text-sm leading-6 text-[#286b67]"><strong>Resultado estadístico orientativo.</strong> Requiere correlación clínica y revisión profesional. No constituye diagnóstico ni recomendación médica.</div>

    <section className="rounded-3xl border border-[#dce7e5] bg-white">
      <div className="flex flex-col gap-4 border-b border-[#e8efed] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div><h2 className="text-lg font-black text-[#123238]">Valor original y normalizado</h2><p className="mt-1 text-xs leading-5 text-[#71878c]">El original nunca se sobrescribe. La normalización usa la regla onur-normalization-1.0.</p></div>
        <div className="flex flex-wrap gap-2"><button type="button" onClick={() => setPasteOpen((value) => !value)} className="inline-flex items-center gap-2 rounded-2xl border border-[#cfddda] px-4 py-2.5 text-xs font-black text-[#29474d]"><ClipboardPaste size={15}/> Pegar tabla</button><button type="button" onClick={() => {setRows((current) => [...current, emptyMetric()]);setDirty(true)}} className="inline-flex items-center gap-2 rounded-2xl bg-[#0b7a75] px-4 py-2.5 text-xs font-black text-white"><Plus size={15}/> Agregar fila</button></div>
      </div>

      {pasteOpen && <div className="border-b border-[#e8efed] bg-[#f8fbfa] p-5 sm:p-6"><label className="text-xs font-black text-[#29474d]">Tabla CSV, punto y coma o tabulaciones<textarea value={pasteText} onChange={(event) => setPasteText(event.target.value)} className="mt-2 min-h-32 w-full rounded-2xl border border-[#cfddda] bg-white p-4 font-mono text-xs" placeholder={'metrica;valor;unidad;condicion;lado;eje;repeticion;origen\ncondition_score;82,5;percent;A;;;1;Página 1'}/></label><div className="mt-3 flex justify-end"><button type="button" onClick={importTable} className="rounded-2xl bg-[#123238] px-4 py-2.5 text-xs font-black text-white">Importar filas</button></div></div>}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1280px] text-left">
          <thead className="bg-[#f5f8f7] text-[10px] font-black uppercase tracking-[.12em] text-[#71878c]"><tr><th className="px-4 py-3">Métrica</th><th className="px-3 py-3">Valor original</th><th className="px-3 py-3">Unidad</th><th className="px-3 py-3">Condición</th><th className="px-3 py-3">Lado</th><th className="px-3 py-3">Eje</th><th className="px-3 py-3">Rep.</th><th className="px-3 py-3">Ubicación</th><th className="px-3 py-3">Normalizado / calidad</th><th className="px-3 py-3"></th></tr></thead>
          <tbody className="divide-y divide-[#e8efed]">{normalized.map((row) => <tr key={row.clientId} className="align-top">
            <td className="p-3 pl-4"><select aria-label="Métrica" className={`${fieldClass} w-52`} value={row.metricCode} onChange={(event) => update(row.clientId, 'metricCode', event.target.value)}><option value="">Seleccionar…</option>{definitions.map((definition) => <option key={definition.code} value={definition.code}>{definition.label}</option>)}</select></td>
            <td className="p-3"><input aria-label="Valor original" className={`${fieldClass} w-32`} value={row.rawValue} onChange={(event) => update(row.clientId, 'rawValue', event.target.value)}/></td>
            <td className="p-3"><select aria-label="Unidad" className={`${fieldClass} w-32`} value={row.unitCode} onChange={(event) => update(row.clientId, 'unitCode', event.target.value)}>{unitOptions.map((unit) => <option key={unit.value} value={unit.value}>{unit.label}</option>)}</select></td>
            <td className="p-3"><input aria-label="Condición" className={`${fieldClass} w-24`} value={row.conditionCode} onChange={(event) => update(row.clientId, 'conditionCode', event.target.value.toUpperCase())}/></td>
            <td className="p-3"><select aria-label="Lado" className={`${fieldClass} w-28`} value={row.side} onChange={(event) => update(row.clientId, 'side', event.target.value)}><option value="">No aplica</option><option value="left">Izquierdo</option><option value="right">Derecho</option><option value="bilateral">Bilateral</option><option value="unknown">Desconocido</option></select></td>
            <td className="p-3"><input aria-label="Eje" className={`${fieldClass} w-20`} value={row.axis} onChange={(event) => update(row.clientId, 'axis', event.target.value.toUpperCase())}/></td>
            <td className="p-3"><input aria-label="Repetición" inputMode="numeric" className={`${fieldClass} w-16`} value={row.trialNumber} onChange={(event) => update(row.clientId, 'trialNumber', event.target.value)}/></td>
            <td className="p-3"><input aria-label="Ubicación de origen" className={`${fieldClass} w-44`} value={row.sourceLocation} onChange={(event) => update(row.clientId, 'sourceLocation', event.target.value)}/></td>
            <td className="p-3"><div className="w-64"><div className="flex items-center gap-2"><StatusBadge status={row.qualityStatus}/><span className="text-xs font-black text-[#29474d]">{row.normalizedNumericValue ?? row.normalizedTextValue ?? '—'}</span></div><p className="mt-2 text-[11px] font-bold text-[#60777d]">{metricLabel(row.metricCode)}</p>{row.issues.map((issue, index) => <p key={`${issue.ruleCode}-${index}`} className="mt-1 text-[11px] leading-4 text-[#936611]"><strong>{issue.ruleCode}:</strong> {issue.message}</p>)}</div></td>
            <td className="p-3 pr-4"><button type="button" onClick={() => {setRows((current) => current.filter((item) => item.clientId !== row.clientId));setDirty(true)}} className="grid size-9 place-items-center rounded-xl text-[#a94952] hover:bg-[#fceced]" aria-label="Eliminar fila"><Trash2 size={15}/></button></td>
          </tr>)}</tbody>
        </table>
      </div>
    </section>

    <section className="grid gap-5 lg:grid-cols-[1fr_.72fr]">
      <article className="rounded-3xl border border-[#dce7e5] bg-white p-6"><h2 className="text-lg font-black text-[#123238]">Confirmación profesional</h2><label className="mt-5 block text-sm font-black text-[#29474d]">Observaciones técnicas<textarea className="mt-2 min-h-28 w-full rounded-2xl border border-[#cfddda] p-4 text-sm font-normal" value={qualityNotes} onChange={(event) => {setQualityNotes(event.target.value);setDirty(true)}} placeholder="Condiciones de realización, asistencia, sensor, fatiga u otras limitaciones."/></label><label className={`mt-4 flex items-start gap-3 rounded-2xl p-4 text-sm font-bold ${hasBlockingValues ? 'bg-[#f2f3f3] text-[#819095]' : 'bg-[#f5f8f7] text-[#29474d]'}`}><input type="checkbox" className="mt-1" checked={interpretable && !hasBlockingValues} disabled={hasBlockingValues} onChange={(event) => {setInterpretable(event.target.checked);setDirty(true)}}/><span>Considero que el estudio es interpretable<small className="mt-1 block font-normal">Esta decisión pertenece al profesional. La app solo impide marcarlo cuando hay valores bloqueados o en cuarentena.</small></span></label></article>
      <aside className="space-y-4"><div className="rounded-3xl border border-[#dce7e5] bg-white p-6"><h2 className="font-black text-[#123238]">Resumen antes de confirmar</h2><dl className="mt-4 space-y-3 text-sm"><div className="flex justify-between"><dt className="text-[#71878c]">Métricas</dt><dd className="font-black">{normalized.length}</dd></div><div className="flex justify-between"><dt className="text-[#71878c]">Incidencias</dt><dd className="font-black">{counts.issues}</dd></div><div className="flex justify-between"><dt className="text-[#71878c]">No aplica</dt><dd className="font-black">{counts.notApplicable}</dd></div></dl></div>{hasBlockingValues && <div className="flex gap-3 rounded-3xl border border-[#f0d8a3] bg-[#fff6e4] p-5"><AlertTriangle className="shrink-0 text-[#98620b]" size={20}/><p className="text-xs leading-5 text-[#805b16]">Podés conservar la importación, pero los valores bloqueados o en cuarentena no se usarán en sugerencias ni comparaciones.</p></div>}{notice && <div className="flex gap-3 rounded-3xl border border-[#bfe1db] bg-[#e8f5f2] p-5"><CheckCircle2 className="shrink-0 text-[#08746e]" size={20}/><p className="text-xs font-bold leading-5 text-[#08746e]">{notice}</p></div>}{error && <p role="alert" className="rounded-2xl bg-[#fceced] p-4 text-sm font-bold text-[#a94952]">{error}</p>}<button type="button" disabled={save.isPending || study.status === 'finalized'} onClick={confirm} className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#0b7a75] px-5 py-4 text-sm font-black text-white disabled:opacity-50"><Save size={17}/>{save.isPending ? 'Confirmando…' : 'Confirmar importación'}</button>{study.status==='reviewed'&&<button type="button" disabled={dirty||finalize.isPending} onClick={finalizeReview} className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-[#9ccfc7] bg-white px-5 py-4 text-sm font-black text-[#0b7a75] disabled:opacity-45"><LockKeyhole size={17}/>{finalize.isPending?'Finalizando…':dirty?'Confirmá los cambios antes de finalizar':'Finalizar y bloquear estudio'}</button>}</aside>
    </section>
    </fieldset>
  </div>
}
