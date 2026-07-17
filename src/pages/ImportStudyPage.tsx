import { AlertTriangle, ChevronLeft, FileScan, ScanText, ShieldCheck } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { PageHeader } from '../components/PageHeader'
import { useUploadDocument } from '../features/documents/hooks'
import { ClinicalFileDropzone } from '../features/extraction/ClinicalFileDropzone'
import { extractFields } from '../features/extraction/extractor'
import { analyzeClinicalFile, releaseExtractionPreviews } from '../features/extraction/localOcr'
import { pageClassificationLabels, type IntakeKind, type LocalExtractionDraft, type PageClassification } from '../features/extraction/types'
import { usePatients } from '../features/patients/hooks'
import { useTreatmentCycles } from '../features/sessions/hooks'

const intakeOptions: Array<{ value: IntakeKind; title: string; description: string; icon: typeof FileScan }> = [
  { value: 'posturography_bap', title: 'POSTUROGRAFÍA BAP', description: 'Imágenes, PDF, informes BAP y capturas de pantalla del posturógrafo.', icon: FileScan },
  { value: 'vestibular_and_reports', title: 'ESTUDIOS VESTIBULARES, vHIT E INFORMES', description: 'Informes otoneurológicos, HIMP/SHIMP, oculomotores, órdenes, gráficos y estudios multipágina.', icon: ScanText },
]

const fieldClass = 'mt-2 h-12 w-full rounded-2xl border border-[#cfddda] bg-white px-4 text-sm text-[#17363c]'

