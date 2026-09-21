# Implementation roadmap

The platform is delivered as meaningful, reviewable increments. Each phase ends
with executable verification and a Steven Ongati-authored commit on `main`.

## Repository structure

```text
apps/
  web/                         Next.js operations application
services/
  control-plane/               NestJS API and worker entrypoints
  synthetic-operations-api/    Safe business-system simulator
packages/
  contracts/                   Manifests, telemetry, releases, and errors
  observability/               Logging, metrics, and tracing conventions
automations/
  n8n/                         Workflow JSON and custom node package
  zapier/                      Platform CLI integration
  make/                        Scenario blueprint and fixtures
  power-platform/              Solution and custom connector source
deploy/
  local/                       Keycloak and synthetic initialization
  kubernetes/                  Hardened target manifests or Helm chart
infrastructure/
  terraform/                   Reviewable cloud target
ops/
  observability/               Collector, Prometheus, Grafana, alerts
docs/                          Architecture, contracts, runbooks, evidence
```

## Phase 1: executable monorepo foundation

- pin Node.js and package-manager versions;
- create TypeScript project references and shared lint/test configuration;
- create the web, API, worker, and synthetic API applications;
- add PostgreSQL migrations and local container builds;
- add health, readiness, and build checks.

Acceptance:

- clean install is reproducible;
- lint, strict typecheck, unit tests, and builds pass;
- every container runs as a non-root user.

## Phase 2: identity and one web application

- configure a synthetic Keycloak realm;
- add OIDC login and secure server-side browser sessions;
- validate API JWT issuer, audience, signature, expiry, and roles;
- implement server-side RBAC for all six roles;
- add the shared application shell and authorization tests.

Acceptance:

- unauthorized requests fail server-side;
- role-specific routes and actions are covered by tests;
- no browser token is stored in local storage.

## Phase 3: catalog and governance manifests

- define versioned JSON Schemas for automation manifests;
- implement catalog, ownership, dependency, SLA, risk, and data-classification
  records;
- reject embedded secret values and unsafe manifest fields;
- calculate native artifact checksums;
- add portfolio and automation detail screens.

Acceptance:

- the four reference manifests validate;
- duplicate IDs and incompatible schema versions fail deterministically;
- checksum changes are visible in the UI and audit trail.

## Phase 4: durable telemetry ingestion

- add signed machine identities and request verification;
- validate timestamps, event IDs, status transitions, and payload bounds;
- store accepted events and outbox intent atomically;
- implement idempotent replay responses;
- add worker leases, bounded retries, and dead-letter handling.

Acceptance:

- duplicate and reordered events cannot corrupt execution history;
- a worker crash is recoverable;
- telemetry excludes business payloads and credentials.

## Phase 5: releases, approvals, incidents, and evidence

- implement release proposals and independent approval policy;
- compare source commit, checksum, environment, and configuration declarations;
- correlate repeated failures into incidents;
- implement acknowledgement, assignment, recovery notes, and closure;
- generate authorized evidence bundles with retention metadata.

Acceptance:

- proposers cannot approve their own high-risk release;
- repeated failures deduplicate predictably;
- incident and approval history is append-only through the API.

## Phase 6: operator experience

- build dashboard, catalog, release, execution, incident, policy, and audit
  views;
- add accessible loading, empty, degraded, and error states;
- add filtering and pagination suitable for a real automation portfolio;
- surface evidence boundaries and hosted-verification status.

Acceptance:

- golden paths work through the browser;
- authorization is rechecked by the API;
- accessibility checks pass for critical pages.

## Phase 7: synthetic operations APIs

- implement policy/claim, partner, order/return, and field-inspection resources;
- enforce idempotency and deterministic failure injection;
- add signed callbacks and reconciliation endpoints;
- publish OpenAPI used by all four packages.

Acceptance:

- fixtures are synthetic and deterministic;
- uncertain side effects can be queried and reconciled;
- platform packages share one versioned API contract.

## Phase 8: n8n reference package

- create the claim intake and triage workflow;
- add the telemetry custom node;
- cover human wait, retry, timeout, duplicate trigger, and recovery paths;
- export sanitized JSON and package artifacts.

Acceptance:

- workflow imports and runs locally;
- end-to-end and failure-recovery tests pass;
- no n8n credential value appears in Git.

## Phase 9: Zapier reference package

- create the Node.js Platform CLI integration;
- implement partner trigger and verification/case/status actions;
- add pagination, deduplication, authentication, middleware, and error mapping;
- run official local integration tests.

Acceptance:

- Platform CLI tests pass on the supported Node.js runtime;
- all HTTP behavior is demonstrated against the synthetic API;
- hosted Zap deployment remains clearly marked until account-backed.

## Phase 10: Make reference package

- add the return and refund blueprint;
- define connection placeholders, routing, approvals, and error handlers;
- validate modules, mappings, fixtures, and telemetry calls;
- document hosted import and recovery proof.

Acceptance:

- blueprint and schema checks pass;
- no account-specific identifier or connection is committed;
- hosted execution remains clearly marked until account-backed.

## Phase 11: Power Platform reference package

- initialize the YAML solution source;
- create the synthetic operations custom connector;
- define environment variables, connection references, security roles, and
  approval contract;
- validate and pack the solution with Power Platform CLI.

Acceptance:

- OpenAPI and policy checks pass;
- pack/unpack is deterministic;
- Dataverse, app, and flow execution remain clearly marked until a licensed
  environment is used.

## Phase 12: operations and deployment

- instrument technical and portfolio metrics;
- add traces, dashboards, alerts, and recovery exercises;
- add backup/restore and migration verification;
- package local Compose and hardened Kubernetes target definitions;
- add CI, image release, dependency updates, and artifact checks.

Acceptance:

- full local startup has one documented command;
- recovery exercises produce inspectable evidence;
- infrastructure definitions validate without claiming live deployment.

## External prerequisites

The core system and n8n package require no commercial platform account. The
following hosted proof is optional and separate:

| Platform       | Needed for hosted proof                                    |
| -------------- | ---------------------------------------------------------- |
| Zapier         | Developer account and deploy key                           |
| Make           | Account with scenario import and execution access          |
| Power Platform | Developer environment, Dataverse, and solution permissions |

Missing hosted access does not justify fake screenshots or claims. The
repository remains complete as a locally verifiable reference implementation,
with each vendor boundary documented.
