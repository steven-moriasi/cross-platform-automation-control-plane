#!/usr/bin/env bash
set -euo pipefail

repository_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$repository_root"

postgres_user="${POSTGRES_USER:-automation}"
postgres_database="${POSTGRES_DB:-automation_control_plane}"
drill_id="$(date -u +%Y%m%dT%H%M%SZ)-$$"
event_id="$(cat /proc/sys/kernel/random/uuid)"
aggregate_id="outbox-recovery-$event_id"
evidence_directory="${RECOVERY_EVIDENCE_DIR:-.data/recovery}"
report_file="$evidence_directory/outbox-recovery-$drill_id.json"
message_id=""

mkdir -p "$evidence_directory"

database_query() {
  docker compose exec -T postgres psql \
    --username "$postgres_user" \
    --dbname "$postgres_database" \
    --quiet \
    --tuples-only \
    --no-align \
    --command "$1"
}

cleanup() {
  docker compose up --detach control-plane-worker >/dev/null 2>&1 || true
  if [[ -n "$message_id" ]]; then
    database_query "
      delete from control_plane.outbox_dead_letters
      where outbox_message_id = $message_id;
      delete from control_plane.outbox_messages
      where id = $message_id;
    " >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT

docker compose up --detach --wait postgres control-plane-worker
docker compose stop control-plane-worker

message_id="$(
  database_query "
    insert into control_plane.outbox_messages (
      topic,
      aggregate_id,
      payload,
      available_at,
      attempts,
      max_attempts,
      leased_by,
      lease_expires_at
    )
    values (
      'telemetry.execution.accepted',
      '$aggregate_id',
      jsonb_build_object(
        'automationId', 'claims-intake-n8n',
        'correlationId', '$aggregate_id',
        'environment', 'demo',
        'eventId', '$event_id',
        'executionId', '$aggregate_id',
        'occurredAt', to_char(now(), 'YYYY-MM-DD\"T\"HH24:MI:SS.MS\"Z\"'),
        'status', 'SUCCEEDED'
      ),
      now(),
      1,
      5,
      'terminated-worker-drill',
      now() - interval '1 second'
    )
    returning id;
  " | tr -d '[:space:]'
)"

docker compose up --detach control-plane-worker

processed_at=""
for _ in $(seq 1 30); do
  processed_at="$(
    database_query "
      select coalesce(processed_at::text, '')
      from control_plane.outbox_messages
      where id = $message_id;
    " | tr -d '\n'
  )"
  if [[ -n "$processed_at" ]]; then
    break
  fi
  sleep 1
done

if [[ -z "$processed_at" ]]; then
  printf 'Outbox message %s was not recovered within 30 seconds.\n' "$message_id" >&2
  exit 1
fi

final_attempts="$(
  database_query "
    select attempts
    from control_plane.outbox_messages
    where id = $message_id;
  " | tr -d '[:space:]'
)"

cat >"$report_file" <<EOF
{
  "drill_id": "$drill_id",
  "expired_lease_owner": "terminated-worker-drill",
  "final_attempts": $final_attempts,
  "message_id": "$message_id",
  "processed_at": "$processed_at",
  "result": "PASSED",
  "verified_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF

printf 'Outbox recovery drill passed: %s\n' "$report_file"
