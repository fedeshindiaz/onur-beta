import { createClient } from 'npm:@supabase/supabase-js@2'
import { derivePatientAuthSecret, normalizeUsername } from '../_shared/auth-secret.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { genericAuthError, jsonResponse } from '../_shared/http.ts'

const MAX_ATTEMPTS = 5
const LOCK_MINUTES = 15

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Método no permitido.' }, 405)
  }

  try {
    const { username, secret } = await request.json()
    if (typeof username !== 'string' || typeof secret !== 'string') {
      return genericAuthError()
    }

    const usernameNormalized = normalizeUsername(username)
    if (!/^[a-z0-9]{4,40}$/.test(usernameNormalized) || secret.length < 4 || secret.length > 16) {
      return genericAuthError()
    }

    const url = Deno.env.get('SUPABASE_URL')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const pepper = Deno.env.get('PATIENT_AUTH_PEPPER')!

    if (!url || !anonKey || !serviceRoleKey || !pepper) {
      return jsonResponse({ error: 'Servicio de acceso no configurado.' }, 503)
    }

    const admin = createClient(url, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const { data: account } = await admin
      .from('patient_portal_accounts')
      .select('patient_id, auth_user_id, auth_login_email, must_change_pin, enabled, failed_attempts, locked_until')
      .eq('username_normalized', usernameNormalized)
      .maybeSingle()

    if (!account || !account.enabled) {
      return genericAuthError()
    }

    if (account.locked_until && new Date(account.locked_until) > new Date()) {
      return genericAuthError()
    }

    const derivedSecret = await derivePatientAuthSecret(account.patient_id, secret, pepper)
    const authClient = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const { data, error } = await authClient.auth.signInWithPassword({
      email: account.auth_login_email,
      password: derivedSecret,
    })

    if (error || !data.session) {
      const failedAttempts = account.failed_attempts + 1
      const lockUntil = failedAttempts >= MAX_ATTEMPTS
        ? new Date(Date.now() + LOCK_MINUTES * 60_000).toISOString()
        : null

      await admin
        .from('patient_portal_accounts')
        .update({ failed_attempts: failedAttempts, locked_until: lockUntil })
        .eq('patient_id', account.patient_id)

      return genericAuthError()
    }

    await admin
      .from('patient_portal_accounts')
      .update({ failed_attempts: 0, locked_until: null, last_login_at: new Date().toISOString() })
      .eq('patient_id', account.patient_id)

    return jsonResponse({
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_in: data.session.expires_in,
        expires_at: data.session.expires_at,
      },
      must_change_pin: account.must_change_pin,
    })
  } catch {
    return genericAuthError()
  }
})
