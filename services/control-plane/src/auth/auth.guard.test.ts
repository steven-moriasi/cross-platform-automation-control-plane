import { describe, expect, it } from "vitest";

import { readBearerToken } from "./auth.guard.js";

describe("bearer token parsing", () => {
  it("accepts one canonical bearer token", () => {
    expect(readBearerToken("Bearer header.payload.signature")).toBe(
      "header.payload.signature",
    );
  });

  it.each([
    undefined,
    ["Bearer token"],
    "Basic token",
    "bearer token",
    "Bearer one two",
  ])("rejects an ambiguous authorization header", (header) => {
    expect(readBearerToken(header)).toBeUndefined();
  });
});
