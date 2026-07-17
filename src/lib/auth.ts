import { z } from 'zod'
import { supabase } from './supabase'

const patientLoginResponseSchema = z.object({
  session: z.object({
    access_token: z.string(),
    refresh_token: z.string(),
  }),
  must_change_pin: z.boolean(),
})

export async function signInProfessional(email: string, password: string): Promise<void> {
  if (!supabase) throw new Error('Supabase no está configurado.')
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw new Error('No fue posible iniciar sesión con esos datos.')
}

export async function signInPatient(username: string, secret: string): Promise<{ mustChangePin: boolean }> {
  if (!supabase) throw new Error('Supabase no está configurado.')
  const { data, error } = await supabase.functions.invoke('patient-login', {
    body: { username, secret },
  })
  if (error) throw new Error('No fue posible iniciar sesión con esos datos.')

  const parsed = patientLoginResponseSchema.safeParse(data)
  if (!parsed.success) throw new Error('La respuesta del servicio de acceso no es válida.')

  const { error: sessionError } = await supabase.auth.setSession({
    access_token: parsed.data.session.access_token,
    refresh_token: parsed.data.session.refresh_token,
  })
  if (sessionError) throw new Error('No fue posible establecer la sesión.')
  return { mustChangePin: parsed.data.must_change_pin }
}

export async function changePatientPin(pin: string): Promise<void> {
  if (!supabase) throw new Error('Supabase no está configurado.')
  const { error } = await supabase.functions.invoke('change-patient-pin', { body: { pin } })
  if (error) throw new Error('No se pudo actualizar el PIN.')
}

export async function requestProfessionalPasswordReset(email: string): Promise<void> {
  if (!supabase) throw new Error('Supabase no está configurado.')
  const redirectTo = `${window.location.origin}${import.meta.env.BASE_URL}restablecer-clave`
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo })
  if (error) throw new Error('No fue posible procesar la solicitud. Intentá nuevamente.')
}

export async function updateProfessionalPassword(password: string): Promise<void> {
  if (!supabase) throw new Error('Supabase no está configurado.')
  const { data: auth, error: authError } = await supabase.auth.getUser()
  if (authError || !auth.user) throw new Error('El enlace no es válido o venció. Solicitá uno nuevo.')
  const { data: profile, error: profileError } = await supabase.from('profiles').select('role').eq('id', auth.user.id).maybeSingle()
  if (profileError || profile?.role !== 'professional') throw new Error('Este cambio de contraseña no está disponible para la cuenta.')
  const { error } = await supabase.auth.updateUser({ password })
  if (error) throw new Error('No fue posible actualizar la contraseña.')
}
