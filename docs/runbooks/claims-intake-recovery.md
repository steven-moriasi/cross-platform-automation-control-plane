# Claim intake recovery

1. Pause new synthetic webhook delivery.
2. Locate the execution by `correlation_id` in the control plane.
3. For an uncertain claim creation, query `GET /api/v1/claims/:claimId` before
   retrying the mutation.
4. If the claim exists, resume with the reconciled resource. If it does not,
   replay the original request with the same `x-idempotency-key`.
5. Re-emit telemetry with the original event identifier when telemetry delivery
   was uncertain; duplicate event identifiers are replay-safe.
6. Confirm the execution aggregate and incident state before resuming webhook
   delivery.
7. Record recovery evidence and close the incident only after reconciliation.
