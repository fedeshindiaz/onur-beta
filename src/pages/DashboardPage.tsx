import {
  Activity,
  ArrowRight,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Clock3,
  FileText,
  MoreHorizontal,
  Plus,
  ShieldCheck,
  TrendingUp,
  Upload,
  Users,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { StatusBadge } from '../components/StatusBadge'
import { suggestions, todaySessions } from '../data/demo'
import { usePatients } from '../features/patients/hooks'
import { useProfessionalAssignments } from '../features/sessions/hooks'
import { isSupabaseConfigured } from '../lib/supabase'

const scheduleTimes = ['09:00', '10:30', '12:15', '15:00', '16:30', '18:00']
const progressPoints = [42, 48, 46, 59, 63, 69, 74, 78]

export function DashboardPage() {
  const { data: patients = [] } = usePatients()
  const { data: assignments = [] } = useProfessionalAssignments()
  const sessions = isSupabaseConfigured || assignments.length
    ? assignments
    : todaySessions.map((session) => ({
        ...session,
        mode: session.mode === 'Domiciliaria' ? 'home' as const : 'in_person' as const,
      }))
  const reviewSuggestions = isSupabaseConfigured ? [] : suggestions
  const today = new Date()
  const todayLabel = new Intl.DateTimeFormat('es-UY', { weekday: 'long', day: 'numeric', month: 'long' }).format(today)
  const activePatients = patients.filter((patient) => patient.status === 'active').length
  const completedSessions = sessions.filter((session) => session.status === 'completed').length
  const nextSession = sessions.find((session) => session.status === 'pending' || session.status === 'assigned') ?? sessions[0]

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-xs font-semibold capitalize text-[#747474]">{todayLabel}</p>
          <h1 className="mt-1.5 text-[30px] leading-tight tracking-[-0.035em] text-[#171717] sm:text-[34px]">Buen día, Federico</h1>
          <p className="mt-2 text-sm text-[#747474]">Este es el estado clínico y operativo de tu jornada.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/app/estudios/importar" className="inline-flex h-11 items-center gap-2 rounded-lg border border-[#D9D6D2] bg-white px-4 text-sm font-semibold text-[#2F2F2F] transition hover:border-[#BDB9B4]">
            <Upload size={16} /> Importar estudio
          </Link>
          <Link to="/app/pacientes/nuevo" className="inline-flex h-11 items-center gap-2 rounded-lg bg-[#E49A02] px-4 text-sm font-semibold text-[#171717] shadow-[0_6px_14px_rgba(228,154,2,0.16)] transition hover:bg-[#D99000]">
            <Plus size={17} /> Nuevo paciente
          </Link>
        </div>
      </header>

      {nextSession && (
        <section className="overflow-hidden rounded-2xl border border-[#E2DED9] bg-white shadow-[0_8px_24px_rgba(23,23,23,0.04)]" aria-label="Próxima sesión">
          <div className="grid lg:grid-cols-[minmax(0,1fr)_auto]">
            <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:p-6">
              <div className="grid size-14 shrink-0 place-items-center rounded-2xl bg-[#FFF3D7] font-['Poppins'] text-sm font-semibold text-[#8A5B00]">
                {nextSession.patientName.split(' ').map((part) => part[0]).slice(0, 2).join('')}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#A36B00]">Próxima sesión · 09:00</p>
                  <span className="size-1 rounded-full bg-[#D6D2CD]" />
                  <p className="text-[11px] font-medium text-[#747474]">En 25 minutos</p>
                </div>
                <div className="mt-2 flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-3">
                  <Link to={`/app/pacientes/${nextSession.patientId}`} className="font-['Poppins'] text-xl font-semibold tracking-[-0.02em] text-[#171717] hover:text-[#8A5B00]">
                    {nextSession.patientName}
                  </Link>
                  <p className="text-xs text-[#747474]">68 años · Mutualista Central</p>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-[#525252]">
                  <span className="flex items-center gap-1.5"><Activity size={14} className="text-[#A36B00]" /> {nextSession.title}</span>
                  <span className="flex items-center gap-1.5"><Clock3 size={14} /> 12 min</span>
                  <span className="flex items-center gap-1.5"><ShieldCheck size={14} /> {nextSession.mode === 'home' ? 'Domiciliaria' : 'Presencial supervisada'}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 border-t border-[#E9E7E7] bg-[#FCFBFA] p-4 lg:border-l lg:border-t-0 lg:px-5">
              <Link to={`/app/pacientes/${nextSession.patientId}`} className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-lg border border-[#D9D6D2] bg-white px-4 text-xs font-semibold text-[#2F2F2F] hover:border-[#BDB9B4] lg:flex-none">
                Ver ficha
              </Link>
              {nextSession.mode === 'in_person' ? (
                <Link to={`/app/pacientes/${nextSession.patientId}/sesiones/${nextSession.id}/presencial`} className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-[#E49A02] px-4 text-xs font-semibold text-[#171717] hover:bg-[#D99000] lg:flex-none">
                  Iniciar sesión <ArrowRight size={15} />
                </Link>
              ) : (
                <Link to="/app/sesiones" className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-[#171717] px-4 text-xs font-semibold text-white hover:bg-[#303030] lg:flex-none">
                  Ver sesión <ArrowRight size={15} />
                </Link>
              )}
            </div>
          </div>
        </section>
      )}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Resumen clínico">
        <MetricCard icon={Users} label="Pacientes activos" value={String(activePatients)} detail={`${patients.length} pacientes registrados`} />
        <MetricCard icon={CalendarDays} label="Sesiones de hoy" value={String(sessions.length)} detail={`${completedSessions} completadas`} />
        <MetricCard icon={CheckCircle2} label="Adherencia semanal" value="84%" detail="6 puntos sobre junio" progress={84} />
        <MetricCard icon={ClipboardCheck} label="Revisión pendiente" value={String(reviewSuggestions.length)} detail="Requiere criterio profesional" attention={reviewSuggestions.length > 0} />
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(340px,0.8fr)]">
        <article className="overflow-hidden rounded-2xl border border-[#E2DED9] bg-white shadow-[0_8px_24px_rgba(23,23,23,0.035)]">
          <div className="flex items-center justify-between border-b border-[#E9E7E7] px-5 py-4 sm:px-6">
            <div>
              <h2 className="text-base tracking-[-0.02em] text-[#171717]">Agenda de hoy</h2>
              <p className="mt-1 text-xs text-[#747474]">Sesiones planificadas y registradas</p>
            </div>
            <Link to="/app/sesiones" className="inline-flex items-center gap-1 text-xs font-semibold text-[#8A5B00] hover:text-[#171717]">Ver agenda <ChevronRight size={14} /></Link>
          </div>
          <div>
            {sessions.slice(0, 5).map((session, index) => (
              <div key={session.id} className="grid gap-3 border-b border-[#EFEEEC] px-5 py-4 last:border-b-0 sm:grid-cols-[64px_minmax(0,1fr)_auto] sm:items-center sm:px-6">
                <p className="text-sm font-semibold tabular-nums text-[#2F2F2F]">{scheduleTimes[index]}</p>
                <div className="flex min-w-0 items-center gap-3.5">
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#F1EFEC] text-[10px] font-bold text-[#525252]">
                    {session.patientName.split(' ').map((part) => part[0]).slice(0, 2).join('')}
                  </span>
                  <div className="min-w-0">
                    <Link to={`/app/pacientes/${session.patientId}`} className="truncate text-sm font-semibold text-[#171717] hover:text-[#8A5B00]">{session.patientName}</Link>
                    <p className="mt-0.5 truncate text-xs text-[#747474]">{session.title} · {session.mode === 'home' ? 'Domiciliaria' : 'Presencial'}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-3 sm:justify-end">
                  <StatusBadge status={session.status} />
                  <Link to={`/app/pacientes/${session.patientId}`} className="grid size-8 place-items-center rounded-lg text-[#747474] hover:bg-[#F7F6F4] hover:text-[#171717]" aria-label={`Abrir ficha de ${session.patientName}`}>
                    <ChevronRight size={16} />
                  </Link>
                </div>
              </div>
            ))}
            {sessions.length === 0 && <p className="px-6 py-10 text-center text-sm text-[#747474]">No hay sesiones planificadas para hoy.</p>}
          </div>
        </article>

        <article className="rounded-2xl border border-[#E2DED9] bg-white p-5 shadow-[0_8px_24px_rgba(23,23,23,0.035)] sm:p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#A36B00]">Evolución destacada</p>
              <h2 className="mt-2 text-base tracking-[-0.02em] text-[#171717]">Ana Pereira</h2>
              <p className="mt-1 text-xs text-[#747474]">Índice de estabilidad · Ciclo 2</p>
            </div>
            <Link to="/app/pacientes/ana-p" className="grid size-8 place-items-center rounded-lg text-[#747474] hover:bg-[#F7F6F4]" aria-label="Abrir ficha de Ana Pereira"><MoreHorizontal size={18} /></Link>
          </div>
          <div className="mt-6 flex items-end justify-between gap-4">
            <div>
              <p className="font-['Poppins'] text-[32px] font-semibold tracking-[-0.04em] text-[#171717]">78<span className="ml-1 text-base text-[#747474]">/100</span></p>
              <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-[#55745F]"><TrendingUp size={14} /> +12 puntos en 6 semanas</p>
            </div>
            <span className="rounded-full bg-[#FFF3D7] px-2.5 py-1 text-[10px] font-bold text-[#8A5B00]">MEJORA SOSTENIDA</span>
          </div>
          <div className="mt-6 flex h-28 items-end gap-2 border-b border-[#E9E7E7] pb-px" aria-label="Progreso ascendente de 42 a 78 puntos">
            {progressPoints.map((value, index) => (
              <div key={value + index} className="group relative flex h-full flex-1 items-end">
                <div className={`w-full rounded-t-sm ${index === progressPoints.length - 1 ? 'bg-[#E49A02]' : 'bg-[#E9E7E7]'}`} style={{ height: `${value}%` }} />
              </div>
            ))}
          </div>
          <div className="mt-3 flex justify-between text-[10px] font-medium text-[#99948F]"><span>10 jun</span><span>18 jul</span></div>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-[#F7F6F4] p-3"><p className="text-[10px] text-[#747474]">Equilibrio</p><p className="mt-1 text-sm font-semibold text-[#171717]">82 <span className="text-[10px] font-medium text-[#55745F]">+9</span></p></div>
            <div className="rounded-xl bg-[#F7F6F4] p-3"><p className="text-[10px] text-[#747474]">Estabilidad visual</p><p className="mt-1 text-sm font-semibold text-[#171717]">74 <span className="text-[10px] font-medium text-[#55745F]">+14</span></p></div>
          </div>
          <Link to="/app/pacientes/ana-p" className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-[#D9D6D2] text-xs font-semibold text-[#2F2F2F] hover:border-[#BDB9B4]">Ver evolución clínica <ChevronRight size={14} /></Link>
        </article>
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(340px,0.8fr)]">
        <article className="overflow-hidden rounded-2xl border border-[#E2DED9] bg-white">
          <div className="flex items-center justify-between border-b border-[#E9E7E7] px-5 py-4 sm:px-6">
            <div>
              <h2 className="text-base tracking-[-0.02em] text-[#171717]">Trazabilidad reciente</h2>
              <p className="mt-1 text-xs text-[#747474]">Últimos registros en historias clínicas</p>
            </div>
            <Link to="/app/informes" className="text-xs font-semibold text-[#8A5B00]">Ver actividad</Link>
          </div>
          <div className="divide-y divide-[#EFEEEC]">
            {[
              ['Sesión domiciliaria completada', 'Luis Silva', 'Hoy, 09:42', Check],
              ['Estudio posturográfico importado', 'Ana Pereira', 'Hoy, 09:18', Activity],
              ['Informe clínico actualizado', 'Jorge Martínez', 'Ayer, 17:36', FileText],
            ].map(([event, patient, time, Icon]) => {
              const EventIcon = Icon as typeof Check
              return (
                <div key={String(event)} className="flex items-center gap-3.5 px-5 py-3.5 sm:px-6">
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[#F7F6F4] text-[#747474]"><EventIcon size={14} /></span>
                  <div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold text-[#2F2F2F]">{String(event)}</p><p className="mt-0.5 text-[11px] text-[#747474]">{String(patient)}</p></div>
                  <time className="text-[10px] text-[#99948F]">{String(time)}</time>
                </div>
              )
            })}
          </div>
        </article>

        <article className="rounded-2xl border border-[#E2DED9] bg-white p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-xl bg-[#FFF3D7] text-[#8A5B00]"><ShieldCheck size={17} /></span>
            <div><h2 className="text-sm text-[#171717]">Control profesional</h2><p className="mt-0.5 text-[11px] text-[#747474]">Revisión y trazabilidad activas</p></div>
          </div>
          <div className="mt-5 space-y-3 text-xs text-[#525252]">
            <p className="flex items-center gap-2"><CheckCircle2 size={15} className="text-[#55745F]" /> Datos demostrativos identificados</p>
            <p className="flex items-center gap-2"><CheckCircle2 size={15} className="text-[#55745F]" /> Sugerencias sin publicación automática</p>
            <p className="flex items-center gap-2"><CheckCircle2 size={15} className="text-[#55745F]" /> Actividad profesional registrada</p>
          </div>
        </article>
      </section>
    </div>
  )
}

function MetricCard({
  icon: Icon,
  label,
  value,
  detail,
  progress,
  attention,
}: {
  icon: typeof Users
  label: string
  value: string
  detail: string
  progress?: number
  attention?: boolean
}) {
  return (
    <article className="rounded-2xl border border-[#E2DED9] bg-white p-4 shadow-[0_6px_18px_rgba(23,23,23,0.025)] sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold text-[#747474]">{label}</p>
          <p className="mt-2 font-['Poppins'] text-[27px] font-semibold tracking-[-0.04em] text-[#171717]">{value}</p>
        </div>
        <span className={`grid size-9 place-items-center rounded-xl ${attention ? 'bg-[#FFF3D7] text-[#8A5B00]' : 'bg-[#F1EFEC] text-[#525252]'}`}><Icon size={17} /></span>
      </div>
      <div className="mt-2.5">
        <p className={`text-[10px] ${attention ? 'font-semibold text-[#8A5B00]' : 'text-[#8B8782]'}`}>{detail}</p>
        {progress !== undefined && <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#ECEAE7]"><div className="h-full rounded-full bg-[#E49A02]" style={{ width: `${progress}%` }} /></div>}
      </div>
    </article>
  )
}
