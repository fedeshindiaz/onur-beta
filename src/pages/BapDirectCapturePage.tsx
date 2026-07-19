import { Activity, Cable, CheckCircle2, ChevronLeft, CircleAlert, Clock3, FileUp, Play, ShieldAlert, Square, Usb, Wifi, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { PageHeader } from '../components/PageHeader'
import { BAP_DIRECT_CONDITIONS, BapConditionRecorder, metricsFromBapDirectCapture, summarizeBapDirectCapture, type BapConditionCode, type BapConditionResult } from '../features/posturography/bapDirect'
import { connectBapWebSerial, supportsBapWebSerial, type BapWebSerialConnection } from '../features/posturography/webSerial'
import { usePatients } from '../features/patients/hooks'
import { useTreatmentCycles } from '../features/sessions/hooks'
import { useCreateDirectBapCapture } from '../features/studies/hooks'
import { normalizeMetricRows } from '../features/studies/normalization'
import { saveStudyImport } from '../features/studies/repository'

type ActiveCapture = { condition: BapConditionCode; startedAt: number }

const fieldClass = 'mt-2 h-12 w-full rounded-2xl border border-[#E9E7E7] bg-white px-4 text-sm text-[#171717] disabled:bg-[#F7F6F4]'

function localDateTimeValue() {
  const now = new Date()
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset())
  return now.toISOString().slice(0, 16)
}

function resultFor(results: BapConditionResult[], condition: BapConditionCode) {
  return results.find((result) => result.condition === condition)
}

