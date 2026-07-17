import { BookOpenCheck, CalendarDays, CheckCircle2, Clock3, Plus, Upload, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import { PageHeader } from '../components/PageHeader'
import { StatCard } from '../components/StatCard'
import { StatusBadge } from '../components/StatusBadge'
import { suggestions, todaySessions } from '../data/demo'
import { usePatients } from '../features/patients/hooks'
import { useProfessionalAssignments } from '../features/sessions/hooks'
import { isSupabaseConfigured } from '../lib/supabase'

export function DashboardPage() {
  const { data: patients = [] } = usePatients()
  const { data: assignments = [] } = useProfessionalAssignments()
  const sessions = isSupabaseConfigured || assignments.length ? assignments : todaySessions.map((session) => ({ ...session, patientName: session.patientName, patientId: session.patientId, title: session.title, mode: session.mode === 'Domiciliaria' ? 'home' as const : 'in_person' as const, status: session.status }))
  const reviewSuggestions = isSupabaseConfigured ? [] : suggestions
  const todayLabel = new Intl.DateTimeFormat('es-UY', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())
  const activePatients = patients.filter((patient) => patient.status === 'active').length
  const completedSessions = assignments.filter((session) => session.status === 'completed').length
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={todayLabel.charAt(0).toUpperCase() + todayLabel.slice(1)}
        title="Buen día, Federico"
        description={isSupabaseConfigured ? 'Resumen operativo de pacientes, sesiones y revisiones.' : 'Modo demo con datos ficticios y persistencia local.'}
        actions={
          <>
            <Link
              to="/app/estudios/importar"
              className="inline-flex items-center gap-2 rounded-2xl border border-[#cfddda] bg-white px-4 py-3 text-sm font-black text-[#29474d] shadow-sm"
            >
              <Upload size={17} /> Importar estudio
            </Link>
            <Link
              to="/app/pacientes/nuevo"
              className="inline-flex items-center gap-2 rounded-2xl bg-[#0b7a75] px-4 py-3 text-sm font-black text-white shadow-[0_10px_20px_rgba(11,122,117,0.18)]"
            >
              <Plus size={17} /> Nuevo paciente
            </Link>
          </>
        }
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Resumen del día">
        <StatCard icon={Users} label="Pacientes activos" value={String(activePatients)} detail={`${patients.length-activePatients} perfiles inactivos`} />
        <StatCard icon={CalendarDays} label="Sesiones registradas" value={String(assignments.length)} detail={`${assignments.filter(item=>item.mode==='home').length} domiciliarias · ${assignments.filter(item=>item.mode==='in_person').length} presenciales`} tone="blue" />
        <StatCard icon={CheckCircle2} label="Completadas" value={String(completedSessions)} detail={`${assignments.filter(item=>item.status==='partial').length} parciales`} tone="teal" />
        <StatCard icon={BookOpenCheck} label="Para revisar" value={String(reviewSuggestions.length)} detail="Sugerencias estadísticas" tone="amber" />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.45fr_0.85fr]">
        <article className="overflow-hidden rounded-3xl border border-[#dce7e5] bg-white shadow-[0_12px_30px_rgba(21,54,60,0.05)]">
          <div className="flex items-center justify-between border-b border-[#e4ecea] px-5 py-5 sm:px-6">
            <div>
              <h2 className="text-lg font-black text-[#123238]">Sesiones de hoy</h2>
              <p className="mt-1 text-xs text-[#71878c]">Planificadas y realizadas</p>
            </div>
            <Link to="/app/sesiones" className="text-xs font-black text-[#0b7a75]">Ver todas</Link>
          </div>
          <div className="divide-y divide-[#e8efed]">
            {sessions.slice(0,6).map((session) => (
              <div key={session.id} className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <div className="flex items-center gap-4">
                  <span className="grid size-11 place-items-center rounded-2xl bg-[#e8f5f2] text-sm font-black text-[#08746e]">
                    {session.patientName.split(' ').map((part) => part[0]).join('')}
                  </span>
                  <div>
                    <Link to={`/app/pacientes/${session.patientId}`} className="text-sm font-black text-[#17363c] hover:text-[#0b7a75]">
                      {session.patientName}
                    </Link>
                    <p className="mt-1 text-xs text-[#71878c]">{session.title} · {session.mode === 'home' ? 'Domiciliaria' : session.mode === 'in_person' ? 'Presencial' : session.mode}</p>
                  </div>
                </div>
                <StatusBadge status={session.status} />
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-3xl border border-[#dce7e5] bg-white p-5 shadow-[0_12px_30px_rgba(21,54,60,0.05)] sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-black text-[#123238]">Revisión pendiente</h2>
              <p className="mt-1 text-xs text-[#71878c]">Ninguna salida se publica sola</p>
            </div>
            <span className="grid size-10 place-items-center rounded-2xl bg-[#fff3d9] text-[#98620b]">
              <Clock3 size={19} />
            </span>
          </div>
          <div className="mt-5 space-y-3">
            {reviewSuggestions.map((suggestion) => (
              <Link
                to="/app/sugerencias"
                key={suggestion.id}
                className="block rounded-2xl border border-[#e2ebe9] p-4 transition hover:border-[#a8cfca] hover:bg-[#f8fbfa]"
              >
                <p className="text-sm font-black text-[#29474d]">{suggestion.patientName}</p>
                <p className="mt-1 text-xs leading-5 text-[#71878c]">{suggestion.studyLabel}</p>
                <p className="mt-3 text-[11px] font-black uppercase tracking-[0.12em] text-[#0b7a75]">{suggestion.ruleCode}</p>
              </Link>
            ))}
            {reviewSuggestions.length === 0 && <p className="rounded-2xl bg-[#f5f8f7] p-4 text-xs text-[#71878c]">No hay sugerencias pendientes.</p>}
          </div>
        </article>
      </section>

      <aside className="flex flex-col gap-4 rounded-3xl border border-[#bcded9] bg-[#e8f5f2] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div>
          <p className="text-sm font-black text-[#075e5a]">Entorno de demostración protegido</p>
          <p className="mt-1 text-xs leading-5 text-[#3e716f]">No se cargaron nombres reales, cédulas, estudios ni historias clínicas.</p>
        </div>
        <span className="shrink-0 rounded-full bg-white/70 px-3 py-1.5 text-[11px] font-black text-[#08746e]">SIN DATOS REALES</span>
      </aside>
    </div>
  )
}
