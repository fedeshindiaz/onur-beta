import { corsHeaders } from './cors.ts'

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  })
}

export function genericAuthError(): Response {
  return jsonResponse({ error: 'No fue posible iniciar sesión con esos datos.' }, 401)
}
