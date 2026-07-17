import { Eye, EyeOff, LockKeyhole, ShieldCheck, UserRound, UsersRound } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Brand } from '../components/Brand'
import { signInPatient, signInProfessional } from '../lib/auth'
import { isSupabaseConfigured } from '../lib/supabase'
import { useAuth } from '../features/auth/AuthProvider'

type LoginMode = 'professional' | 'patient'

export function LoginPage() {
  const [mode, setMode] = useState<LoginMode>('professional')
  const [showSecret, setShowSecret] = useState(false)
  const [identifier, setIdentifier] = useState('')
  const [secret, setSecret] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const auth = useAuth()

  const enterDemo = (role: LoginMode) => {
    auth.enterDemo(role)
    navigate(role === 'professional' ? '/app' : '/paciente/hoy')
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)

    if (!isSupabaseConfigured) {
      enterDemo(mode)
      return
    }

    setLoading(true)
    try {
      if (mode === 'professional') {
        await signInProfessional(identifier, secret)
        navigate('/app')
      } else {
        const result = await signInPatient(identifier, secret)
        navigate(result.mustChangePin ? '/paciente/crear-pin' : '/paciente/hoy')
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No fue posible iniciar sesión.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="grid min-h-screen lg:grid-cols-[1.05fr_0.95fr]">
      <section className="relative hidden overflow-hidden bg-[#123238] p-12 text-white lg:flex lg:flex-col lg:justify-between xl:p-16">
        <div className="absolute -right-28 -top-28 size-[410px] rounded-full border-[70px] border-[#79d8cd]/12" />
        <div className="absolute -bottom-52 -left-36 size-[520px] rounded-full border-[82px] border-white/[0.045]" />
        <Brand light />

        <div className="relative max-w-xl">
          <p className="text-sm font-black uppercase tracking-[0.2em] text-[#79d8cd]">Entrenamiento vestíbulo-visual</p>
          <h1 className="mt-5 text-5xl font-black leading-[1.02] tracking-[-0.045em] xl:text-6xl">
            Una sesión clara para cada paciente.
          </h1>
          <p className="mt-6 max-w-lg text-base leading-7 text-white/62">
            Configuración profesional, ejecución guiada y seguimiento en un entorno diseñado para conservar privacidad y trazabilidad.
          </p>
        </div>

        <div className="relative grid grid-cols-2 gap-4 text-sm">
          <div className="rounded-3xl border border-white/10 bg-white/[0.055] p-5">
            <ShieldCheck className="text-[#79d8cd]" size={23} />
            <p className="mt-4 font-black">Privacidad primero</p>
            <p className="mt-1 text-xs leading-5 text-white/55">Acceso por rol, permisos y auditoría.</p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/[0.055] p-5">
            <LockKeyhole className="text-[#79d8cd]" size={23} />
            <p className="mt-4 font-black">Revisión profesional</p>
            <p className="mt-1 text-xs leading-5 text-white/55">Sin diagnóstico automático.</p>
          </div>
        </div>
      </section>

      <section className="flex items-center justify-center px-5 py-10 sm:px-10">
        <div className="w-full max-w-[470px]">
          <div className="mb-10 lg:hidden">
            <Brand />
          </div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[#0b7a75]">ONUr 1.0 Beta</p>
          <h2 className="mt-3 text-4xl font-black tracking-[-0.04em] text-[#123238]">Ingresar</h2>
          <p className="mt-3 text-sm leading-6 text-[#667d82]">Elegí el tipo de acceso para continuar.</p>

          <div className="mt-8 grid grid-cols-2 rounded-2xl bg-[#e8efed] p-1.5">
            <button
              type="button"
              onClick={() => setMode('professional')}
              className={`flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-black transition ${
                mode === 'professional' ? 'bg-white text-[#123238] shadow-sm' : 'text-[#667d82]'
              }`}
            >
              <UserRound size={17} /> Profesional
            </button>
            <button
              type="button"
              onClick={() => setMode('patient')}
              className={`flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-black transition ${
                mode === 'patient' ? 'bg-white text-[#123238] shadow-sm' : 'text-[#667d82]'
              }`}
            >
              <UsersRound size={17} /> Paciente
            </button>
          </div>

          <form className="mt-7 space-y-5" onSubmit={submit}>
            <label className="block">
              <span className="text-sm font-black text-[#29474d]">{mode === 'professional' ? 'Correo profesional' : 'Usuario'}</span>
              <input
                type={mode === 'professional' ? 'email' : 'text'}
                name="identifier"
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
                autoComplete="username"
                placeholder={mode === 'professional' ? 'profesional@ejemplo.com' : 'PepitoPerez'}
                className="mt-2 h-13 w-full rounded-2xl border border-[#cfddda] bg-white px-4 text-sm text-[#17363c] shadow-sm placeholder:text-[#9aabad]"
              />
            </label>
            <label className="block">
              <span className="text-sm font-black text-[#29474d]">{mode === 'professional' ? 'Contraseña' : 'PIN de 4 dígitos'}</span>
              <span className="relative mt-2 block">
                <input
                  type={showSecret ? 'text' : 'password'}
                  name="secret"
                  value={secret}
                  onChange={(event) => setSecret(event.target.value)}
                  inputMode={mode === 'patient' ? 'numeric' : undefined}
                  maxLength={mode === 'patient' ? 4 : undefined}
                  autoComplete="current-password"
                  placeholder={mode === 'patient' ? '••••' : 'Ingresá tu contraseña'}
                  className="h-13 w-full rounded-2xl border border-[#cfddda] bg-white px-4 pr-12 text-sm text-[#17363c] shadow-sm placeholder:text-[#9aabad]"
                />
                <button
                  type="button"
                  onClick={() => setShowSecret((visible) => !visible)}
                  className="absolute inset-y-0 right-1 grid w-11 place-items-center text-[#71868b]"
                  aria-label={showSecret ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showSecret ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </span>
            </label>

            {mode === 'professional' && (
              <div className="-mt-2 text-right">
                <Link to="/recuperar-clave" className="text-xs font-black text-[#0b7a75]">¿Olvidaste tu contraseña?</Link>
              </div>
            )}

            {error && <p role="alert" className="rounded-2xl bg-[#fceced] px-4 py-3 text-xs font-bold text-[#a94952]">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="h-13 w-full rounded-2xl bg-[#0b7a75] px-5 text-sm font-black text-white shadow-[0_10px_24px_rgba(11,122,117,0.22)] transition hover:bg-[#086b66]"
            >
              {loading ? 'Ingresando…' : isSupabaseConfigured ? 'Ingresar' : 'Ingresar a la demostración'}
            </button>
          </form>

          <div className="mt-6 rounded-2xl border border-[#d7e4e1] bg-white p-4 text-xs leading-5 text-[#637a80]">
            <strong className="text-[#29474d]">Estado técnico:</strong>{' '}
            {isSupabaseConfigured
              ? 'Supabase está configurado para este entorno.'
              : 'modo demo; todavía no se envían credenciales ni datos clínicos.'}
          </div>
        </div>
      </section>
    </main>
  )
}
