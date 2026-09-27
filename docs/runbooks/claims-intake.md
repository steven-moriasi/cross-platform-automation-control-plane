# Claim intake operations

## Purpose

Operate the synthetic n8n claim intake and triage workflow without storing claim
documents or customer data in the control plane.

## Checks

1. Confirm `http://localhost:5678/healthz` and
   `http://localhost:4100/api/v1/meta` are ready.
2. Confirm the registered workflow checksum matches the reviewed release.
3. Inspect normalized execution events by correlation identifier.
4. Route high-risk synthetic cases to the human review state.

## Synthetic verification

Submit a standard claim:

```bash
curl --fail-with-body \
  --request POST http://localhost:5678/webhook/synthetic-claims \
  --header 'content-type: application/json' \
  --data '{
    "claimId": "claim-runbook-001",
    "correlationId": "runbook-standard-001",
    "documentReferences": ["document-runbook-001"],
    "policyId": "policy-active-001",
    "reportedAmount": 25000
  }'
```

The response includes `claimReplay: false`, the synthetic claim result, and the
control-plane telemetry receipt. Submit the same `claimId` again to verify
`claimReplay: true` and an unchanged `createdAt`.

Use more than two document references or an amount above `250000` to exercise
the human-review wait. Add `"failureMode": "UNCERTAIN"` to exercise post-side
effect reconciliation. Use `TRANSIENT` or `TIMEOUT` to verify bounded retries
and failure telemetry without creating a claim.

## Escalation

Open an incident after the declared alert threshold or after a checksum
mismatch. Do not retry a side effect without its idempotency key.
