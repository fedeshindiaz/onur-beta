import { isSupabaseConfigured, supabase } from '../../lib/supabase'
import { completeSessionAssignment, type SessionCompletionInput } from './repository'

const QUEUE_KEY = 'onur-pending-session-completions-v1'

function readQueue(): SessionCompletionInput[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(QUEUE_KEY) ?? '[]')
    return Array.isArray(parsed) ? parsed as SessionCompletionInput[] : []
  } catch {
    return []
  }
}

function writeQueue(queue: SessionCompletionInput[]) {
  if (queue.length === 0) localStorage.removeItem(QUEUE_KEY)
  else localStorage.setItem(QUEUE_KEY, JSON.stringify(queue))
}

export function pendingSessionCompletionCount() {
  return readQueue().length
}

export function queueSessionCompletion(input: SessionCompletionInput) {
  const queue = readQueue().filter((item) => item.assignment.id !== input.assignment.id)
  writeQueue([...queue, { ...input, assignment: { id: input.assignment.id, patientId: input.assignment.patientId } }])
}

export function isLikelyNetworkFailure(error: unknown) {
  if (!navigator.onLine || error instanceof TypeError) return true
  const message = error instanceof Error ? error.message : String(error)
  return /failed to fetch|network|load failed|fetch failed/i.test(message)
}

export async function flushPendingSessionCompletions() {
  if (!isSupabaseConfigured || !supabase || !navigator.onLine) return 0
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return 0
  const { data: patient } = await supabase.from('patients').select('id').eq('auth_user_id', auth.user.id).maybeSingle()
  if (!patient) return 0
  const queue = readQueue()
  let synced = 0
  for (const item of queue.filter((pending) => pending.assignment.patientId === patient.id)) {
    try {
      await completeSessionAssignment(item)
      writeQueue(readQueue().filter((pending) => pending.assignment.id !== item.assignment.id))
      synced += 1
    } catch {
      break
    }
  }
  return synced
}

export function clearPendingSessionCompletions() {
  localStorage.removeItem(QUEUE_KEY)
}
