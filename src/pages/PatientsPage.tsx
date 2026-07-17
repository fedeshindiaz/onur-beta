import { ChevronRight, Plus, Search } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader } from '../components/PageHeader'
import { StatusBadge } from '../components/StatusBadge'
import { usePatients } from '../features/patients/hooks'

export function PatientsPage() {
  const [search, setSearch] = useState('')
  const { data: patients = [], isPending, error } = usePatients()
  const visible = patients.filter((patient) => patient.fullName.toLocaleLowerCase().includes(search.toLocaleLowerCase()))
  return <div className="space-y-7">
    <PageHeader eyebrow="Gestión clínica" title="Pacientes" description="Perfiles, ciclos, sesiones y acceso al portal." actions={<Link to="/app/pacientes/nuevo" className="inline-flex items-center gap-2 rounded-2xl bg-[#0b7a75] px-4 py-3 text-sm font-black text-white"><Plus size={17}/> Crear paciente</Link>}/>
    <section className="overflow-hidden rounded-3xl border border-[#dce7e5] bg-white shadow-[0_12px_30px_rgba(21,54,60,0.05)]">
      <div className="border-b border-[#e5edeb] p-5"><label className="relative block max-w-md"><Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#829599]" size={17}/><input type="search" value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Buscar por nombre…" className="h-11 w-full rounded-2xl border border-[#d5e1df] bg-[#f9fbfa] pl-10 pr-4 text-sm"/></label></div>
      <div className="hidden grid-cols-[1.3fr_0.8fr_1fr_1.1fr_0.7fr_36px] gap-4 border-b border-[#e5edeb] bg-[#f8faf9] px-6 py-3 text-[10px] font-black uppercase tracking-[0.12em] text-[#71878c] md:grid"><span>Paciente</span><span>Estado</span><span>Ciclo</span><span>Sesión de hoy</span><span>Portal</span><span/></div>
      {isPending && <p className="p-8 text-sm text-[#60777d]">Cargando pacientes…</p>}
      {error && <p role="alert" className="p-8 text-sm font-bold text-[#a94952]">No fue posible cargar los pacientes.</p>}
      {!isPending && !error && visible.length === 0 && <p className="p-8 text-sm text-[#60777d]">No hay pacientes que coincidan con la búsqueda.</p>}
      <div className="divide-y divide-[#e8efed]">{visible.map((patient)=><Link key={patient.id} to={`/app/pacientes/${patient.id}`} className="grid gap-4 px-5 py-5 transition hover:bg-[#f8fbfa] md:grid-cols-[1.3fr_0.8fr_1fr_1.1fr_0.7fr_36px] md:items-center md:px-6"><div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-2xl bg-[#e8f5f2] text-xs font-black text-[#08746e]">{patient.initials}</span><div><p className="text-sm font-black text-[#17363c]">{patient.fullName}</p><p className="mt-0.5 text-xs text-[#789095]">{patient.age ? `${patient.age} años · ` : ''}{patient.insurer}</p></div></div><div><StatusBadge status={patient.status}/></div><p className="text-xs font-bold text-[#536b70]">{patient.cycleLabel}</p><p className="text-xs text-[#60777d]">{patient.todaySession??'Sin asignación'}</p><div><StatusBadge status={patient.portalAccess}/></div><ChevronRight className="hidden text-[#9aabad] md:block" size={18}/></Link>)}</div>
    </section>
  </div>
}
