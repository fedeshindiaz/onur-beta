import { FileSearch, Search, UserRound, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { usePatients } from '../features/patients/hooks'
import { useClinicalStudies } from '../features/studies/hooks'

function searchable(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es')
}

export function GlobalSearch() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const { data: patients = [], isPending: patientsPending, error: patientsError } = usePatients()
  const { data: studies = [], isPending: studiesPending, error: studiesError } = useClinicalStudies()

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLocaleLowerCase('es') === 'k') {
        event.preventDefault()
        setOpen(true)
      }
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', handleShortcut)
    return () => window.removeEventListener('keydown', handleShortcut)
  }, [])

  useEffect(() => {
    if (open) inputRef.current?.focus()
    else setQuery('')
  }, [open])

  const needle = searchable(query.trim())
  const matchingPatients = useMemo(() => patients.filter((patient) => searchable([
    patient.fullName,
    patient.insurer,
    patient.affiliateNumber,
    patient.username,
  ].join(' ')).includes(needle)).slice(0, 6), [needle, patients])
  const matchingStudies = useMemo(() => studies.filter((study) => searchable([
    study.patientName,
    study.sourceFilename,
    study.deviceName,
    study.protocolCode,
    study.performedAt.slice(0, 10),
  ].join(' ')).includes(needle)).slice(0, 6), [needle, studies])
  const pending = patientsPending || studiesPending
  const failed = patientsError || studiesError
  const hasResults = matchingPatients.length > 0 || matchingStudies.length > 0

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-10 items-center gap-2.5 rounded-lg border border-[#E9E7E7] bg-[#F7F6F4] px-3 text-left text-xs text-[#747474] transition hover:border-[#D9D6D2] md:w-[260px]"
        aria-label="Buscar en ONUr"
      >
        <Search size={16} />
        <span className="hidden min-w-0 flex-1 truncate whitespace-nowrap md:inline">Buscar paciente o estudio</span>
        <span className="ml-auto hidden rounded border border-[#D9D6D2] bg-white px-1.5 py-0.5 text-[9px] md:inline">Ctrl K</span>
      </button>

      {open && createPortal(
        <div className="fixed inset-0 z-[70] grid items-start justify-items-center bg-[#171717]/45 px-4 pt-[10vh]" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false) }}>
          <section role="dialog" aria-modal="true" aria-labelledby="global-search-title" className="w-full max-w-2xl overflow-hidden rounded-2xl border border-[#E9E7E7] bg-white shadow-[0_30px_90px_rgba(23,23,23,0.28)]">
            <div className="flex items-center gap-3 border-b border-[#E9E7E7] px-4 py-3">
              <Search className="shrink-0 text-[#A36B00]" size={19} />
              <label className="min-w-0 flex-1">
                <span id="global-search-title" className="sr-only">Buscar paciente o estudio</span>
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  className="h-11 w-full bg-transparent text-sm font-semibold text-[#171717] outline-none placeholder:font-normal placeholder:text-[#99948F]"
                  placeholder="Nombre, mutualista, archivo, protocolo o fecha…"
                  aria-label="Término de búsqueda"
                />
              </label>
              <button type="button" onClick={() => setOpen(false)} className="grid size-9 shrink-0 place-items-center rounded-lg text-[#747474] hover:bg-[#F7F6F4]" aria-label="Cerrar búsqueda"><X size={18} /></button>
            </div>

            <div className="max-h-[62vh] overflow-y-auto p-3 sm:p-4">
              {pending ? (
                <p role="status" className="px-3 py-10 text-center text-sm text-[#747474]">Buscando en los registros…</p>
              ) : failed ? (
                <p role="alert" className="rounded-xl bg-[#fceced] px-4 py-3 text-sm font-bold text-[#a94952]">No fue posible consultar todos los registros. Cerrá la búsqueda e intentá nuevamente.</p>
              ) : !hasResults ? (
                <p className="px-3 py-10 text-center text-sm text-[#747474]">No hay pacientes ni estudios que coincidan con “{query}”.</p>
              ) : (
                <div className="space-y-5">
                  {matchingPatients.length > 0 && <section aria-labelledby="patient-results-title">
                    <h2 id="patient-results-title" className="px-2 text-[10px] font-black uppercase tracking-[.16em] text-[#A36B00]">Pacientes</h2>
                    <div className="mt-2 space-y-1">{matchingPatients.map((patient) => <Link key={patient.id} to={`/app/pacientes/${patient.id}`} onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-3 hover:bg-[#F7F6F4]">
                      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#FFF7E8] text-[#8A5B00]"><UserRound size={17} /></span>
                      <span className="min-w-0 flex-1"><strong className="block truncate text-sm text-[#2F2F2F]">{patient.fullName}</strong><small className="mt-0.5 block truncate text-[#747474]">{patient.insurer} · {patient.cycleLabel}</small></span>
                      <span className="text-[10px] font-bold text-[#747474]">Abrir ficha</span>
                    </Link>)}</div>
                  </section>}
                  {matchingStudies.length > 0 && <section aria-labelledby="study-results-title">
                    <h2 id="study-results-title" className="px-2 text-[10px] font-black uppercase tracking-[.16em] text-[#A36B00]">Estudios</h2>
                    <div className="mt-2 space-y-1">{matchingStudies.map((study) => <Link key={study.id} to={`/app/estudios/${study.id}/revisar`} onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-3 hover:bg-[#F7F6F4]">
                      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#F1EFEC] text-[#525252]"><FileSearch size={17} /></span>
                      <span className="min-w-0 flex-1"><strong className="block truncate text-sm text-[#2F2F2F]">{study.patientName} · {study.studyType === 'posturography' ? 'Posturografía' : 'vHIT'}</strong><small className="mt-0.5 block truncate text-[#747474]">{study.performedAt.slice(0, 10)} · {study.sourceFilename}</small></span>
                      <span className="text-[10px] font-bold text-[#747474]">Revisar</span>
                    </Link>)}</div>
                  </section>}
                </div>
              )}
            </div>
            <footer className="border-t border-[#E9E7E7] bg-[#F7F6F4] px-4 py-2.5 text-[10px] text-[#747474]">Enter abre el enlace enfocado · Esc cierra la búsqueda</footer>
          </section>
        </div>
      , document.body)}
    </>
  )
}
