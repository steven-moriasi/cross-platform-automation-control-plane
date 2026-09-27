"use strict";

const idempotencyHeaders = (requestId) => ({
  "content-type": "application/json",
  "x-idempotency-key": `zapier:${requestId}`,
});

const unwrapIdempotentResult = (response) => ({
  ...response.data.value,
  replayed: response.data.replayed,
});

module.exports = { idempotencyHeaders, unwrapIdempotentResult };
