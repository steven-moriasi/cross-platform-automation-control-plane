#!/usr/bin/env bash
set -euo pipefail

repository_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repository_root"
repository_host_root="${REPOSITORY_HOST_ROOT:-$repository_root}"

evidence_directory=".data/release-artifacts"
checksum_file="$evidence_directory/SHA256SUMS"

mkdir -p "$evidence_directory"

pnpm manifests:validate
pnpm --filter make-return-refund-automation build
pnpm --filter n8n-nodes-control-plane-telemetry build
pnpm --filter power-platform-field-inspection build
PACKAGE_HOST_ROOT="$repository_host_root/automations/power-platform/field-inspection" \
  pnpm --filter power-platform-field-inspection pack:solution
pnpm --filter synthetic-partner-onboarding-zapier build

docker compose config --quiet
pnpm infrastructure:validate

mapfile -t artifacts < <(
  {
    find automations/make/return-refund -type f \
      \( -name 'blueprint.json' -o -name '*.schema.json' \)
    find automations/n8n/claims-intake -type f -name '*.json'
    find automations/power-platform/field-inspection/dist -type f -name '*.zip'
    find automations/zapier/partner-onboarding/build -type f
    find automations/manifests -type f -name '*.json'
  } | sort
)

if [[ "${#artifacts[@]}" -eq 0 ]]; then
  printf 'No release artifacts were found.\n' >&2
  exit 1
fi

sha256sum "${artifacts[@]}" >"$checksum_file"

secret_pattern='local-(telemetry-signing|synthetic-callback|session|client)-secret'
for artifact in "${artifacts[@]}"; do
  if [[ "$artifact" == *.zip ]]; then
    if unzip -p "$artifact" |
      grep --text --extended-regexp "$secret_pattern" >/dev/null; then
      printf 'Local-only secret material appeared in %s.\n' "$artifact" >&2
      exit 1
    fi
  elif grep --text --extended-regexp --quiet "$secret_pattern" "$artifact"; then
    printf 'Local-only secret material appeared in %s.\n' "$artifact" >&2
    exit 1
  fi
done

printf 'Artifact validation passed: %s\n' "$checksum_file"
