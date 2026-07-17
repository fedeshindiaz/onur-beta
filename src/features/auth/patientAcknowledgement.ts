import { isSupabaseConfigured, supabase } from '../../lib/supabase'

export const PATIENT_ACKNOWLEDGEMENT = { code: 'PORTAL_USE', version: '1.0-beta' } as const
const DEMO_KEY = `onur-demo-ack-${PATIENT_ACKNOWLEDGEMENT.version}`

export interface PatientAcknowledgementRecord { accepted: boolean; acceptedAt: string }

export async function getPatientAcknowledgement(): Promise<PatientAcknowledgementRecord> {
  if (!isSupabaseConfigured || !supabase) { const acceptedAt = localStorage.getItem(DEMO_KEY) ?? ''; return { accepted: Boolean(acceptedAt), acceptedAt } }
  const { data: auth, error: authError } = await supabase.auth.getUser()
  if (authError || !auth.user) throw new Error('Sesión no disponible.')
  const { data: patient, error: patientError } = await supabase.from('patients').select('id').eq('auth_user_id', auth.user.id).maybeSingle()
  if (patientError || !patient) throw new Error('Cuenta de paciente no disponible.')
  const { data, error } = await supabase.from('patient_acknowledgements').select('accepted_at').eq('patient_id', patient.id).eq('document_code', PATIENT_ACKNOWLEDGEMENT.code).eq('document_version', PATIENT_ACKNOWLEDGEMENT.version).maybeSingle()
  if (error) throw error
  return { accepted: Boolean(data), acceptedAt: String(data?.accepted_at ?? '') }
}

export async function acceptPatientAcknowledgement(): Promise<PatientAcknowledgementRecord> {
  if (!isSupabaseConfigured || !supabase) { const acceptedAt = new Date().toISOString(); localStorage.setItem(DEMO_KEY, acceptedAt); return { accepted: true, acceptedAt } }
  const { data, error } = await supabase.rpc('accept_patient_acknowledgement', { document_code_input: PATIENT_ACKNOWLEDGEMENT.code, document_version_input: PATIENT_ACKNOWLEDGEMENT.version })
  if (error) throw error
  return { accepted: true, acceptedAt: String(data) }
}
