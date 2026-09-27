# Hosted Power Platform verification

Status: **UNVERIFIED**

Local validation proves source structure, connector and approval contracts,
secret safety, and Power Platform CLI pack/unpack behavior. It does not prove
tenant import, Dataverse role enforcement, application rendering, cloud-flow
execution, approvals, or connector authentication.

## Prerequisites

1. Use a non-production environment with Dataverse and the required Power
   Platform licences.
2. Deploy the synthetic operations API behind a public HTTPS endpoint.
3. Create a connection using the API key in the platform's secure connection
   store; do not place the key in deployment settings or solution source.
4. Copy the deployment settings template outside the repository and replace the
   example API URL and blank connection ID.

## Import and configure

1. Run `pnpm pack:solution`.
2. Import `dist/FieldInspectionAutomation.zip` with Power Platform CLI or a
   deployment pipeline.
3. Bind `ste_SyntheticOperations` to the target custom-connector connection.
4. Confirm `ste_SyntheticOperationsApiUrl` resolves to the target endpoint.
5. Materialize the three roles in `contracts/security-roles.json`, preserving
   the documented separation of duties.
6. Materialize the inspection submission and approval flow from
   `contracts/field-inspection-approval.json`.

The committed YAML project is a locally packable reference source tree. Export
the imported solution after hosted materialization and compare the generated
source before treating the package as a tenant-authored deployment artifact.

## Execute

1. Submit the remediation fixture and verify the inspection becomes `PENDING`.
2. Approve it with a different identity and verify the state becomes `APPROVED`.
3. Repeat the decision with the same operation ID and verify it is replay-safe.
4. Repeat with the rejection fixture on a new inspection.
5. Inject an uncertain submission response, reconcile with `GetFieldInspection`,
   and retry only when the record is absent.
6. Verify inspectors cannot approve, approvers cannot self-approve, and
   administrators cannot make business decisions.

## Evidence

Store only redacted screenshots, run-history exports, solution version,
timestamps, and correlation IDs in `hosted-evidence/`. Keep tenant identifiers,
environment identifiers, connection identifiers, credentials, and business
payloads out of Git.
