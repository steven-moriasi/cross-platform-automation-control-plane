#!/usr/bin/env bash
set -euo pipefail

repository_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$repository_root"

postgres_user="${POSTGRES_USER:-automation}"
postgres_database="${POSTGRES_DB:-automation_control_plane}"
drill_id="$(date -u +%Y%m%dT%H%M%SZ)-$$"
restore_database="restore_drill_${drill_id//[^a-zA-Z0-9]/_}"
evidence_directory="${RECOVERY_EVIDENCE_DIR:-.data/recovery}"
backup_file="$evidence_directory/postgres-$drill_id.dump"
source_counts="$evidence_directory/postgres-$drill_id-source.tsv"
restored_counts="$evidence_directory/postgres-$drill_id-restored.tsv"
source_migrations="$evidence_directory/postgres-$drill_id-source-migrations.tsv"
restored_migrations="$evidence_directory/postgres-$drill_id-restored-migrations.tsv"
report_file="$evidence_directory/postgres-restore-$drill_id.json"

mkdir -p "$evidence_directory"

cleanup() {
  docker compose exec -T postgres dropdb \
    --if-exists \
    --force \
    --username "$postgres_user" \
    "$restore_database" >/dev/null 2>&1 || true
}
trap cleanup EXIT

docker compose up --detach --wait postgres
docker compose run --rm control-plane-migrate

docker compose exec -T postgres pg_dump \
  --username "$postgres_user" \
  --dbname "$postgres_database" \
  --format=custom \
  --no-owner \
  --no-acl >"$backup_file"

docker compose exec -T postgres createdb \
  --username "$postgres_user" \
  "$restore_database"

docker compose exec -T postgres pg_restore \
  --username "$postgres_user" \
  --dbname "$restore_database" \
  --no-owner \
  --no-acl \
  --exit-on-error <"$backup_file"

count_query="
  select 'automations', count(*) from control_plane.automations
  union all select 'evidence_bundles', count(*) from control_plane.evidence_bundles
  union all select 'execution_events', count(*) from control_plane.execution_events
  union all select 'executions', count(*) from control_plane.executions
  union all select 'incidents', count(*) from control_plane.incidents
  union all select 'outbox_dead_letters', count(*) from control_plane.outbox_dead_letters
  union all select 'outbox_messages', count(*) from control_plane.outbox_messages
  union all select 'releases', count(*) from control_plane.releases
  union all select 'schema_migrations', count(*) from control_plane.schema_migrations
  order by 1
"
migration_query="
  select version, checksum
  from control_plane.schema_migrations
  order by version
"

docker compose exec -T postgres psql \
  --username "$postgres_user" \
  --dbname "$postgres_database" \
  --tuples-only \
  --no-align \
  --field-separator=$'\t' \
  --command "$count_query" >"$source_counts"
docker compose exec -T postgres psql \
  --username "$postgres_user" \
  --dbname "$restore_database" \
  --tuples-only \
  --no-align \
  --field-separator=$'\t' \
  --command "$count_query" >"$restored_counts"
docker compose exec -T postgres psql \
  --username "$postgres_user" \
  --dbname "$postgres_database" \
  --tuples-only \
  --no-align \
  --field-separator=$'\t' \
  --command "$migration_query" >"$source_migrations"
docker compose exec -T postgres psql \
  --username "$postgres_user" \
  --dbname "$restore_database" \
  --tuples-only \
  --no-align \
  --field-separator=$'\t' \
  --command "$migration_query" >"$restored_migrations"

diff --unified "$source_counts" "$restored_counts"
diff --unified "$source_migrations" "$restored_migrations"

backup_sha256="$(sha256sum "$backup_file" | cut -d' ' -f1)"
counts_sha256="$(sha256sum "$source_counts" | cut -d' ' -f1)"
migrations_sha256="$(sha256sum "$source_migrations" | cut -d' ' -f1)"

cat >"$report_file" <<EOF
{
  "backup_sha256": "$backup_sha256",
  "core_table_counts_sha256": "$counts_sha256",
  "drill_id": "$drill_id",
  "migration_inventory_sha256": "$migrations_sha256",
  "result": "PASSED",
  "source_database": "$postgres_database",
  "verified_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF

printf 'PostgreSQL restore drill passed: %s\n' "$report_file"
