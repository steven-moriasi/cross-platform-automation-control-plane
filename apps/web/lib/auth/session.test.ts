import { describe, expect, it } from "vitest";

import { randomBase64Url } from "./session";

describe("OIDC transaction values", () => {
  it("creates high-entropy URL-safe values", () => {
    const value = randomBase64Url();
    expect(value).toHaveLength(43);
    expect(value).toMatch(/^[A-Za-z0-9_-]+$/);
  });
});
