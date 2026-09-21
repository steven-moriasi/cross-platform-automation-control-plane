# Return and refund recovery

1. Pause the scenario route that produced the uncertain side effect.
2. Query the synthetic refund by idempotency key.
3. Resume at warehouse work creation or refund reconciliation as appropriate.
4. Emit one stable failure event for repeated provider retries.
5. Record the reconciled amount and terminal status in incident evidence.
