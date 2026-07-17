import { createClient } from 'npm:@supabase/supabase-js@2'
import { derivePatientAuthSecret } from '../_shared/auth-secret.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { jsonResponse } from '../_shared/http.ts'

const actions = ['enable', 'disable', 'unlock', 'reset_temporary_secret'] as const

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return jsonResponse({ error: 'Método no permitido.' }, 405)
  const bearer = request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '')
  if (!bearer) return jsonResponse({ error: 'No autorizado.' }, 401)

  try {
    const { patient_id, action, temporary_ci } = await request.json()
    if (typeof patient_id !== 'string' || !actions.includes(action)) return jsonResponse({ error: 'Solicitud inválida.' }, 400)
    const url = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const pepper = Deno.env.get('PATIENT_AUTH_PEPPER')!
    const admin = createClient(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } })
    const { data: actorData } = await admin.auth.getUser(bearer)
    const actorId = actorData.user?.id
    if (!actorId) return jsonResponse({ error: 'No autorizado.' }, 401)
    const [{ data: profile }, { data: patient }, { data: account }] = await Promise.all([
      admin.from('profiles').select('role').eq('id', actorId).maybeSingle(),
      admin.from('patients').select('id, professional_id').eq('id', patient_id).maybeSingle(),
      admin.from('patient_portal_accounts').select('patient_id, auth_user_id').eq('patient_id', patient_id).maybeSingle(),
    ])
    if (profile?.role !== 'professional' || patient?.professional_id !== actorId || !account) return jsonResponse({ error: 'No autorizado.' }, 403)

    if (action === 'enable') await admin.from('patient_portal_accounts').update({ enabled: true }).eq('patient_id', patient_id)
    if (action === 'disable') await admin.from('patient_portal_accounts').update({ enabled: false }).eq('patient_id', patient_id)
    if (action === 'unlock') await admin.from('patient_portal_accounts').update({ failed_attempts: 0, locked_until: null }).eq('patient_id', patient_id)
    if (action === 'reset_temporary_secret') {
      const cleanCi = String(temporary_ci ?? '').replace(/\D/g, '')
      if (!/^\d{6,12}$/.test(cleanCi)) return jsonResponse({ error: 'La cédula temporal no es válida.' }, 400)
      const secret = await derivePatientAuthSecret(patient_id, cleanCi, pepper)
      const { error } = await admin.auth.admin.updateUserById(account.auth_user_id, { password: secret })
      if (error) return jsonResponse({ error: 'No se pudo restablecer el acceso.' }, 400)
      await admin.from('patient_portal_accounts').update({ must_change_pin: true, failed_attempts: 0, locked_until: null, enabled: true }).eq('patient_id', patient_id)
    }
    await admin.from('audit_events').insert({ actor_user_id: actorId, action: `patient_account_${action}`, entity_type: 'patient', entity_id: patient_id })
    return jsonResponse({ success: true })
  } catch {
    return jsonResponse({ error: 'No fue posible gestionar la cuenta.' }, 400)
  }
})
