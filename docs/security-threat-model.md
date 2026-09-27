# Security threat model

## Scope and security objective

The control plane stores governance metadata, normalized execution state,
release decisions, incidents, and metadata-only evidence for synthetic
automations. Its security objective is to prevent an unauthorized principal,
automation package, or compromised dependency from changing governance state,
approving its own release, injecting false telemetry, retrieving evidence, or
turning observability into a payload-exfiltration channel.

This model covers the repository and local reference runtime. It is not a
penetration-test report, regulatory certification, or proof of a hosted vendor's
controls.

## Assets

- OIDC sessions and role claims;
- telemetry signing material and client identity;
- automation manifests and reviewed artifact checksums;
- release, approval, incident, and audit history;
- evidence documents and their integrity hashes;
- PostgreSQL availability and recoverability;
- provider credentials held outside this repository;
- observability signals that could reveal operational metadata.

Customer records, uploaded documents, payment data, and provider access tokens
are deliberately outside the control-plane data model.

## Trust boundaries

1. **Browser to web application** — untrusted input crosses an authenticated
   session and CSRF boundary.
2. **Web application to control-plane API** — bearer tokens cross the service
   boundary and are revalidated by issuer, audience, signature, expiry, and
   role.
3. **Platform package to telemetry API** — metadata-only events cross a machine
   identity, HMAC signature, timestamp-skew, schema, and replay boundary.
4. **API and worker to PostgreSQL** — parameterized queries cross the durable
   state boundary.
5. **Services to observability stack** — bounded labels and trace attributes
   cross a monitoring boundary that must not receive payloads or secrets.
6. **Repository to hosted vendors** — source artifacts cross account, license,
   connection, and deployment boundaries that are not simulated locally.

## Threats and controls

| Threat                                             | Primary controls                                                                                                 | Residual risk                                                                              |
| -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Token forgery or confused audience                 | OIDC signature, issuer, audience, expiry, and role validation in the API                                         | Identity-provider compromise remains external                                              |
| UI-only authorization bypass                       | Server-side RBAC on every protected API operation                                                                | A newly added endpoint could omit policy metadata and requires review                      |
| Self-approval of a high-risk release               | Independent-approver policy enforced against the proposer subject                                                | Compromised distinct accounts can collude                                                  |
| Telemetry spoofing or replay                       | Scoped client ID, HMAC-SHA256 signature, timestamp skew, strict schema, stable event ID                          | Theft of the signing secret permits forged metadata until rotation                         |
| Duplicate or reordered events                      | Unique event IDs, conditional aggregate updates, source timestamps, release versions                             | Provider clocks and missing terminal events still require reconciliation                   |
| Payload or secret leakage                          | Metadata-only contracts, strict schemas, logical secret references, secret-safety scan, bounded trace attributes | Application logs added later require the same review                                       |
| SQL injection                                      | Parameterized PostgreSQL access and constrained identifiers                                                      | Database credentials still grant their configured database privileges                      |
| Worker duplication or crash                        | Leases, `skip locked`, bounded retries, idempotent incident correlation, dead letters                            | An uncertain external side effect must be queried before replay                            |
| Evidence tampering                                 | SHA-256 hash, append-only application workflow, authenticated download, explicit expiry                          | Local database administrators remain trusted                                               |
| Artifact drift                                     | Manifest and release checksums compared with reviewed source                                                     | Vendor-hosted drift is detectable only where the vendor exposes an artifact                |
| Dependency or image compromise                     | Frozen lockfile, pinned direct dependencies, digest-pinned runtime images, audits and scans in CI                | Upstream compromise before publication remains possible                                    |
| Denial of service or metric cardinality exhaustion | Request limits, route-template labels, bounded metadata fields, resource limits in deployment targets            | Local Compose is not an internet-facing rate-limiting tier                                 |
| Backup disclosure                                  | Local evidence directory ignored; production target requires encrypted managed backups and restricted identities | The local drill dump is plaintext synthetic data and must be deleted when no longer needed |

## Verification

```bash
scripts/security/check-secret-safety.sh
pnpm manifests:validate
pnpm test
scripts/operations/verify-migrations.sh
scripts/operations/postgres-restore-drill.sh
scripts/operations/outbox-recovery-drill.sh
```

The deployment definitions add non-root execution, read-only filesystems where
compatible, resource budgets, health probes, disruption budgets, autoscaling,
and network policy. Those definitions are reviewable targets, not evidence that
a production cluster or secret manager was provisioned.

## Production requirements

- replace every local-only credential and rotate through a managed secret
  service;
- terminate TLS at an authenticated ingress and restrict internal service
  identities;
- encrypt managed databases, object storage, and backups with audited keys;
- send audit and security events to an independently administered sink;
- define provider-specific credential rotation and revocation procedures;
- perform threat-model review, dependency scanning, dynamic testing, backup
  restoration, and least-privilege validation before each production release.
