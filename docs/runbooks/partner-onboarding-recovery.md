# Partner onboarding recovery

1. Stop the polling trigger if the synthetic dependency is degraded.
2. Reconcile the partner application status before replaying an action.
3. Reuse the original idempotency key for an uncertain case creation.
4. Advance the polling cursor only after the application is durably handled.
5. Attach hosted evidence only when it comes from the account-backed Zap.
