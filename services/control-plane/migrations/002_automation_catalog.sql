create table control_plane.automations (
  id text primary key,
  schema_version text not null,
  manifest_version text not null,
  display_name text not null,
  platform text not null,
  native_artifact_path text not null,
  declared_source_checksum text not null,
  observed_source_checksum text not null,
  manifest_checksum text not null,
  checksum_status text not null,
  owner_email text not null,
  support_group text not null,
  business_capability text not null,
  risk_tier text not null,
  data_classification text not null,
  trigger_type text not null,
  expected_sla_seconds integer not null,
  alert_after_seconds integer not null,
  dependencies jsonb not null,
  targets jsonb not null,
  runbook_path text not null,
  recovery_path text not null,
  credential_references jsonb not null,
  manifest_document jsonb not null,
  created_at timestamptz not null default now(),
  synchronized_at timestamptz not null default now(),
  constraint automations_platform
    check (platform in ('n8n', 'zapier', 'make', 'power-platform')),
  constraint automations_risk_tier
    check (risk_tier in ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  constraint automations_data_classification
    check (
      data_classification in (
        'PUBLIC',
        'INTERNAL',
        'CONFIDENTIAL',
        'RESTRICTED'
      )
    ),
  constraint automations_checksum_status
    check (checksum_status in ('MATCH', 'MISMATCH')),
  constraint automations_source_checksums
    check (
      declared_source_checksum ~ '^[a-f0-9]{64}$'
      and observed_source_checksum ~ '^[a-f0-9]{64}$'
      and manifest_checksum ~ '^[a-f0-9]{64}$'
    ),
  constraint automations_sla_positive check (expected_sla_seconds > 0),
  constraint automations_alert_threshold
    check (alert_after_seconds >= expected_sla_seconds)
);

create index automations_platform_idx
  on control_plane.automations (platform);

create index automations_owner_email_idx
  on control_plane.automations (owner_email);

create table control_plane.automation_catalog_audit (
  id bigint generated always as identity primary key,
  automation_id text not null references control_plane.automations (id),
  event_type text not null,
  previous_source_checksum text,
  current_source_checksum text not null,
  manifest_checksum text not null,
  recorded_at timestamptz not null default now(),
  constraint automation_catalog_audit_event_type
    check (event_type in ('REGISTERED', 'SOURCE_CHECKSUM_CHANGED')),
  constraint automation_catalog_audit_checksums
    check (
      (
        previous_source_checksum is null
        or previous_source_checksum ~ '^[a-f0-9]{64}$'
      )
      and current_source_checksum ~ '^[a-f0-9]{64}$'
      and manifest_checksum ~ '^[a-f0-9]{64}$'
    )
);

create index automation_catalog_audit_lookup_idx
  on control_plane.automation_catalog_audit (
    automation_id,
    recorded_at desc
  );
