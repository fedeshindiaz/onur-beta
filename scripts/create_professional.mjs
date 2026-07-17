import { createClient } from '@supabase/supabase-js'

if (process.argv.includes('--help')) {
  process.stdout.write(`Crea o actualiza el único profesional de ONUr.\n\nVariables requeridas:\n  SUPABASE_URL\n  SUPABASE_SERVICE_ROLE_KEY\n  PROFESSIONAL_EMAIL\n  PROFESSIONAL_PASSWORD\n\nVariable opcional:\n  PROFESSIONAL_DISPLAY_NAME (por defecto: Profesional ONUr)\n`)
  process.exit(0)
}

const required = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'PROFESSIONAL_EMAIL', 'PROFESSIONAL_PASSWORD']
for (const key of required) if (!process.env[key]) throw new Error(`Falta ${key}.`)

const email = process.env.PROFESSIONAL_EMAIL.trim().toLowerCase()
const password = process.env.PROFESSIONAL_PASSWORD
const displayName = process.env.PROFESSIONAL_DISPLAY_NAME?.trim() || 'Profesional ONUr'

if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('PROFESSIONAL_EMAIL no es válido.')
if (password.length < 12 || !/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/\d/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
  throw new Error('PROFESSIONAL_PASSWORD debe tener al menos 12 caracteres, mayúscula, minúscula, número y símbolo.')
}
if (displayName.length < 3 || displayName.length > 100) throw new Error('PROFESSIONAL_DISPLAY_NAME no es válido.')

const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

async function findUserByEmail(targetEmail) {
  for (let page = 1; page <= 100; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 })
    if (error) throw error
    const match = data.users.find((user) => user.email?.toLowerCase() === targetEmail)
    if (match) return match
    if (data.users.length < 1000) return null
  }
  throw new Error('No fue posible revisar todas las identidades del proyecto.')
}

const existingUser = await findUserByEmail(email)
const { data: existingProfessionals, error: professionalError } = await admin.from('profiles').select('id').eq('role', 'professional')
if (professionalError) throw professionalError

const otherProfessional = (existingProfessionals ?? []).find((profile) => profile.id !== existingUser?.id)
if (otherProfessional) throw new Error('El proyecto ya contiene otro profesional. ONUr Beta admite uno solo; no se hizo ningún cambio.')

let user = existingUser
if (user) {
  const { data, error } = await admin.auth.admin.updateUserById(user.id, {
    password,
    email_confirm: true,
    app_metadata: { ...user.app_metadata, role: 'professional' },
    user_metadata: { ...user.user_metadata, display_name: displayName },
  })
  if (error) throw error
  user = data.user
} else {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: { role: 'professional' },
    user_metadata: { display_name: displayName },
  })
  if (error) throw error
  user = data.user
}

const { error: profileError } = await admin.from('profiles').upsert({ id: user.id, role: 'professional', display_name: displayName })
if (profileError) throw profileError

process.stdout.write(`Cuenta profesional preparada: ${email} · ${displayName} · ${user.id}\n`)
