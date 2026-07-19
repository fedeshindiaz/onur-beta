import { ArrowLeft, MailCheck } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Brand } from '../components/Brand'
import { requestProfessionalPasswordReset } from '../lib/auth'
import { isSupabaseConfigured } from '../lib/supabase'

export function ProfessionalPasswordRecoveryPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!isSupabaseConfigured) { setSent(true); return }
    try { setLoading(true); setError(''); await requestProfessionalPasswordReset(email); setSent(true) }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'No fue posible procesar la solicitud.') }
    finally { setLoading(false) }
  }
  return <main className="grid min-h-screen place-items-center bg-[#F7F6F4] px-5 py-10"><div className="w-full max-w-md"><Brand/><article className="mt-10 rounded-2xl border border-[#E9E7E7] bg-white p-7 shadow-[0_20px_48px_rgba(18,50,56,.08)] sm:p-9">
    {sent ? <div className="text-center"><MailCheck className="mx-auto text-[#E49A02]" size={42}/><h1 className="mt-5 text-2xl font-black text-[#171717]">Revisá tu correo</h1><p className="mt-3 text-sm leading-6 text-[#747474]">Si el correo corresponde a una cuenta profesional, recibirás un enlace para crear una nueva contraseña.</p><Link to="/ingresar" className="mt-7 inline-flex items-center gap-2 text-sm font-black text-[#E49A02]"><ArrowLeft size={16}/> Volver al ingreso</Link></div>
      : <><p className="text-xs font-black uppercase tracking-[.16em] text-[#E49A02]">Acceso profesional</p><h1 className="mt-3 text-3xl font-black text-[#171717]">Recuperar contraseña</h1><p className="mt-3 text-sm leading-6 text-[#747474]">Te enviaremos un enlace al correo de tu cuenta.</p><form onSubmit={submit} className="mt-7"><label className="text-sm font-black text-[#2F2F2F]">Correo profesional<input required type="email" autoComplete="email" value={email} onChange={(event)=>setEmail(event.target.value)} className="mt-2 h-13 w-full rounded-2xl border border-[#E9E7E7] px-4"/></label>{error&&<p role="alert" className="mt-4 rounded-2xl bg-[#fceced] p-3 text-xs font-bold text-[#a94952]">{error}</p>}<button disabled={loading} className="mt-5 h-13 w-full rounded-2xl bg-[#E49A02] text-sm font-black text-white disabled:opacity-60">{loading?'Enviando…':'Enviar enlace'}</button></form><Link to="/ingresar" className="mt-6 inline-flex items-center gap-2 text-sm font-black text-[#747474]"><ArrowLeft size={16}/> Volver</Link></>}
  </article></div></main>
}
