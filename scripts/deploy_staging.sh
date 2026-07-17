#!/usr/bin/env bash
set -euo pipefail

: "${SUPABASE_PROJECT_REF:?Falta SUPABASE_PROJECT_REF}"
: "${SUPABASE_ACCESS_TOKEN:?Falta SUPABASE_ACCESS_TOKEN}"
: "${SUPABASE_DB_PASSWORD:?Falta SUPABASE_DB_PASSWORD}"
: "${PATIENT_AUTH_PEPPER:?Falta PATIENT_AUTH_PEPPER}"

export HOME="${SUPABASE_CLI_HOME:-/tmp/onur-supabase-home}"
export NPM_CONFIG_CACHE="${ONUR_NPM_CACHE:-/tmp/onur-npm-cache}"
mkdir -p "$HOME" "$NPM_CONFIG_CACHE"

dry_run="${1:-}"

npx supabase link --project-ref "$SUPABASE_PROJECT_REF" --password "$SUPABASE_DB_PASSWORD"

if [[ "$dry_run" == "--dry-run" ]]; then
  npx supabase db push --linked --password "$SUPABASE_DB_PASSWORD" --include-seed --dry-run
  exit 0
fi

npx supabase db push --linked --password "$SUPABASE_DB_PASSWORD" --include-seed --yes
function_secrets=("PATIENT_AUTH_PEPPER=$PATIENT_AUTH_PEPPER")
if [[ -n "${ALLOWED_ORIGIN:-}" ]]; then function_secrets+=("ALLOWED_ORIGIN=$ALLOWED_ORIGIN"); fi
npx supabase secrets set --project-ref "$SUPABASE_PROJECT_REF" "${function_secrets[@]}"
npx supabase functions deploy --project-ref "$SUPABASE_PROJECT_REF" --use-api --jobs 4

echo "Migraciones, seed y funciones desplegados en staging."
