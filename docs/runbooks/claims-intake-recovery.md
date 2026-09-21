# Claim intake recovery

1. Pause new synthetic webhook delivery.
2. Query the synthetic policy dependency before replaying uncertain calls.
3. Resume from the last durable workflow state.
4. Re-emit telemetry with the original event identifier when delivery was
   uncertain.
5. Record recovery evidence and close the incident only after reconciliation.
