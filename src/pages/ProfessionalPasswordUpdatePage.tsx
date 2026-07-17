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
  return <main className="grid min-h-screen place-items-center bg-[#f3f7f6] px-5 py-10"><div className="w-full max-w-md"><Brand/><article className="mt-10 rounded-[32px] border border-[#d8e4e1] bg-white p-7 shadow-[0_20px_48px_rgba(18,50,56,.08)] sm:p-9">
    {saved ? <div className="text-center"><CheckCircle2 className="mx-auto text-[#0b7a75]" size={42}/><h1 className="mt-5 text-2xl font-black text-[#123238]">Contraseña actualizada</h1><p className="mt-3 text-sm text-[#60777d]">Ya podés ingresar con tu nueva contraseña.</p><Link to="/ingresar" className="mt-7 inline-flex rounded-2xl bg-[#0b7a75] px-5 py-3 text-sm font-black text-white">Ir al ingreso</Link></div>
      : <><KeyRound className="text-[#0b7a75]" size={32}/><h1 className="mt-4 text-3xl font-black text-[#123238]">Nueva contraseña</h1><p className="mt-3 text-sm leading-6 text-[#60777d]">Usá 12 caracteres o más y evitá datos personales.</p><form onSubmit={submit} className="mt-7 space-y-4"><label className="block text-sm font-black text-[#29474d]">Nueva contraseña<input required type="password" minLength={12} autoComplete="new-password" value={password} onChange={(event)=>setPassword(event.target.value)} className="mt-2 h-13 w-full rounded-2xl border border-[#cfddda] px-4"/></label><label className="block text-sm font-black text-[#29474d]">Repetir contraseña<input required type="password" minLength={12} autoComplete="new-password" value={confirmation} onChange={(event)=>setConfirmation(event.target.value)} className="mt-2 h-13 w-full rounded-2xl border border-[#cfddda] px-4"/></label>{error&&<p role="alert" className="rounded-2xl bg-[#fceced] p-3 text-xs font-bold text-[#a94952]">{error}</p>}<button disabled={loading} className="h-13 w-full rounded-2xl bg-[#0b7a75] text-sm font-black text-white disabled:opacity-60">{loading?'Guardando…':'Guardar contraseña'}</button></form></>}
  </article></div></main>
}
