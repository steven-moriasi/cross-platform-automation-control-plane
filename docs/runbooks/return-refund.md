# Return and refund operations

## Purpose

Operate the Make return and refund scenario against deterministic synthetic
commerce resources.

## Checks

1. Confirm return eligibility and order state.
2. Confirm approval is present for returns above the configured threshold.
3. Reconcile refund status before issuing another request.
4. Keep local blueprint validation separate from hosted scenario evidence.
