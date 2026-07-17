import { CalendarDays, ChevronLeft, FileImage, FileText, KeyRound, Pencil, PlayCircle, Plus } from 'lucide-react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { PageHeader } from '../components/PageHeader'
import { StatusBadge } from '../components/StatusBadge'
import { usePatient } from '../features/patients/hooks'
import { useSessionAssignments, useTreatmentCycles } from '../features/sessions/hooks'
import { sessionDurationSeconds } from '../features/sessions/repository'
import { PatientDocumentsPanel } from '../features/documents/PatientDocumentsPanel'
import { PatientAssessmentsPanel } from '../features/assessments/PatientAssessmentsPanel'

export function PatientProfilePage() {
  const { patientId } = useParams()
  const location = useLocation()
  const { data: patient, isPending } = usePatient(patientId ?? '')
  const { data: cycles = [] } = useTreatmentCycles(patientId ?? '')
  const { data: assignments = [] } = useSessionAssignments(patientId ?? '')
  const activeCycle = cycles.find((cycle) => cycle.status === 'active')
  const activeAssignment = assignments.find((assignment) => assignment.status === 'assigned' || assignment.status === 'started')

  if (isPending) return <p className="text-sm text-[#60777d]">Cargando paciente…</p>

  if (!patient) {
    return <p className="text-sm text-[#60777d]">Paciente no encontrado.</p>
  }

  return (
    <div className="space-y-7">
      {(location.state as {notice?:string}|null)?.notice && <p className="rounded-2xl border border-[#bfe1db] bg-[#e8f5f2] px-4 py-3 text-sm font-bold text-[#08746e]">{(location.state as {notice:string}).notice}</p>}
      <Link to="/app/pacientes" className="inline-flex items-center gap-2 text-xs font-black text-[#0b7a75]">
        <ChevronLeft size={16} /> Volver a pacientes
      </Link>
      <PageHeader
        eyebrow="Perfil clínico"
        title={patient.fullName}
        description={`${patient.age} años · ${patient.insurer} · Última actividad: ${patient.lastActivity}`}
        actions={
          <>
            <Link to={`/app/pacientes/${patient.id}/editar`} className="inline-flex items-center gap-2 rounded-2xl border border-[#cfddda] bg-white px-4 py-3 text-sm font-black text-[#29474d]"><Pencil size={17}/> Editar</Link>
            <Link to={`/app/estudios/importar?patient=${patient.id}`} className="inline-flex items-center gap-2 rounded-2xl border border-[#cfddda] bg-white px-4 py-3 text-sm font-black text-[#29474d]">
              <FileImage size={17} /> Cargar estudio
            </Link>
            <Link to={`/app/pacientes/${patient.id}/sesiones/nueva`} className="inline-flex items-center gap-2 rounded-2xl bg-[#0b7a75] px-4 py-3 text-sm font-black text-white">
              <Plus size={17} /> Crear sesión
            </Link>
            <Link to={`/app/pacientes/${patient.id}/informe`} className="inline-flex items-center gap-2 rounded-2xl border border-[#cfddda] bg-white px-4 py-3 text-sm font-black text-[#29474d]"><FileText size={17}/> Informe</Link>
          </>
        }
      />

      <section className="grid gap-5 lg:grid-cols-[0.72fr_1.28fr]">
        <article className="rounded-3xl border border-[#dce7e5] bg-white p-6">
          <div className="flex items-center gap-4">
            <span className="grid size-16 place-items-center rounded-3xl bg-[#e8f5f2] text-lg font-black text-[#08746e]">{patient.initials}</span>
            <div>
              <StatusBadge status={patient.status} />
              <p className="mt-2 text-xs text-[#71878c]">Acceso al portal: <strong>{patient.portalAccess === 'enabled' ? 'habilitado' : 'deshabilitado'}</strong></p>
            </div>
          </div>
          <dl className="mt-7 space-y-4 text-sm">
            <div className="flex justify-between gap-4 border-b border-[#e8efed] pb-4"><dt className="text-[#71878c]">Ciclo actual</dt><dd className="font-black text-[#29474d]">{activeCycle?.label ?? 'Sin ciclo activo'}</dd></div>
            <div className="flex justify-between gap-4 border-b border-[#e8efed] pb-4"><dt className="text-[#71878c]">Mutualista</dt><dd className="font-black text-[#29474d]">{patient.insurer}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-[#71878c]">Permisos activos</dt><dd className="font-black text-[#29474d]">1 documento</dd></div>
          </dl>
          <Link to={`/app/pacientes/${patient.id}/acceso`} className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-[#cfddda] px-4 py-3 text-sm font-black text-[#29474d]">
            <KeyRound size={17} /> Gestionar acceso
          </Link>
        </article>

        <div className="grid gap-5 sm:grid-cols-2">
          <article className="rounded-3xl border border-[#dce7e5] bg-white p-6">
            <CalendarDays className="text-[#0b7a75]" size={22} />
            <h2 className="mt-5 text-lg font-black text-[#123238]">Ciclo de tratamiento</h2>
            <p className="mt-2 text-sm leading-6 text-[#60777d]">{activeCycle?.objectives || 'Ingreso, evaluación, sesiones e informe final se conservan dentro del mismo ciclo.'}</p>
            {activeCycle?<div className="mt-6 rounded-2xl bg-[#f4f8f7] p-4 text-xs text-[#536b70]">{activeCycle.label} · Inicio: {activeCycle.startedOn} · {assignments.filter(item=>item.treatmentCycleId===activeCycle.id).length} sesiones</div>:<Link to={`/app/pacientes/${patient.id}/ciclos/nuevo`} className="mt-6 inline-flex rounded-2xl border border-[#cfddda] px-4 py-3 text-xs font-black text-[#0b7a75]">Iniciar primer ciclo</Link>}
          </article>
          <article className="rounded-3xl border border-[#dce7e5] bg-white p-6">
            <PlayCircle className="text-[#0b7a75]" size={22} />
            <h2 className="mt-5 text-lg font-black text-[#123238]">Sesión asignada</h2>
            <p className="mt-2 text-sm leading-6 text-[#60777d]">{activeAssignment ? `${activeAssignment.title} · ${Math.ceil(sessionDurationSeconds(activeAssignment)/60)} min · ${activeAssignment.exercises.length} ejercicios` : 'No hay una sesión activa para hoy.'}</p>
            <div className="mt-6 rounded-2xl bg-[#e8f5f2] p-4 text-xs font-bold text-[#08746e]">Continuación automática · pausa, omitir o salir</div>
          </article>
          <article className="rounded-3xl border border-[#dce7e5] bg-white p-6 sm:col-span-2">
            <div className="flex items-center justify-between gap-4"><h2 className="text-lg font-black text-[#123238]">Sesiones asignadas</h2><Link to={`/app/pacientes/${patient.id}/sesiones/nueva`} className="text-xs font-black text-[#0b7a75]">Nueva sesión</Link></div>
            <div className="mt-5 divide-y divide-[#e8efed]">{assignments.length===0?<p className="py-4 text-sm text-[#71878c]">Todavía no hay sesiones.</p>:assignments.slice(0,5).map(assignment=><div key={assignment.id} className="flex items-center justify-between gap-4 py-4"><div><p className="text-sm font-black text-[#29474d]">{assignment.title}</p><p className="mt-1 text-xs text-[#71878c]">{assignment.mode==='home'?'Domiciliaria':'Presencial'} · {assignment.exercises.length} ejercicios · desde {assignment.availableFrom.slice(0,10)}</p></div><StatusBadge status={assignment.status}/></div>)}</div>
          </article>
          <PatientDocumentsPanel patientId={patient.id}/>
          <PatientAssessmentsPanel patientId={patient.id} cycleId={activeCycle?.id??''}/>
          <article className="rounded-3xl border border-[#dce7e5] bg-white p-6 sm:col-span-2">
            <h2 className="text-lg font-black text-[#123238]">Línea de tiempo</h2>
            <div className="mt-5 space-y-4 border-l-2 border-[#cfe2df] pl-5">
              {['Sesión domiciliaria completada', 'Posturografía cargada', 'Cuestionario inicial transcrito'].map((event, index) => (
                <div key={event} className="relative">
                  <span className="absolute -left-[27px] top-1 size-3 rounded-full border-2 border-white bg-[#0b7a75]" />
                  <p className="text-sm font-black text-[#29474d]">{event}</p>
                  <p className="mt-1 text-xs text-[#71878c]">{index === 0 ? 'Hoy, 09:20' : index === 1 ? '15 jul 2026' : '02 jul 2026'}</p>
                </div>
              ))}
            </div>
          </article>
        </div>
      </section>
    </div>
  )
}