export function ImportStudyPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { data: patients = [] } = usePatients()
  const [patientId, setPatientId] = useState(params.get('patient') ?? '')
  const selectedPatient = patients.find((patient) => patient.id === patientId)
  const { data: cycles = [] } = useTreatmentCycles(patientId)
  const upload = useUploadDocument(patientId)
  const initialKind = params.get('kind') === 'vestibular' ? 'vestibular_and_reports' : 'posturography_bap'
  const [intakeKind, setIntakeKind] = useState<IntakeKind>(initialKind)
  const [cycleId, setCycleId] = useState('')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [description, setDescription] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [draft, setDraft] = useState<LocalExtractionDraft | null>(null)
  const [progress, setProgress] = useState('')
  const [error, setError] = useState('')
  const draftRef = useRef<LocalExtractionDraft | null>(null)

  useEffect(() => { setCycleId(cycles.find((cycle) => cycle.status === 'active')?.id ?? '') }, [cycles])
  useEffect(() => { draftRef.current = draft }, [draft])
  useEffect(() => () => releaseExtractionPreviews(draftRef.current), [])

  useEffect(() => {
    if (!file || !selectedPatient) return
    let cancelled = false
    setError(''); setDraft(null)
    void analyzeClinicalFile(file, intakeKind, selectedPatient, (value) => {
      if (!cancelled) setProgress(value.phase === 'done' ? 'Borrador automático listo para revisar.' : `Analizando página ${value.currentPage} de ${value.totalPages}`)
    }).then((result) => { if (!cancelled) setDraft(result); else releaseExtractionPreviews(result) }).catch((caught) => { if (!cancelled) { setError(caught instanceof Error ? caught.message : 'No fue posible analizar el archivo localmente.'); setProgress('') } })
    return () => { cancelled = true }
  }, [file, intakeKind, selectedPatient])

  const changeFile = (next: File) => { releaseExtractionPreviews(draft); setDraft(null); setProgress('Preparando análisis local…'); setFile(next); setError('') }
  const changeClassification = (pageNumber: number, classification: PageClassification) => setDraft((current) => {
    if (!current) return current
    const pages = current.pages.map((page) => page.pageNumber === pageNumber ? { ...page, classification } : page)
    return { ...current, pages, fields: extractFields(pages, current.intakeKind) }
  })
  const recognizedPages = useMemo(() => draft?.pages.filter((page) => page.classification !== 'unrecognized').length ?? 0, [draft])

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!patientId || !selectedPatient) { setError('Seleccioná primero al paciente.'); return }
    if (!file || !draft) { setError('Esperá a que termine el análisis local del archivo.'); return }
    if (!date) { setError('Indicá la fecha del documento.'); return }
    setError('')
    try {
      const result = await upload.mutateAsync({ patientId, treatmentCycleId: cycleId, documentType: intakeKind === 'posturography_bap' ? 'posturography' : 'clinical_report', documentDate: date, description, shareWithPatient: false, file, deviceName: '', protocolCode: intakeKind === 'posturography_bap' ? 'bap-auto-review' : 'vestibular-auto-review', protocolVersion: '1', extractionDraft: draft })
      if (!result.studyId) throw new Error('El borrador se guardó, pero no se encontró su sección de revisión.')
      navigate(`/app/estudios/${result.studyId}/revisar`, { state: { notice: `Original privado y borrador automático guardados. ${result.studyIds?.length ?? 1} sección(es) vinculada(s).` } })
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'No fue posible guardar el documento.') }
  }

  return <div className="space-y-7">
    <Link to={patientId ? `/app/pacientes/${patientId}` : '/app'} className="inline-flex items-center gap-2 text-xs font-black text-[#0b7a75]"><ChevronLeft size={16}/> Volver</Link>
    <PageHeader eyebrow="Carga privada y extracción local" title="Cargar estudio" description="Seleccioná el espacio correcto. ONUr conserva un único original privado y crea borradores que siempre requieren confirmación profesional."/>
    <form onSubmit={submit} className="space-y-6">
      <section className="grid gap-4 lg:grid-cols-2">{intakeOptions.map((option) => { const Icon = option.icon; const selected = intakeKind === option.value; return <button key={option.value} type="button" onClick={() => { setIntakeKind(option.value); setDraft(null) }} className={`rounded-3xl border-2 p-6 text-left transition ${selected ? 'border-[#0b7a75] bg-[#e8f5f2]' : 'border-[#dce7e5] bg-white'}`}><Icon className={selected ? 'text-[#0b7a75]' : 'text-[#60777d]'} size={26}/><strong className="mt-4 block text-sm font-black text-[#123238]">{option.title}</strong><span className="mt-2 block text-xs leading-5 text-[#60777d]">{option.description}</span></button> })}</section>

      <section className="grid gap-6 xl:grid-cols-[.72fr_1.28fr]">
        <div className="space-y-5 rounded-3xl border border-[#dce7e5] bg-white p-6">
          <h2 className="text-lg font-black text-[#123238]">1. Paciente y original</h2>
          <label className="block text-sm font-black text-[#29474d]">Paciente seleccionado *<select className={fieldClass} value={patientId} onChange={(event) => { setPatientId(event.target.value); setFile(null); setDraft(null) }}><option value="">Seleccionar…</option>{patients.map((patient) => <option key={patient.id} value={patient.id}>{patient.fullName}</option>)}</select></label>
          <div className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-black text-[#29474d]">Fecha del documento *<input type="date" className={fieldClass} value={date} onChange={(event) => setDate(event.target.value)}/></label><label className="text-sm font-black text-[#29474d]">Ciclo<select className={fieldClass} value={cycleId} onChange={(event) => setCycleId(event.target.value)}><option value="">Sin asociar</option>{cycles.map((cycle) => <option key={cycle.id} value={cycle.id}>{cycle.label}</option>)}</select></label></div>
          <label className="block text-sm font-black text-[#29474d]">Descripción opcional<textarea className="mt-2 min-h-20 w-full rounded-2xl border border-[#cfddda] p-4 text-sm" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Contexto breve, sin interpretar el estudio."/></label>
          <ClinicalFileDropzone file={file} previewUrl={draft?.pages[0]?.previewUrl ?? ''} pageCount={draft?.pages.length ?? 0} disabled={upload.isPending} onFile={changeFile} onError={setError}/>
          <div className="flex gap-3 rounded-2xl bg-[#f5f8f7] p-4"><ShieldCheck className="shrink-0 text-[#0b7a75]" size={20}/><p className="text-xs leading-5 text-[#60777d]"><strong className="text-[#29474d]">Privado por defecto.</strong> El paciente no puede ver el original hasta solicitar acceso y recibir autorización profesional.</p></div>
        </div>

        <div className="space-y-5 rounded-3xl border border-[#dce7e5] bg-white p-6">
          <div><h2 className="text-lg font-black text-[#123238]">2. Borrador automático</h2><p className="mt-1 text-xs leading-5 text-[#60777d]">PDF.js y OCR español/inglés se ejecutan localmente. Las imágenes no se envían a servicios externos.</p></div>
          {progress && <div role="status" className="rounded-2xl bg-[#e8f5f2] p-4 text-sm font-black text-[#08746e]">{progress}</div>}
          {!file && <div className="grid min-h-48 place-items-center rounded-2xl border border-dashed border-[#cfddda] text-center text-sm text-[#71878c]">Elegí un paciente y un archivo para comenzar.</div>}
          {draft && <>
            <div className="flex flex-wrap gap-2 text-xs"><span className="rounded-full bg-[#e8f5f2] px-3 py-1.5 font-black text-[#08746e]">{draft.pages.length} páginas</span><span className="rounded-full bg-[#f5f8f7] px-3 py-1.5 font-black text-[#60777d]">{recognizedPages} clasificadas</span><span className="rounded-full bg-[#fff6e4] px-3 py-1.5 font-black text-[#98620b]">{draft.fields.filter((field) => field.status !== 'read').length} campos a revisar</span></div>
            {draft.patientMatchStatus === 'mismatch' && <div className="flex gap-3 rounded-2xl border border-[#efc3c7] bg-[#fceced] p-4"><AlertTriangle className="shrink-0 text-[#a94952]" size={20}/><p className="text-xs leading-5 text-[#8d3c45]"><strong>Posible discrepancia con el paciente seleccionado.</strong> Se detectaron diferencias en {draft.mismatchFields.length} campo(s) de identidad. El perfil no se modificó ni se cambió de paciente.</p></div>}
            <div className="grid gap-3 sm:grid-cols-2">{draft.pages.map((page) => <article key={page.pageNumber} className="overflow-hidden rounded-2xl border border-[#dce7e5]"><img src={page.previewUrl} alt={`Miniatura de página ${page.pageNumber}`} className="h-36 w-full bg-[#f5f8f7] object-contain"/><div className="p-3"><p className="text-xs font-black text-[#29474d]">Página {page.pageNumber}</p><select aria-label={`Clasificación página ${page.pageNumber}`} value={page.classification} onChange={(event) => changeClassification(page.pageNumber, event.target.value as PageClassification)} className="mt-2 h-10 w-full rounded-xl border border-[#cfddda] px-3 text-xs">{Object.entries(pageClassificationLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div></article>)}</div>
          </>}
          {error && <p role="alert" className="rounded-2xl bg-[#fceced] p-4 text-sm font-bold text-[#a94952]">{error}</p>}
          <button disabled={!draft || upload.isPending} className="w-full rounded-2xl bg-[#0b7a75] px-5 py-4 text-sm font-black text-white disabled:opacity-50">{upload.isPending ? 'Guardando original privado…' : 'Guardar borrador y revisar campos'}</button>
        </div>
      </section>
    </form>
  </div>
}