export function BapDirectCapturePage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { data: patients = [] } = usePatients()
  const [patientId, setPatientId] = useState(params.get('patient') ?? '')
  const { data: cycles = [] } = useTreatmentCycles(patientId)
  const [cycleId, setCycleId] = useState('')
  const [performedAt, setPerformedAt] = useState(localDateTimeValue)
  const [durationSeconds, setDurationSeconds] = useState<10 | 20 | 30>(20)
  const [connectionState, setConnectionState] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected')
  const [active, setActive] = useState<ActiveCapture | null>(null)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [sampleCount, setSampleCount] = useState(0)
  const [results, setResults] = useState<BapConditionResult[]>([])
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [saving, setSaving] = useState(false)
  const [studyId, setStudyId] = useState('')
  const connectionRef = useRef<BapWebSerialConnection | null>(null)
  const recorderRef = useRef<BapConditionRecorder | null>(null)
  const createDraft = useCreateDirectBapCapture()

  useEffect(() => {
    if (results.length) return
    setCycleId(cycles.find((cycle) => cycle.status === 'active')?.id ?? '')
  }, [cycles, results.length])

  const finishCapture = useCallback(() => {
    const recorder = recorderRef.current
    if (!recorder) return
    try {
      const result = recorder.finish()
      setResults((current) => [...current.filter((item) => item.condition !== result.condition), result].sort((left, right) => left.condition - right.condition))
      setNotice(`Condición ${result.condition} registrada. Revisá el equipo y prepará la siguiente condición.`)
      setError('')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No fue posible completar la condición.')
    } finally {
      recorderRef.current = null
      setActive(null)
      setElapsedSeconds(0)
    }
  }, [])

  useEffect(() => {
    if (!active) return undefined
    const interval = window.setInterval(() => {
      const elapsed = (Date.now() - active.startedAt) / 1000
      setElapsedSeconds(elapsed)
      if (elapsed >= durationSeconds) finishCapture()
    }, 200)
    return () => window.clearInterval(interval)
  }, [active, durationSeconds, finishCapture])

  useEffect(() => () => { void connectionRef.current?.close() }, [])

  const connect = async () => {
    if (!supportsBapWebSerial()) {
      setError('Este navegador no permite conectar un puerto serie. Abrí ONUr en Chrome o Edge de escritorio.')
      return
    }
    setError('')
    setNotice('Elegí el puerto COM del BAP en la ventana del navegador.')
    setConnectionState('connecting')
    try {
      connectionRef.current = await connectBapWebSerial({
        onFrame(frame) {
          const recorder = recorderRef.current
          if (!recorder) return
          recorder.ingest(frame, Date.now())
          if (recorder.sampleCount % 8 === 0) setSampleCount(recorder.sampleCount)
        },
        onError(message) { setError(message) },
        onDisconnected() {
          connectionRef.current = null
          recorderRef.current = null
          setActive(null)
          setConnectionState('disconnected')
          setError('El equipo BAP se desconectó. Reconectalo antes de continuar.')
        },
      })
      setConnectionState('connected')
      setNotice('Equipo conectado. Prepará la condición 1 y comenzá cuando el paciente esté seguro.')
    } catch (caught) {
      setConnectionState('disconnected')
      setError(caught instanceof Error ? caught.message : 'No fue posible conectar el equipo BAP.')
    }
  }

  const disconnect = async () => {
    if (active) return
    await connectionRef.current?.close()
    connectionRef.current = null
    setConnectionState('disconnected')
    setNotice('Equipo desconectado.')
  }

  const startCondition = (condition: BapConditionCode) => {
    if (!patientId) { setError('Seleccioná el paciente antes de iniciar la captura.'); return }
    if (connectionState !== 'connected') { setError('Conectá el equipo BAP antes de iniciar una condición.'); return }
    if (active) return
    recorderRef.current = new BapConditionRecorder(condition, durationSeconds)
    setActive({ condition, startedAt: Date.now() })
    setElapsedSeconds(0)
    setSampleCount(0)
    setError('')
    setNotice(`Capturando condición ${condition}. La primera trama válida establece la referencia del equipo.`)
  }

  const cancelCapture = () => {
    recorderRef.current = null
    setActive(null)
    setElapsedSeconds(0)
    setSampleCount(0)
    setNotice('La condición no se guardó. Podés repetirla cuando el paciente esté preparado.')
  }

  const nextCondition = BAP_DIRECT_CONDITIONS.find((condition) => !resultFor(results, condition))
  const summary = useMemo(() => results.length === 6 ? summarizeBapDirectCapture(results) : null, [results])
  const remaining = Math.max(0, durationSeconds - Math.floor(elapsedSeconds))
  const selectedPatient = patients.find((patient) => patient.id === patientId)

  const saveCapture = async () => {
    if (!summary || !patientId) return
    setError('')
    setSaving(true)
    try {
      const nextStudyId = studyId || await createDraft.mutateAsync({
        patientId,
        treatmentCycleId: cycleId,
        performedAt: new Date(performedAt).toISOString(),
        durationSeconds,
      })
      setStudyId(nextStudyId)
      const metrics = normalizeMetricRows(metricsFromBapDirectCapture(summary))
      await saveStudyImport({
        studyId: nextStudyId,
        metrics,
        qualityNotes: 'Captura directa BAP por Web Serial. Se conservaron métricas calculadas; no se almacenaron tramas crudas. La configuración clínica de las condiciones C1–C6 fue realizada por el profesional.',
        interpretable: false,
      })
      navigate(`/app/estudios/${nextStudyId}/revisar`, { state: { notice: 'Captura directa registrada. Verificá los parámetros antes de decidir si el estudio es interpretable.' } })
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No fue posible guardar la captura directa.')
    } finally {
      setSaving(false)
    }
  }

  return <div className="space-y-7">
    <Link to={patientId ? `/app/pacientes/${patientId}` : '/app/estudios'} className="inline-flex items-center gap-2 text-xs font-black text-[#E49A02]"><ChevronLeft size={16}/> Volver</Link>
    <PageHeader eyebrow="BAP · conexión local" title="Posturografía guiada" description="Realizá la captura desde el equipo BAP y enviá parámetros estructurados a ONUr, sin subir capturas de pantalla." actions={<Link to={`/app/estudios/importar${patientId ? `?patient=${patientId}&kind=bap` : ''}`} className="inline-flex items-center gap-2 rounded-2xl border border-[#E9E7E7] bg-white px-4 py-3 text-sm font-black text-[#2F2F2F]"><FileUp size={17}/> Ya tengo un informe</Link>}/>

    <section className="rounded-2xl border border-[#E8CE99] bg-[#FFF7E8] p-5"><div className="flex gap-3"><ShieldAlert className="shrink-0 text-[#A36B00]" size={21}/><div className="text-sm leading-6 text-[#6F5A2A]"><strong>Captura técnica, no interpretación clínica.</strong> La app no diagnostica ni indica tratamiento. Supervisá al paciente, seguí el protocolo y la configuración de BAP 2.32, y confirmá luego la calidad del estudio.</div></div></section>

    <section className="grid gap-5 xl:grid-cols-[.84fr_1.16fr]">
      <article className="rounded-2xl border border-[#E9E7E7] bg-white p-5 sm:p-6"><div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-2xl bg-[#FFF7E8] text-[#A36B00]"><Activity size={20}/></span><div><h2 className="font-black text-[#171717]">1. Preparar</h2><p className="text-xs text-[#747474]">Elegí a quién y cuándo corresponde esta toma.</p></div></div><div className="mt-6 grid gap-4"><label className="text-sm font-black text-[#2F2F2F]">Paciente *<select className={fieldClass} value={patientId} disabled={Boolean(results.length)} onChange={(event) => { setPatientId(event.target.value); setError(''); setNotice('') }}><option value="">Seleccionar…</option>{patients.map((patient) => <option key={patient.id} value={patient.id}>{patient.fullName}</option>)}</select></label><label className="text-sm font-black text-[#2F2F2F]">Ciclo<select className={fieldClass} value={cycleId} disabled={Boolean(results.length)} onChange={(event) => setCycleId(event.target.value)}><option value="">Sin asociar</option>{cycles.map((cycle) => <option key={cycle.id} value={cycle.id}>{cycle.label}</option>)}</select></label><label className="text-sm font-black text-[#2F2F2F]">Fecha y hora de toma *<input className={fieldClass} type="datetime-local" value={performedAt} disabled={Boolean(results.length)} onChange={(event) => setPerformedAt(event.target.value)}/></label><label className="text-sm font-black text-[#2F2F2F]">Duración de cada condición<select className={fieldClass} value={durationSeconds} disabled={Boolean(results.length)} onChange={(event) => setDurationSeconds(Number(event.target.value) as 10 | 20 | 30)}><option value={10}>10 segundos</option><option value={20}>20 segundos</option><option value={30}>30 segundos</option></select></label></div><p className="mt-5 rounded-2xl bg-[#F7F6F4] p-4 text-xs leading-5 text-[#747474]">Las condiciones se registran como C1–C6. ONUr no les asigna una configuración clínica: usá la que corresponda al protocolo que muestra BAP 2.32.</p></article>

      <article className="rounded-2xl border border-[#E9E7E7] bg-white p-5 sm:p-6"><div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-2xl bg-[#FFF7E8] text-[#A36B00]"><Cable size={20}/></span><div><h2 className="font-black text-[#171717]">2. Conectar el equipo</h2><p className="text-xs text-[#747474]">Chrome o Edge de escritorio · puerto serie BAP a 115200.</p></div></div><div className={`mt-6 rounded-2xl border p-4 ${connectionState === 'connected' ? 'border-[#E8CE99] bg-[#FFF7E8]' : 'border-[#E9E7E7] bg-[#F7F6F4]'}`}><div className="flex flex-wrap items-center justify-between gap-4"><div className="flex items-center gap-3"><span className={`grid size-9 place-items-center rounded-full ${connectionState === 'connected' ? 'bg-[#A36B00] text-white' : 'bg-[#E9E7E7] text-[#747474]'}`}>{connectionState === 'connected' ? <Wifi size={17}/> : <Usb size={17}/>}</span><div><p className="text-sm font-black text-[#2F2F2F]">{connectionState === 'connected' ? 'Equipo conectado' : connectionState === 'connecting' ? 'Esperando selección de puerto…' : 'Equipo sin conectar'}</p><p className="text-xs text-[#747474]">{connectionState === 'connected' ? 'Listo para recibir tramas BAP.' : 'El navegador te pedirá elegir el puerto COM.'}</p></div></div>{connectionState === 'connected' ? <button type="button" disabled={Boolean(active)} onClick={() => void disconnect()} className="rounded-xl border border-[#E9E7E7] bg-white px-3 py-2 text-xs font-black text-[#2F2F2F] disabled:opacity-50">Desconectar</button> : <button type="button" disabled={connectionState === 'connecting'} onClick={() => void connect()} className="rounded-xl bg-[#E49A02] px-3 py-2 text-xs font-black text-white disabled:opacity-50">{connectionState === 'connecting' ? 'Conectando…' : 'Elegir puerto BAP'}</button>}</div></div><div className="mt-5 rounded-2xl border border-[#E8CE99] bg-[#FFF7E8] p-4 text-xs leading-5 text-[#8A5B00]"><strong>Antes de conectar:</strong> cerrá el ejecutable BAP si está abierto. Windows no permite que el software BAP y el navegador usen el mismo puerto al mismo tiempo.</div><div className="mt-5 border-t border-[#E9E7E7] pt-5"><h3 className="text-sm font-black text-[#2F2F2F]">3. Capturar las seis condiciones</h3><p className="mt-1 text-xs leading-5 text-[#747474]">Cada inicio toma una nueva referencia del sensor. No comiences hasta comprobar la seguridad y la posición del paciente.</p><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{BAP_DIRECT_CONDITIONS.map((condition) => { const result = resultFor(results, condition); const isActive = active?.condition === condition; const isNext = nextCondition === condition; return <article key={condition} className={`rounded-2xl border p-4 ${isActive ? 'border-[#E49A02] bg-[#FFF7E8]' : result ? 'border-[#E8CE99] bg-[#F7F6F4]' : 'border-[#E9E7E7] bg-white'}`}><div className="flex items-center justify-between"><strong className="text-sm text-[#2F2F2F]">Condición {condition}</strong>{result ? <CheckCircle2 className="text-[#A36B00]" size={17}/> : <span className="text-[10px] font-black uppercase tracking-[.12em] text-[#747474]">{isActive ? 'en curso' : isNext ? 'siguiente' : 'pendiente'}</span>}</div>{result ? <><p className="mt-2 text-xs text-[#747474]">Score {result.score.toFixed(1)}% · {result.sampleCount} tramas</p><button type="button" disabled={Boolean(active) || connectionState !== 'connected'} onClick={() => startCondition(condition)} className="mt-3 text-xs font-black text-[#E49A02] disabled:opacity-50">Repetir condición</button></> : isActive ? <p className="mt-2 text-xs font-bold text-[#A36B00]">{remaining}s restantes · {sampleCount || '…'} tramas</p> : <button type="button" disabled={!isNext || Boolean(active) || connectionState !== 'connected'} onClick={() => startCondition(condition)} className="mt-3 inline-flex items-center gap-2 rounded-xl bg-[#E49A02] px-3 py-2 text-xs font-black text-white disabled:opacity-40"><Play size={14}/> Comenzar</button>}</article>})}</div>{active && <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[#171717] p-4 text-sm text-white"><div className="flex items-center gap-3"><Clock3 size={18}/><span><strong>Condición {active.condition}</strong> · {remaining}s restantes · {sampleCount ? `${sampleCount} tramas recibidas` : 'esperando señal válida…'}</span></div><div className="flex gap-2"><button type="button" onClick={finishCapture} className="rounded-xl bg-white px-3 py-2 text-xs font-black text-[#171717]">Terminar ahora</button><button type="button" onClick={cancelCapture} className="grid size-9 place-items-center rounded-xl border border-white/30" aria-label="Cancelar condición"><X size={16}/></button></div></div>}</div></article>
    </section>

    {results.length > 0 && <section className="rounded-2xl border border-[#E9E7E7] bg-white p-5 sm:p-6"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-lg font-black text-[#171717]">Parámetros capturados</h2><p className="mt-1 text-xs leading-5 text-[#747474]">Los valores se calculan con la fórmula técnica observada en BAP 2.32. No se guarda la señal ni una captura de pantalla.</p></div><span className="rounded-full bg-[#FFF7E8] px-3 py-1.5 text-xs font-black text-[#A36B00]">{results.length}/6 condiciones</span></div><div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{results.map((result) => <div key={result.condition} className="rounded-2xl bg-[#F7F6F4] p-4"><p className="text-xs font-black uppercase tracking-[.12em] text-[#747474]">C{result.condition}</p><p className="mt-2 text-2xl font-black text-[#171717]">{result.score.toFixed(1)}<span className="text-sm">%</span></p><p className="mt-1 text-xs text-[#747474]">Área técnica {result.area.toFixed(2)} · Sway/m X {result.swayPerMinuteX} · Y {result.swayPerMinuteY}</p></div>)}</div>{summary && <div className="mt-5 grid gap-3 border-t border-[#E9E7E7] pt-5 sm:grid-cols-2 lg:grid-cols-5"><div className="rounded-2xl bg-[#FFF7E8] p-4"><p className="text-[10px] font-black uppercase tracking-[.12em] text-[#A36B00]">Composite</p><p className="mt-2 text-xl font-black text-[#171717]">{summary.composite.toFixed(1)}%</p></div><div className="rounded-2xl bg-[#F7F6F4] p-4"><p className="text-[10px] font-black uppercase tracking-[.12em] text-[#747474]">Somatosensorial</p><p className="mt-2 text-xl font-black text-[#171717]">{summary.somatosensory.toFixed(1)}%</p></div><div className="rounded-2xl bg-[#F7F6F4] p-4"><p className="text-[10px] font-black uppercase tracking-[.12em] text-[#747474]">Visual</p><p className="mt-2 text-xl font-black text-[#171717]">{summary.visual.toFixed(1)}%</p></div><div className="rounded-2xl bg-[#F7F6F4] p-4"><p className="text-[10px] font-black uppercase tracking-[.12em] text-[#747474]">Vestibular</p><p className="mt-2 text-xl font-black text-[#171717]">{summary.vestibular.toFixed(1)}%</p></div><div className="rounded-2xl bg-[#F7F6F4] p-4"><p className="text-[10px] font-black uppercase tracking-[.12em] text-[#747474]">Preferencia visual</p><p className="mt-2 text-xl font-black text-[#171717]">{summary.visualPreference.toFixed(1)}%</p></div></div>}{summary && <button type="button" disabled={saving || Boolean(active)} onClick={() => void saveCapture()} className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#E49A02] px-5 py-4 text-sm font-black text-white disabled:opacity-50"><Square size={16}/>{saving ? 'Guardando parámetros…' : `Guardar parámetros de ${selectedPatient?.fullName ?? 'paciente'} para revisar`}</button>}</section>}

    {notice && <p role="status" className="flex gap-3 rounded-2xl border border-[#E8CE99] bg-[#FFF7E8] p-4 text-sm font-bold text-[#A36B00]"><CheckCircle2 className="shrink-0" size={19}/>{notice}</p>}
    {error && <p role="alert" className="flex gap-3 rounded-2xl bg-[#fceced] p-4 text-sm font-bold text-[#a94952]"><CircleAlert className="shrink-0" size={19}/>{error}</p>}
  </div>
}
