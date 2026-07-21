import { createClient } from '@supabase/supabase-js'

const required = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'PROFESSIONAL_EMAIL', 'PROFESSIONAL_PASSWORD']
for (const key of required) {
  if (!process.env[key]) throw new Error(`Falta ${key}`)
}

const client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const rejected = await client.auth.signInWithPassword({
  email: 'cuenta-inexistente-onur@example.invalid',
  password: 'credencial-invalida-onur',
})
if (!rejected.error || rejected.data.user) throw new Error('El servicio aceptó credenciales profesionales inválidas.')

const valid = await client.auth.signInWithPassword({
  email: process.env.PROFESSIONAL_EMAIL,
  password: process.env.PROFESSIONAL_PASSWORD,
})
if (valid.error || !valid.data.user) throw new Error('El servicio rechazó la cuenta profesional configurada.')

const { data: profile, error: profileError } = await client
  .from('profiles')
  .select('role')
  .eq('id', valid.data.user.id)
  .single()
if (profileError || profile?.role !== 'professional') throw new Error('La cuenta configurada no tiene el rol profesional requerido.')

await client.auth.signOut()
process.stdout.write('Accesos profesional inválido y válido verificados correctamente.\n')
