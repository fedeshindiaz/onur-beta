import { CalendarDays, Clock3, Plus, Search } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader } from '../components/PageHeader'
import { StatusBadge } from '../components/StatusBadge'
import { useProfessionalAssignments } from '../features/sessions/hooks'
import { sessionDurationSeconds } from '../features/sessions/repository'

export function SessionsPage() {
  const [search, setSearch] = useState('')
  const { data: sessions = [], isPending } = useProfessionalAssignments()
  const visible = sessions.filter((session) => `${session.patientName} ${session.title}`.toLowerCase().includes(search.toLowerCase()))

  return <div className="space-y-7">
    <PageHeader eyebrow="Seguimiento" title="Sesiones" description="Asignaciones domiciliarias y presenciales, con su estado de ejecución." actions={<Link to="/app/pacientes" className="inline-flex items-center gap-2 rounded-2xl bg-[#0b7a75] px-4 py-3 text-sm font-black text-white"><Plus size={17}/> Asignar a un paciente</Link>}/>
    <section className="overflow-hidden rounded-3xl border border-[#dce7e5] bg-white">
      <div className="border-b border-[#e5edeb] p-5"><label className="relative block max-w-md"><Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#829599]" size={17}/><input className="h-11 w-full rounded-2xl border border-[#d5e1df] bg-[#f9fbfa] pl-10 pr-4 text-sm" placeholder="Buscar paciente o sesión…" value={search} onChange={event=>setSearch(event.target.value)}/></label></div>
      <div className="hidden grid-cols-[1.1fr_1.2fr_.7fr_.7fr_.7fr] gap-4 bg-[#f8faf9] px-6 py-3 text-[10px] font-black uppercase tracking-[.12em] text-[#71878c] md:grid"><span>Paciente</span><span>Sesión</span><span>Modalidad</span><span>Disponible</span><span>Estado</span></div>
      {isPending ? <p className="p-8 text-sm text-[#71878c]">Cargando sesiones…</p> : visible.length === 0 ? <p className="p-8 text-sm text-[#71878c]">No hay sesiones que coincidan.</p> : <div className="divide-y divide-[#e8efed]">
        {visible.map((session) => <Link to={`/app/pacientes/${session.patientId}`} key={session.id} className="grid gap-3 px-6 py-5 hover:bg-[#f8fbfa] md:grid-cols-[1.1fr_1.2fr_.7fr_.7fr_.7fr] md:items-center">
          <p className="text-sm font-black text-[#29474d]">{session.patientName || 'Paciente'}</p>
          <div><p className="text-sm font-bold text-[#29474d]">{session.title}</p><p className="mt-1 flex items-center gap-1 text-xs text-[#71878c]"><Clock3 size={13}/>{['completed','partial'].includes(session.status) && session.activeSeconds ? `${Math.ceil(session.activeSeconds / 60)} min realizados` : `${Math.ceil(sessionDurationSeconds(session) / 60)} min previstos`} · {session.exercises.length} ejercicios</p>{session.initialDiscomfort !== null && <p className="mt-1 text-[11px] font-bold text-[#0b7a75]">Malestar {session.initialDiscomfort} → {session.finalDiscomfort} · dificultad {session.perceivedDifficulty}/5</p>}</div>
          <p className="text-xs text-[#60777d]">{session.mode === 'home' ? 'Domiciliaria' : 'Presencial'}</p>
          <p className="flex items-center gap-1 text-xs text-[#60777d]"><CalendarDays size={13}/>{session.availableFrom.slice(0, 10)}</p>
          <StatusBadge status={session.status}/>
        </Link>)}
      </div>}
    </section>
  </div>
}
