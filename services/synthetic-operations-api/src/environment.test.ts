import { describe, expect, it } from "vitest";

import { readEnvironment } from "./environment.js";

describe("synthetic operations environment", () => {
  it("uses a port separate from the control plane", () => {
    expect(readEnvironment({}).port).toBe(4100);
  });

  it("rejects unbounded request sizes", () => {
    expect(() =>
      readEnvironment({ MAX_REQUEST_BODY_BYTES: "10485760" }),
    ).toThrow();
  });
});
