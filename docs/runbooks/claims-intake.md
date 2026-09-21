# Claim intake operations

## Purpose

Operate the synthetic n8n claim intake and triage workflow without storing claim
documents or customer data in the control plane.

## Checks

1. Confirm n8n and the synthetic operations API are ready.
2. Confirm the registered workflow checksum matches the reviewed release.
3. Inspect normalized execution events by correlation identifier.
4. Route high-risk synthetic cases to the human review state.

## Escalation

Open an incident after the declared alert threshold or after a checksum
mismatch. Do not retry a side effect without its idempotency key.
