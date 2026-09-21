import { describe, expect, it } from "vitest";

import { resolveRequestId } from "./request-id.js";

describe("request identifiers", () => {
  it("preserves a bounded caller identifier", () => {
    expect(resolveRequestId("trace-01HX9ABC")).toBe("trace-01HX9ABC");
  });

  it("replaces unsafe identifiers", () => {
    const generated = resolveRequestId("contains spaces");

    expect(generated).toMatch(/^[0-9a-f-]{36}$/);
  });
});
