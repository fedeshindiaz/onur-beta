#!/usr/bin/env bash
set -euo pipefail

repository="${GITHUB_REPOSITORY:-fedeshindiaz/onur-beta}"
branch="${GITHUB_DEFAULT_BRANCH:-main}"

if ! command -v gh >/dev/null 2>&1; then
  echo "Falta GitHub CLI (gh). Instalalo y ejecutá: gh auth login" >&2
  exit 1
fi

gh auth status >/dev/null

if [[ -n "$(git status --porcelain)" ]]; then
  echo "El repositorio local tiene cambios sin confirmar. No se publicó nada." >&2
  exit 1
fi

if gh repo view "$repository" >/dev/null 2>&1; then
  remote_url="$(gh repo view "$repository" --json url --jq .url)"
  if git remote get-url origin >/dev/null 2>&1; then
    current_remote="$(git remote get-url origin)"
    if [[ "$current_remote" != "$remote_url" && "$current_remote" != "$remote_url.git" ]]; then
      echo "El remoto origin apunta a otro repositorio. No se modificó." >&2
      exit 1
    fi
  else
    git remote add origin "$remote_url.git"
  fi
  git push --set-upstream origin "$branch"
else
  gh repo create "$repository" --private --source=. --remote=origin --push
fi

gh repo edit "$repository" --description "ONUr Beta · herramienta profesional de entrenamiento vestíbulo-visual" --enable-issues=false --enable-wiki=false
echo "Repositorio privado publicado: https://github.com/$repository"
