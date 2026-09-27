import { describe, expect, it } from "vitest";

import { retryDelaySeconds } from "./outbox.repository.js";

describe("outbox retry delays", () => {
  it("uses bounded exponential backoff", () => {
    expect(
      [1, 2, 3, 4, 5, 10].map((attempt) => retryDelaySeconds(attempt)),
    ).toEqual([1, 2, 4, 8, 16, 60]);
  });
});
