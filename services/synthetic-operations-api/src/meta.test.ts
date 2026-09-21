import { describe, expect, it } from "vitest";

import { getSyntheticApiMetadata } from "./meta.js";

describe("synthetic API metadata", () => {
  it("makes the data boundary machine-readable", () => {
    expect(getSyntheticApiMetadata()).toMatchObject({
      classification: "synthetic-only",
      name: "synthetic-operations-api",
    });
  });
});
