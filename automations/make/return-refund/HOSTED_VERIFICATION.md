# Hosted Make verification

The blueprint, mappings, placeholders, routes, and error contracts are verified
locally. Scenario import and execution remain unverified until a Make account is
available.

1. Import `blueprint.json` into a new scenario.
2. Replace the two logical placeholders with a Make connection and secret.
3. Create the `SYNTHETIC_RETURN_REQUEST` custom webhook.
4. Run each fixture through the webhook in on-demand mode.
5. Confirm high-value returns respond with `APPROVAL_REQUIRED`.
6. Replay the approved fixture and confirm the original return is reused.
7. Inject `UNCERTAIN` for refund creation and confirm the GET reconciliation
   route resumes with the existing refund.
8. Enable incomplete executions, set the schedule, and retain sanitized evidence
   of one successful recovery.

Do not commit organization, team, scenario, webhook, connection, or user IDs.
