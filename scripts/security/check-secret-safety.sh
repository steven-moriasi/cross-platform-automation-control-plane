#!/usr/bin/env bash
set -euo pipefail

repository_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$repository_root"

failed=0

tracked_sensitive_files="$(
  git ls-files |
    rg '(^|/)(\.env($|\.)|credentials\.json$|id_rsa$|.*\.(key|p12|pem)$)' |
    rg -v '(^|/)\.env\.example$' || true
)"
if [[ -n "$tracked_sensitive_files" ]]; then
  printf 'Tracked sensitive file names detected:\n%s\n' "$tracked_sensitive_files" >&2
  failed=1
fi

scan_pattern='AKIA[0-9A-Z]{16}|gh[pousr]_[A-Za-z0-9]{36,}|-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----'
secret_matches="$(
  git grep --line-number --extended-regexp "$scan_pattern" -- \
    . \
    ':(exclude)packages/contracts/src/manifest.ts' \
    ':(exclude)scripts/security/check-secret-safety.sh' || true
)"
if [[ -n "$secret_matches" ]]; then
  printf 'Credential-shaped content detected:\n%s\n' "$secret_matches" >&2
  failed=1
fi

if git grep --line-number --fixed-strings '"client_secret":' -- \
  . \
  ':(exclude)automations/power-platform/src/Other/Customizations.xml' \
  ':(exclude)scripts/security/check-secret-safety.sh' >/dev/null; then
  printf 'A literal client_secret field is tracked outside the documented connector metadata.\n' >&2
  failed=1
fi

if [[ "$failed" -ne 0 ]]; then
  exit 1
fi

printf 'Secret-safety checks passed.\n'
