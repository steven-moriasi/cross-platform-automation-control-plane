create table control_plane.execution_events (
  event_id uuid primary key,
  schema_version text not null,
  automation_id text not null references control_plane.automations (id),
  release_version text not null,
  platform text not null,
  environment text not null,
  execution_id text not null,
  status text not null,
  occurred_at timestamptz not null,
  duration_ms integer,
  error_code text,
  correlation_id text,
  machine_client_id text not null,
  accepted_at timestamptz not null default now(),
  constraint execution_events_status
    check (status in ('STARTED', 'SUCCEEDED', 'FAILED', 'TIMED_OUT')),
  constraint execution_events_platform
    check (platform in ('n8n', 'zapier', 'make', 'power-platform')),
  constraint execution_events_environment
    check (environment in ('demo', 'staging', 'production')),
  constraint execution_events_duration
    check (duration_ms is null or duration_ms >= 0),
  constraint execution_events_failure_details
    check (
      (
        status in ('FAILED', 'TIMED_OUT')
        and error_code is not null
        and duration_ms is not null
      )
      or (
        status = 'SUCCEEDED'
        and error_code is null
        and duration_ms is not null
      )
      or status = 'STARTED'
    )
);

create index execution_events_execution_lookup_idx
  on control_plane.execution_events (
    automation_id,
    environment,
    execution_id,
    occurred_at
  );

create index execution_events_accepted_at_idx
  on control_plane.execution_events (accepted_at desc);

create table control_plane.executions (
  automation_id text not null references control_plane.automations (id),
  environment text not null,
  execution_id text not null,
  release_version text not null,
  platform text not null,
  status text not null,
  first_occurred_at timestamptz not null,
  latest_occurred_at timestamptz not null,
  duration_ms integer,
  error_code text,
  correlation_id text,
  event_count integer not null default 1,
  updated_at timestamptz not null default now(),
  primary key (automation_id, environment, execution_id),
  constraint executions_status
    check (status in ('STARTED', 'SUCCEEDED', 'FAILED', 'TIMED_OUT')),
  constraint executions_event_count check (event_count > 0)
);

create index executions_latest_idx
  on control_plane.executions (latest_occurred_at desc);

create index executions_status_idx
  on control_plane.executions (status, latest_occurred_at desc);

create table control_plane.outbox_messages (
  id bigint generated always as identity primary key,
  topic text not null,
  aggregate_id text not null,
  payload jsonb not null,
  available_at timestamptz not null default now(),
  attempts integer not null default 0,
  max_attempts integer not null default 5,
  leased_by text,
  lease_expires_at timestamptz,
  processed_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  constraint outbox_attempts
    check (attempts >= 0 and max_attempts between 1 and 20)
);

create index outbox_available_idx
  on control_plane.outbox_messages (available_at, id)
  where processed_at is null;

create table control_plane.outbox_dead_letters (
  id bigint generated always as identity primary key,
  outbox_message_id bigint not null unique,
  topic text not null,
  aggregate_id text not null,
  payload jsonb not null,
  attempts integer not null,
  last_error text not null,
  failed_at timestamptz not null default now()
);

create table control_plane.releases (
  id uuid primary key,
  automation_id text not null references control_plane.automations (id),
  version text not null,
  manifest_version text not null,
  target_environment text not null,
  source_commit text not null,
  artifact_checksum text not null,
  configuration_changes jsonb not null,
  provider_deployment_reference text,
  rollback_instructions text not null,
  evidence_expires_at timestamptz not null,
  proposer_subject text not null,
  proposer_display_name text not null,
  status text not null default 'PROPOSED',
  proposed_at timestamptz not null default now(),
  decided_at timestamptz,
  approver_subject text,
  approver_display_name text,
  decision_rationale text,
  constraint releases_status
    check (status in ('PROPOSED', 'APPROVED', 'REJECTED')),
  constraint releases_target_environment
    check (target_environment in ('demo', 'staging', 'production')),
  constraint releases_artifact_checksum
    check (artifact_checksum ~ '^[a-f0-9]{64}$'),
  constraint releases_decision_consistency
    check (
      (
        status = 'PROPOSED'
        and decided_at is null
        and approver_subject is null
        and approver_display_name is null
        and decision_rationale is null
      )
      or (
        status in ('APPROVED', 'REJECTED')
        and decided_at is not null
        and approver_subject is not null
        and approver_display_name is not null
        and decision_rationale is not null
      )
    ),
  unique (automation_id, version, target_environment)
);

create index releases_status_idx
  on control_plane.releases (status, proposed_at desc);

create table control_plane.release_history (
  id bigint generated always as identity primary key,
  release_id uuid not null references control_plane.releases (id),
  event_type text not null,
  actor_subject text not null,
  actor_display_name text not null,
  rationale text,
  recorded_at timestamptz not null default now(),
  constraint release_history_event_type
    check (event_type in ('PROPOSED', 'APPROVED', 'REJECTED'))
);

create index release_history_lookup_idx
  on control_plane.release_history (release_id, recorded_at);

create table control_plane.incidents (
  id uuid primary key,
  automation_id text not null references control_plane.automations (id),
  correlation_key text not null,
  error_code text not null,
  severity text not null,
  status text not null default 'OPEN',
  failure_count integer not null default 1,
  first_occurred_at timestamptz not null,
  last_occurred_at timestamptz not null,
  assignee text,
  recovery_note text,
  acknowledged_at timestamptz,
  resolved_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint incidents_severity
    check (severity in ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  constraint incidents_status
    check (status in ('OPEN', 'ACKNOWLEDGED', 'RESOLVED', 'CLOSED')),
  constraint incidents_failure_count check (failure_count > 0)
);

create unique index incidents_active_correlation_idx
  on control_plane.incidents (automation_id, correlation_key, error_code)
  where status in ('OPEN', 'ACKNOWLEDGED');

create index incidents_queue_idx
  on control_plane.incidents (status, severity, last_occurred_at desc);

create table control_plane.incident_history (
  id bigint generated always as identity primary key,
  incident_id uuid not null references control_plane.incidents (id),
  event_type text not null,
  actor_subject text not null,
  actor_display_name text not null,
  note text,
  created_at timestamptz not null default now(),
  constraint incident_history_event_type
    check (
      event_type in (
        'OPENED',
        'FAILURE_CORRELATED',
        'ACKNOWLEDGED',
        'ASSIGNED',
        'RECOVERY_RECORDED',
        'RESOLVED',
        'CLOSED'
      )
    )
);

create index incident_history_lookup_idx
  on control_plane.incident_history (incident_id, created_at);

create table control_plane.evidence_bundles (
  id uuid primary key,
  automation_id text not null references control_plane.automations (id),
  release_id uuid references control_plane.releases (id),
  incident_id uuid references control_plane.incidents (id),
  object_key text not null unique,
  sha256 text not null,
  expires_at timestamptz not null,
  created_by_subject text not null,
  created_by_display_name text not null,
  created_at timestamptz not null default now(),
  constraint evidence_bundles_sha256 check (sha256 ~ '^[a-f0-9]{64}$'),
  constraint evidence_bundles_scope
    check (release_id is not null or incident_id is not null)
);

create index evidence_bundles_automation_idx
  on control_plane.evidence_bundles (automation_id, created_at desc);
