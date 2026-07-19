import { CheckCircle2, KeyRound } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Brand } from '../components/Brand'
import { updateProfessionalPassword } from '../lib/auth'
import { isSupabaseConfigured } from '../lib/supabase'

export function ProfessionalPasswordUpdatePage() {
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(false)
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (password.length < 12) { setError('Usá al menos 12 caracteres.'); return }
    if (password !== confirmation) { setError('Las contraseñas no coinciden.'); return }
    try { setLoading(true); setError(''); if (isSupabaseConfigured) await updateProfessionalPassword(password); setSaved(true) }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'No fue posible actualizar la contraseña.') }
    finally { setLoading(false) }
  }
  return <main className="grid min-h-screen place-items-center bg-[#F7F6F4] px-5 py-10"><div className="w-full max-w-md"><Brand/><article className="mt-10 rounded-2xl border border-[#E9E7E7] bg-white p-7 shadow-[0_20px_48px_rgba(18,50,56,.08)] sm:p-9">
    {saved ? <div className="text-center"><CheckCircle2 className="mx-auto text-[#E49A02]" size={42}/><h1 className="mt-5 text-2xl font-black text-[#171717]">Contraseña actualizada</h1><p className="mt-3 text-sm text-[#747474]">Ya podés ingresar con tu nueva contraseña.</p><Link to="/ingresar" className="mt-7 inline-flex rounded-2xl bg-[#E49A02] px-5 py-3 text-sm font-black text-white">Ir al ingreso</Link></div>
      : <><KeyRound className="text-[#E49A02]" size={32}/><h1 className="mt-4 text-3xl font-black text-[#171717]">Nueva contraseña</h1><p className="mt-3 text-sm leading-6 text-[#747474]">Usá 12 caracteres o más y evitá datos personales.</p><form onSubmit={submit} className="mt-7 space-y-4"><label className="block text-sm font-black text-[#2F2F2F]">Nueva contraseña<input required type="password" minLength={12} autoComplete="new-password" value={password} onChange={(event)=>setPassword(event.target.value)} className="mt-2 h-13 w-full rounded-2xl border border-[#E9E7E7] px-4"/></label><label className="block text-sm font-black text-[#2F2F2F]">Repetir contraseña<input required type="password" minLength={12} autoComplete="new-password" value={confirmation} onChange={(event)=>setConfirmation(event.target.value)} className="mt-2 h-13 w-full rounded-2xl border border-[#E9E7E7] px-4"/></label>{error&&<p role="alert" className="rounded-2xl bg-[#fceced] p-3 text-xs font-bold text-[#a94952]">{error}</p>}<button disabled={loading} className="h-13 w-full rounded-2xl bg-[#E49A02] text-sm font-black text-white disabled:opacity-60">{loading?'Guardando…':'Guardar contraseña'}</button></form></>}
  </article></div></main>
}
