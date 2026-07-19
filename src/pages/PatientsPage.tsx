import { ChevronRight, Plus, Search, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { DeletePatientDialog } from '../components/DeletePatientDialog'
import { PageHeader } from '../components/PageHeader'
import { StatusBadge } from '../components/StatusBadge'
import { useDeletePatient, usePatients } from '../features/patients/hooks'
import type { PatientRecord } from '../features/patients/repository'

export function PatientsPage() {
  const [search, setSearch] = useState('')
  const [patientToDelete, setPatientToDelete] = useState<PatientRecord | null>(null)
  const [notice, setNotice] = useState('')
  const { data: patients = [], isPending, error } = usePatients()
  const deletePatient = useDeletePatient()
  const visible = patients.filter((patient) => patient.fullName.toLocaleLowerCase().includes(search.toLocaleLowerCase()))

  function requestDeletion(patient: PatientRecord) {
    deletePatient.reset()
    setNotice('')
    setPatientToDelete(patient)
  }

  function cancelDeletion() {
    if (deletePatient.isPending) return
    deletePatient.reset()
    setPatientToDelete(null)
  }

  async function confirmDeletion() {
    if (!patientToDelete) return
    const patientName = patientToDelete.fullName
    try {
      const result = await deletePatient.mutateAsync(patientToDelete.id)
      setPatientToDelete(null)
      setNotice(result.warning ?? `${patientName} fue eliminado junto con su información clínica.`)
    } catch {
      // El mensaje se presenta dentro del diálogo de confirmación.
    }
  }

  const deletionError = deletePatient.error
    ? deletePatient.error instanceof Error
      ? deletePatient.error.message
      : 'No fue posible eliminar el paciente.'
    : undefined

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Gestión clínica"
        title="Pacientes"
        description="Perfiles, ciclos, sesiones y acceso al portal."
        actions={(
          <Link to="/app/pacientes/nuevo" className="inline-flex h-11 items-center gap-2 rounded-lg bg-[#E49A02] px-4 text-sm font-black text-white">
            <Plus size={17} /> Crear paciente
          </Link>
        )}
      />

      {notice && <p role="status" className="rounded-xl border border-[#CFE2D6] bg-[#EEF7F1] px-4 py-3 text-sm font-bold text-[#27734C]">{notice}</p>}

      <section className="overflow-hidden rounded-2xl border border-[#E9E7E7] bg-white shadow-[0_12px_30px_rgba(21,54,60,0.05)]">
        <div className="border-b border-[#E9E7E7] p-5">
          <label className="relative block max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#747474]" size={17} />
            <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por nombre…" className="h-11 w-full rounded-lg border border-[#E9E7E7] bg-[#F7F6F4] pl-10 pr-4 text-sm" />
          </label>
        </div>

        <div className="hidden grid-cols-[minmax(0,1fr)_112px] gap-2 border-b border-[#E9E7E7] bg-[#F7F6F4] px-4 py-3 text-[10px] font-black uppercase tracking-[0.12em] text-[#747474] md:grid">
          <div className="grid grid-cols-[1.3fr_0.8fr_1fr_1.1fr_0.7fr_36px] gap-4 px-2">
            <span>Paciente</span><span>Estado</span><span>Ciclo</span><span>Sesión de hoy</span><span>Portal</span><span />
          </div>
          <span className="text-center">Acciones</span>
        </div>

        {isPending && <p className="p-8 text-sm text-[#747474]">Cargando pacientes…</p>}
        {error && <p role="alert" className="p-8 text-sm font-bold text-[#A94952]">No fue posible cargar los pacientes.</p>}
        {!isPending && !error && visible.length === 0 && <p className="p-8 text-sm text-[#747474]">No hay pacientes que coincidan con la búsqueda.</p>}

        <div className="divide-y divide-[#E9E7E7]">
          {visible.map((patient) => (
            <div key={patient.id} className="grid transition hover:bg-[#F7F6F4] md:grid-cols-[minmax(0,1fr)_112px] md:items-stretch">
              <Link to={`/app/pacientes/${patient.id}`} className="grid gap-4 px-5 py-5 md:grid-cols-[1.3fr_0.8fr_1fr_1.1fr_0.7fr_36px] md:items-center md:px-6">
                <div className="flex items-center gap-3">
                  <span className="grid size-10 place-items-center rounded-xl bg-[#FFF7E8] text-xs font-black text-[#A36B00]">{patient.initials}</span>
                  <div>
                    <p className="text-sm font-black text-[#171717]">{patient.fullName}</p>
                    <p className="mt-0.5 text-xs text-[#747474]">{patient.age ? `${patient.age} años · ` : ''}{patient.insurer}</p>
                  </div>
                </div>
                <div><StatusBadge status={patient.status} /></div>
                <p className="text-xs font-bold text-[#747474]">{patient.cycleLabel}</p>
                <p className="text-xs text-[#747474]">{patient.todaySession ?? 'Sin asignación'}</p>
                <div><StatusBadge status={patient.portalAccess} /></div>
                <ChevronRight className="hidden text-[#A1A1A1] md:block" size={18} />
              </Link>
              <div className="flex items-center px-5 pb-5 md:px-2 md:py-3">
                <button
                  type="button"
                  onClick={() => requestDeletion(patient)}
                  className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-[#E5C7CA] bg-white px-3 text-xs font-bold text-[#A94952] transition hover:border-[#A94952] hover:bg-[#FCECED]"
                  aria-label={`Eliminar a ${patient.fullName}`}
                >
                  <Trash2 size={15} /> Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {patientToDelete && (
        <DeletePatientDialog
          patientName={patientToDelete.fullName}
          isPending={deletePatient.isPending}
          error={deletionError}
          onCancel={cancelDeletion}
          onConfirm={confirmDeletion}
        />
      )}
    </div>
  )
}
