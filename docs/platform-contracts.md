# Platform source-control contracts

The repository uses each vendor's documented artifact model instead of inventing one universal
workflow format. This document defines what can be reviewed and verified in Git and what still
requires a vendor-hosted account.

## n8n

### Repository contract

- exported workflow JSON for readable review;
- optional n8n package archive for promotion exercises;
- TypeScript source for custom nodes;
- credential names and types without credential values;
- sanitized execution fixtures;
- import, execution, retry, and replay tests against the pinned local n8n image.

n8n documents that workflows can be exported as JSON. Its package API and CLI can also export
workflows, folder structure, credential references, schemas, variables, and tags, while excluding
credential secrets and execution history.

### Evidence boundary

The local Compose environment is sufficient for end-to-end workflow proof. Promotion to a separately
managed n8n instance requires that instance's URL, API key, projects, credentials, and policy.

Official references:

- <https://docs.n8n.io/workflows/export-import/>
- <https://docs.n8n.io/build/manage-workflows/n8n-packages/>
- <https://docs.n8n.io/integrations/creating-nodes/overview/>

## Zapier

### Repository contract

- a Zapier Platform CLI integration implemented in Node.js;
- authentication, triggers, actions, searches, middleware, and hydrators where justified;
- Jest tests using the official app tester;
- synthetic API fixtures;
- a sample Zap recipe and hosted verification checklist;
- no `.zapierrc`, deploy key, connected-account token, or private app identifier.

Zapier documents Platform CLI as its code-first integration model for local development, version
control, testing, CI, and version deployment. The integration source is portable; a user's Zaps,
connections, and task history are not represented as portable Git source by the CLI project.

### Evidence boundary

Local tests prove integration request and response behavior. Creating a Zap, connecting accounts,
deploying an integration version, inviting testers, and publishing require a Zapier account and
deploy key.

Official references:

- <https://docs.zapier.com/platform/quickstart/cli-tutorial>
- <https://docs.zapier.com/platform/build-cli/overview>
- <https://docs.zapier.com/platform/quickstart/build-integration>

## Make

### Repository contract

- exported scenario blueprint JSON;
- a JSON Schema for required scenario metadata and allowed connection placeholders;
- synthetic webhook and API fixtures;
- mapping and error-route contract tests;
- import, connection, scheduling, and recovery instructions;
- no organization, team, connection, webhook secret, or user identifiers.

Make documents blueprint export and import as JSON. An imported scenario still requires the target
user to configure account connections and other environment-specific resources.

### Evidence boundary

Git and CI can prove that the blueprint is valid JSON, contains the expected modules and error
routes, references only declared placeholders, and matches tested synthetic API contracts. Only a
Make account can prove successful import and execution in Make's hosted runtime.

Official references:

- <https://help.make.com/blueprints>
- <https://help.make.com/scenario-sharing>

## Microsoft Power Platform

### Repository contract

- a Power Platform solution project in the current YAML source-control format;
- custom connector OpenAPI and API-properties files;
- environment variable and connection reference declarations;
- deployment settings templates without environment IDs or secrets;
- solution pack/unpack and static policy checks;
- hosted verification scripts and evidence placeholders.

Microsoft documents `pac solution` commands for initializing, cloning, syncing, packing, unpacking,
exporting, and importing Dataverse solutions. Microsoft also documents YAML as the preferred
source-control format for new projects because it supports focused Git diffs, multiple solutions,
canvas apps, and modern flows.

### Evidence boundary

Local checks can validate OpenAPI, source structure, policies, and deterministic solution packaging.
A licensed Power Platform environment with Dataverse permissions is required to create or import
the managed components and to prove cloud flow, canvas app, approvals, and connection behavior.

Official references:

- <https://learn.microsoft.com/power-platform/developer/cli/reference/solution>
- <https://learn.microsoft.com/power-platform/alm/use-source-control-solution-files>
- <https://learn.microsoft.com/power-platform/developer/cli/reference/connector>
- <https://learn.microsoft.com/connectors/custom-connectors/customconnectorssolutions>

## Shared security rules

Every platform package must satisfy these rules:

1. Commit only logical connection and secret references.
2. Reject fixture fields that resemble tokens, passwords, private keys, or live customer records.
3. Use synthetic tenant, person, order, policy, claim, and partner identifiers.
4. Emit telemetry metadata rather than business payloads.
5. Give every side-effecting operation an idempotency key where the destination supports one.
6. Treat retries as at-least-once and reconcile uncertain outcomes.
7. Record human approval separately from workflow execution identity.
8. Keep hosted verification evidence distinct from local static evidence.
