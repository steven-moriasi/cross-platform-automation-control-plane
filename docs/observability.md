# Observability

The local runtime exposes the same technical and portfolio signals that an
operator needs to detect ingestion, worker, release, incident, and evidence
problems. The configuration is source controlled and runs without a hosted
monitoring account.

## Signal flow

```text
control-plane API ─┬─ Prometheus metrics ── Prometheus ── Grafana
                   └─ OTLP/HTTP traces ──── Collector ─── Tempo ── Grafana

synthetic API ─────┬─ Prometheus metrics
                   └─ OTLP/HTTP traces

worker ────────────── OTLP/HTTP heartbeat traces
worker heartbeat ──── PostgreSQL ────────── API metrics
```

The OTLP emitter propagates valid W3C `traceparent` headers and exports
OTLP/HTTP JSON. It deliberately records method, route, status, request ID,
service name, version, and worker instance metadata only. Request bodies,
authorization headers, cookies, automation payloads, evidence documents, and
provider credentials are not trace attributes.

## Local endpoints

| Endpoint                        | Purpose                                  |
| ------------------------------- | ---------------------------------------- |
| `http://localhost:3001`         | Provisioned Grafana dashboard and traces |
| `http://localhost:9090`         | Prometheus targets, rules, and queries   |
| `http://localhost:3200/ready`   | Tempo readiness                          |
| `http://localhost:4000/metrics` | Control-plane and portfolio metrics      |
| `http://localhost:4100/metrics` | Synthetic API technical metrics          |

Grafana and Prometheus are bound to the loopback interface. Grafana permits
anonymous Viewer access in the disposable local environment and does not expose
an administrative login form.

## Portfolio metrics

The control-plane scrape refreshes database-derived gauges for:

- automation platform, risk tier, and checksum state;
- execution status by platform;
- incident status and severity;
- releases awaiting a decision;
- durable outbox backlog and dead letters;
- worker heartbeat presence and age;
- expired and soon-to-expire evidence records.

The API and synthetic service also expose process metrics, request counts, and
request latency histograms. Route templates are used as labels so resource IDs
do not create unbounded series.

## Alerts

The local rules detect:

- unavailable control-plane or synthetic APIs;
- a missing or stale worker heartbeat;
- sustained outbox backlog or any dead letter;
- active critical automation incidents;
- source checksum drift;
- expired evidence records;
- sustained control-plane p95 latency above one second.

These thresholds are reference defaults, not production service-level
objectives. A deployment must tune them using real traffic, capacity, and
support commitments.

## Inspecting traces

Open Grafana, select **Explore**, choose the Tempo data source, and search by
service name:

- `control-plane-api`;
- `control-plane-worker`;
- `synthetic-operations-api`.

Calling either API with a valid `traceparent` header continues that trace and
returns the server span context in the response. If the collector is
unavailable, trace export fails closed without changing the application
response.
