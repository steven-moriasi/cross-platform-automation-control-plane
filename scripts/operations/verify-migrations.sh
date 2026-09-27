#!/usr/bin/env bash
set -euo pipefail

repository_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$repository_root"

postgres_user="${POSTGRES_USER:-automation}"
postgres_database="${POSTGRES_DB:-automation_control_plane}"
verification_id="$(date -u +%Y%m%dT%H%M%SZ)-$$"
evidence_directory="${RECOVERY_EVIDENCE_DIR:-.data/recovery}"
expected_file="$evidence_directory/migrations-$verification_id-expected.tsv"
actual_file="$evidence_directory/migrations-$verification_id-actual.tsv"
report_file="$evidence_directory/migration-verification-$verification_id.json"

mkdir -p "$evidence_directory"
docker compose up --detach --wait postgres
docker compose run --rm control-plane-migrate

for migration in services/control-plane/migrations/*.sql; do
  printf '%s\t%s\n' \
    "$(basename "$migration")" \
    "$(sha256sum "$migration" | cut -d' ' -f1)"
done | sort >"$expected_file"

docker compose exec -T postgres psql \
  --username "$postgres_user" \
  --dbname "$postgres_database" \
  --tuples-only \
  --no-align \
  --field-separator=$'\t' \
  --command "
    select version, checksum
    from control_plane.schema_migrations
    order by version
  " >"$actual_file"

diff --unified "$expected_file" "$actual_file"

inventory_sha256="$(sha256sum "$actual_file" | cut -d' ' -f1)"
cat >"$report_file" <<EOF
{
  "database": "$postgres_database",
  "migration_inventory_sha256": "$inventory_sha256",
  "result": "PASSED",
  "verified_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF

printf 'Migration verification passed: %s\n' "$report_file"
