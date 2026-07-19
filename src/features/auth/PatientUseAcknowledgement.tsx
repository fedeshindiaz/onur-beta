import { ShieldCheck } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { acceptPatientAcknowledgement, PATIENT_ACKNOWLEDGEMENT } from './patientAcknowledgement'
import { acknowledgementKey } from './patientAcknowledgementHooks'

export function PatientUseAcknowledgement() {
  const client = useQueryClient()
  const accept = useMutation({ mutationFn: acceptPatientAcknowledgement, onSuccess: (data) => client.setQueryData(acknowledgementKey, data) })
  return <article className="mt-8 rounded-2xl border border-[#E8CE99] bg-white p-7 shadow-[0_20px_48px_rgba(18,50,56,.08)] sm:p-9">
    <ShieldCheck className="text-[#E49A02]" size={34}/><p className="mt-5 text-xs font-black uppercase tracking-[.16em] text-[#E49A02]">Primera vez</p><h2 className="mt-3 text-2xl font-black text-[#171717]">Confirmación de uso</h2>
    <div className="mt-5 space-y-3 text-sm leading-6 text-[#747474]"><p>Entiendo que ONUr es una herramienta de apoyo para realizar ejercicios indicados por mi profesional.</p><p>La aplicación no realiza diagnósticos ni reemplaza una consulta. Haré la sesión en el lugar, postura y condiciones que me indicaron.</p><p>Puedo pausar, omitir o salir en cualquier momento. Si no puedo continuar o necesito orientación, me comunicaré con mi profesional.</p><p>Mis respuestas antes y después de cada sesión describen mi experiencia y no generan decisiones automáticas.</p></div>
    {accept.error&&<p role="alert" className="mt-5 rounded-2xl bg-[#fceced] p-3 text-xs font-bold text-[#a94952]">No fue posible guardar la confirmación. Intentá nuevamente.</p>}
    <button type="button" disabled={accept.isPending} onClick={()=>accept.mutate()} className="mt-7 h-14 w-full rounded-2xl bg-[#E49A02] text-sm font-black text-white disabled:opacity-60">{accept.isPending?'Guardando…':'Entiendo y continuar'}</button>
    <p className="mt-4 text-center text-[10px] text-[#747474]">Versión {PATIENT_ACKNOWLEDGEMENT.version} · Se guardará fecha y cuenta de aceptación.</p>
  </article>
}
