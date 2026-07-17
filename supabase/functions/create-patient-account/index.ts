import { createClient } from 'npm:@supabase/supabase-js@2'
import { derivePatientAuthSecret, normalizeUsername } from '../_shared/auth-secret.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { jsonResponse } from '../_shared/http.ts'

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Método no permitido.' }, 405)
  }

  const bearer = request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '')
  if (!bearer) {
    return jsonResponse({ error: 'No autorizado.' }, 401)
  }

  try {
    const { patient_id, username, temporary_ci } = await request.json()
    const usernameNormalized = normalizeUsername(String(username ?? ''))
    const temporaryCi = String(temporary_ci ?? '').replace(/\D/g, '')

    if (
      typeof patient_id !== 'string'
      || !/^[a-z0-9]{4,40}$/.test(usernameNormalized)
      || !/^\d{6,12}$/.test(temporaryCi)
    ) {
      return jsonResponse({ error: 'Datos de cuenta inválidos.' }, 400)
    }

    const url = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const pepper = Deno.env.get('PATIENT_AUTH_PEPPER')!
    const admin = createClient(url, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    const { data: actorData } = await admin.auth.getUser(bearer)
    const actorId = actorData.user?.id
    if (!actorId) {
      return jsonResponse({ error: 'No autorizado.' }, 401)
    }

    const [{ data: profile }, { data: patient }] = await Promise.all([
      admin.from('profiles').select('role').eq('id', actorId).maybeSingle(),
      admin.from('patients').select('id, professional_id').eq('id', patient_id).maybeSingle(),
    ])

    if (profile?.role !== 'professional' || patient?.professional_id !== actorId) {
      return jsonResponse({ error: 'No autorizado.' }, 403)
    }

    const internalEmail = `${crypto.randomUUID()}@patient.onur.invalid`
    const derivedSecret = await derivePatientAuthSecret(patient_id, temporaryCi, pepper)
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email: internalEmail,
      password: derivedSecret,
      email_confirm: true,
      app_metadata: { role: 'patient' },
      user_metadata: { display_name: 'Paciente ONUr' },
    })

    if (createError || !created.user) {
      return jsonResponse({ error: 'No se pudo crear la cuenta.' }, 409)
    }

    const { error: accountError } = await admin.from('patient_portal_accounts').insert({
      patient_id,
      auth_user_id: created.user.id,
      username_normalized: usernameNormalized,
      auth_login_email: internalEmail,
      must_change_pin: true,
      enabled: true,
    })

    if (accountError) {
      await admin.auth.admin.deleteUser(created.user.id)
      return jsonResponse({ error: 'El usuario ya existe o no pudo asociarse.' }, 409)
    }

    await admin.from('patients').update({ auth_user_id: created.user.id }).eq('id', patient_id)
    await admin.from('audit_events').insert({
      actor_user_id: actorId,
      action: 'patient_account_created',
      entity_type: 'patient',
      entity_id: patient_id,
      metadata: { username_normalized: usernameNormalized },
    })

    return jsonResponse({ username: usernameNormalized, must_change_pin: true }, 201)
  } catch {
    return jsonResponse({ error: 'No se pudo crear la cuenta.' }, 400)
  }
})
