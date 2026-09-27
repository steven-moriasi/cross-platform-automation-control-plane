import { describe, expect, it } from "vitest";

import { signSyntheticCallback } from "./callback-signature.js";
import { IdempotencyService } from "./idempotency.service.js";

describe("synthetic idempotency", () => {
  it("replays the prior result for the same request", () => {
    const idempotency = new IdempotencyService();
    const first = idempotency.execute(
      "claim",
      "stable-key-1",
      { claimId: "claim-1" },
      () => ({ status: "CREATED" }),
    );
    const replay = idempotency.execute(
      "claim",
      "stable-key-1",
      { claimId: "claim-1" },
      () => ({ status: "SHOULD_NOT_RUN" }),
    );
    expect(first.replayed).toBe(false);
    expect(replay).toEqual({
      replayed: true,
      value: { status: "CREATED" },
    });
  });

  it("rejects changed input under the same key", () => {
    const idempotency = new IdempotencyService();
    idempotency.execute("claim", "stable-key-1", { value: 1 }, () => 1);
    expect(() =>
      idempotency.execute("claim", "stable-key-1", { value: 2 }, () => 2),
    ).toThrow();
  });
});

describe("synthetic callbacks", () => {
  it("produces deterministic signatures for fixed input and time", () => {
    const callback = signSyntheticCallback(
      {
        operationId: "operation-1",
        resourceId: "claim-1",
        resourceType: "CLAIM",
        status: "READY_FOR_PROCESSING",
      },
      "local-synthetic-callback-secret-change-me",
      1_800_000_000,
    );
    expect(callback.signature).toMatch(/^[a-f0-9]{64}$/);
    expect(callback.timestamp).toBe(1_800_000_000);
  });
});
