import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { jsonResponse } from '../_shared/http.ts'

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return jsonResponse({ error: 'Método no permitido.' }, 405)

  const bearer = request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '')
  if (!bearer) return jsonResponse({ error: 'No autorizado.' }, 401)

  try {
    const { patient_id } = await request.json()
    if (typeof patient_id !== 'string' || !uuidPattern.test(patient_id)) return jsonResponse({ error: 'Solicitud inválida.' }, 400)

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    )
    const { data: actorData } = await admin.auth.getUser(bearer)
    const actorId = actorData.user?.id
    if (!actorId) return jsonResponse({ error: 'No autorizado.' }, 401)

    const [{ data: profile }, { data: patient }, { data: documents, error: documentsError }] = await Promise.all([
      admin.from('profiles').select('role').eq('id', actorId).maybeSingle(),
      admin.from('patients').select('id, professional_id, auth_user_id').eq('id', patient_id).maybeSingle(),
      admin.from('source_documents').select('storage_path').eq('patient_id', patient_id),
    ])

    if (profile?.role !== 'professional' || patient?.professional_id !== actorId) {
      return jsonResponse({ error: 'Paciente no encontrado o sin autorización.' }, 403)
    }
    if (documentsError) return jsonResponse({ error: 'No fue posible preparar la eliminación de los documentos.' }, 400)

    const { data: deleted, error: deleteError } = await admin
      .from('patients')
      .delete()
      .eq('id', patient_id)
      .eq('professional_id', actorId)
      .select('id')
      .maybeSingle()

    if (deleteError || !deleted) return jsonResponse({ error: 'No fue posible eliminar el paciente.' }, 400)

    const cleanupWarnings: string[] = []
    const expectedStoragePrefix = `${actorId}/${patient_id}/`
    const storagePaths = (documents ?? [])
      .map((document) => document.storage_path)
      .filter((path): path is string => typeof path === 'string' && path.startsWith(expectedStoragePrefix))

    for (let index = 0; index < storagePaths.length; index += 100) {
      const { error: storageError } = await admin.storage.from('clinical-documents').remove(storagePaths.slice(index, index + 100))
      if (storageError) cleanupWarnings.push('documentos')
    }

    if (patient.auth_user_id && patient.auth_user_id !== actorId) {
      const { error: authDeleteError } = await admin.auth.admin.deleteUser(patient.auth_user_id)
      if (authDeleteError) cleanupWarnings.push('acceso al portal')
    }

    await admin.from('audit_events').insert({
      actor_user_id: actorId,
      action: 'patient_deleted',
      entity_type: 'patient',
      entity_id: patient_id,
      metadata: {
        storage_objects: storagePaths.length,
        portal_account_removed: Boolean(patient.auth_user_id),
        cleanup_warnings: [...new Set(cleanupWarnings)],
      },
    })

    const warning = cleanupWarnings.length
      ? 'El paciente fue eliminado. Algunos recursos asociados requieren limpieza administrativa.'
      : undefined

    return jsonResponse({ success: true, warning })
  } catch {
    return jsonResponse({ error: 'No fue posible eliminar el paciente.' }, 400)
  }
})
