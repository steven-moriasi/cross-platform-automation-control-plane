create table control_plane.service_heartbeats (
  service_name text not null,
  instance_id text not null,
  recorded_at timestamptz not null,
  primary key (service_name, instance_id),
  constraint service_heartbeats_service_name_length
    check (char_length(service_name) between 1 and 100),
  constraint service_heartbeats_instance_id_length
    check (char_length(instance_id) between 1 and 200)
);

create index service_heartbeats_recorded_at_idx
  on control_plane.service_heartbeats (recorded_at);
