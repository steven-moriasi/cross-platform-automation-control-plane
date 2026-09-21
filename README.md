# Cross-Platform Automation Control Plane

An open reference implementation for governing automations built with n8n,
Zapier, Make, and Microsoft Power Platform from one authenticated operations
application.

The platform makes automation ownership, releases, execution evidence,
incidents, approvals, and operational risk visible without pretending that four
different vendors expose the same management capabilities. Each platform package
keeps its native, reviewable source artifact in Git and emits a shared telemetry
contract to the control plane.

## What this repository demonstrates

- a single RBAC-protected web application for automation inventory and
  operations;
- versioned automation manifests with owners, risk, data classification, SLA,
  and dependencies;
- normalized execution telemetry without storing provider credentials or
  business payloads;
- release evidence, checksum-based drift detection, approval gates, and audit
  history;
- incident deduplication, acknowledgement, assignment, recovery notes, and
  closure;
- a self-hosted n8n workflow and custom node package;
- a tested Zapier Platform CLI integration;
- an importable Make scenario blueprint;
- a Power Platform custom connector and source-controlled solution package;
- synthetic APIs and fixtures that keep demonstrations safe and reproducible;
- local containers, automated checks, observability, and deployment guidance.

## Platform evidence boundary

The local environment runs the control plane, synthetic dependencies, and n8n.
Zapier, Make, and Power Platform remain vendor-hosted services. Their source
artifacts, tests, manifests, fixtures, and packaging live here, while deployment
to those services requires the user's own account, license, connections, and
credentials.

No sample credential, customer record, insurer process, or production execution
is included.

## Local runtime

Requirements:

- Docker with Compose v2;
- Node.js 22.20.0 and pnpm 12.4.1 for checks outside containers.

Start the current application stack:

```bash
cp .env.example .env
pnpm app:start
```

The command builds immutable application images, waits for PostgreSQL, verifies
and applies checksum-protected migrations, imports the local Keycloak realm,
then starts the API, worker, synthetic operations API, and authenticated web
application.

| Endpoint                             | Purpose                                      |
| ------------------------------------ | -------------------------------------------- |
| `http://localhost:3000`              | Operations web                               |
| `http://localhost:4000/health/ready` | Control-plane readiness                      |
| `http://localhost:4100/api/v1/meta`  | Synthetic API capabilities and data boundary |
| `http://localhost:8089`              | Local Keycloak identity provider             |

The imported realm contains synthetic users for each role. Use the username
`admin` and password `admin-local-only` for full local access; the other
usernames are `owner`, `approver`, `operator`, `auditor`, and `viewer`, each
with the password pattern `<username>-local-only`. These credentials are only
for the disposable local environment.

The web application uses authorization code flow with PKCE, state, and nonce
validation. It stores tokens in an encrypted, HTTP-only session cookie and
validates the access token again through the control-plane API before rendering
the operations shell. UI visibility is role-aware, but the API remains the
authorization boundary.

Set `WEB_PORT` in `.env` when port 3000 is already allocated. Stop the stack
with `pnpm app:stop`; add `--volumes` to the underlying Compose command only
when intentionally deleting local PostgreSQL state.

## Architecture

See [Architecture](docs/architecture.md) for what the system builds, why the
boundaries exist, and how each platform is represented truthfully.
