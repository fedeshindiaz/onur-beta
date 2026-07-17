#!/usr/bin/env bash
set -euo pipefail

required=(
  SUPABASE_PROJECT_REF
  SUPABASE_ACCESS_TOKEN
  SUPABASE_DB_PASSWORD
  SUPABASE_URL
  SUPABASE_ANON_KEY
  SUPABASE_SERVICE_ROLE_KEY
  PATIENT_AUTH_PEPPER
  ALLOWED_ORIGIN
  PROFESSIONAL_EMAIL
  PROFESSIONAL_PASSWORD
)

for key in "${required[@]}"; do
  if [[ -z "${!key:-}" ]]; then
    echo "Falta $key. No se realizó ningún despliegue." >&2
    exit 1
  fi
done

if [[ "$ALLOWED_ORIGIN" != https://* ]]; then
  echo "ALLOWED_ORIGIN debe ser una URL HTTPS exacta." >&2
  exit 1
fi

npm run typecheck
npm run lint
npm run test:run
npm run staging:dry-run
npm run staging:deploy
npm run admin:create
npm run staging:smoke

export VITE_SUPABASE_URL="$SUPABASE_URL"
export VITE_SUPABASE_ANON_KEY="$SUPABASE_ANON_KEY"
npm run build

echo "Staging preparado y frontend generado en dist/."
