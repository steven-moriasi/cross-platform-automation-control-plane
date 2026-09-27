# Hosted Zapier verification

Local tests validate the integration contract without a Zapier account. Hosted
evidence remains unverified until the following account-backed steps are
completed:

1. Create a private integration from this source with Zapier Platform CLI.
2. Configure a synthetic API connection without committing credentials.
3. Deploy the integration version and invite a test user.
4. Create the sample Zap in `sample-zap.json`.
5. Verify trigger pagination and deduplication across two polling runs.
6. Replay each action with the same request ID and confirm one side effect.
7. Inject a transient dependency failure and retain the retry evidence.
8. Reconcile an uncertain case creation before replaying it.
9. Store screenshots and execution references outside this repository until they
   are sanitized.

Publishing to Zapier's public app directory is not part of the local evidence.
