# Synthetic operations API

The synthetic operations API gives every platform package the same versioned,
locally reproducible HTTP contract. It models only the operational state needed
to prove orchestration behavior. It does not contain customer, policyholder,
payment, credential, or production provider data.

## Resources

| Workflow package          | Synthetic resources                                             |
| ------------------------- | --------------------------------------------------------------- |
| n8n claim intake          | policies, claims, claim reconciliation, signed callbacks        |
| Zapier partner onboarding | paginated applications, verification, cases, status changes     |
| Make returns              | orders, returns, warehouse work, refunds, refund reconciliation |
| Power Platform field work | field inspections, human decisions, signed callbacks            |

The canonical OpenAPI 3.1 document is served at
`http://localhost:4100/api/v1/openapi.json`. Request and response types that
need to be shared in repository code live in the contracts package.

## Stable fixtures

The local API includes these useful starting fixtures:

- active policy `policy-active-001`;
- lapsed policy `policy-lapsed-001`;
- delivered order `order-delivered-001` with a KES 72,500 paid amount;
- high-value order `order-high-value-001` with a KES 280,000 paid amount;
- partner applications `partner-application-001` through
  `partner-application-003`.

Synthetic identifiers are intentionally obvious. New mutations exist only in
memory and reset when the container restarts.

## Idempotency and uncertain outcomes

Every mutation requires `x-idempotency-key`. Reusing a key with the same input
returns the original result with `replayed: true`. Reusing it with changed input
returns `409`.

Tests can set `x-synthetic-failure` to:

- `TRANSIENT` for a `503` before a side effect;
- `TIMEOUT` for a `504` before a side effect;
- `UNCERTAIN` for a `504` after the side effect.

After `UNCERTAIN`, callers must query the resource or signed callback before
retrying. This makes reconciliation behavior observable without relying on
random failures or artificial delays.

## Signed callbacks

Successful claim, partner-case, refund, and field-inspection mutations record a
callback payload under their idempotency key. Retrieve it from
`GET /api/v1/callbacks/{operationId}`.

The response signature is HMAC-SHA256 over:

```text
<timestamp>.<JSON payload>
```

The local signing secret comes from `SYNTHETIC_CALLBACK_SECRET`. The default is
safe only for the disposable local environment. Platform packages verify the
signature before accepting callback state.
