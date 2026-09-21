# Cross-Platform Automation Control Plane

An open reference implementation for governing automations built with n8n, Zapier, Make, and
Microsoft Power Platform from one authenticated operations application.

The platform makes automation ownership, releases, execution evidence, incidents, approvals, and
operational risk visible without pretending that four different vendors expose the same management
capabilities. Each platform package keeps its native, reviewable source artifact in Git and emits a
shared telemetry contract to the control plane.

## What this repository demonstrates

- a single RBAC-protected web application for automation inventory and operations;
- versioned automation manifests with owners, risk, data classification, SLA, and dependencies;
- normalized execution telemetry without storing provider credentials or business payloads;
- release evidence, checksum-based drift detection, approval gates, and audit history;
- incident deduplication, acknowledgement, assignment, recovery notes, and closure;
- a self-hosted n8n workflow and custom node package;
- a tested Zapier Platform CLI integration;
- an importable Make scenario blueprint;
- a Power Platform custom connector and source-controlled solution package;
- synthetic APIs and fixtures that keep demonstrations safe and reproducible;
- local containers, automated checks, observability, and deployment guidance.

## Platform evidence boundary

The local environment runs the control plane, synthetic dependencies, and n8n. Zapier, Make, and
Power Platform remain vendor-hosted services. Their source artifacts, tests, manifests, fixtures,
and packaging live here, while deployment to those services requires the user's own account,
license, connections, and credentials.

No sample credential, customer record, insurer process, or production execution is included.

## Architecture

See [Architecture](docs/architecture.md) for what the system builds, why the boundaries exist, and
how each platform is represented truthfully.
