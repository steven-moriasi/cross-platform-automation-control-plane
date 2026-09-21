import { describe, expect, it } from "vitest";

import { deriveServiceState, isAutomationPlatform } from "./index.js";

describe("shared service contracts", () => {
  it("recognizes only governed automation platforms", () => {
    expect(isAutomationPlatform("n8n")).toBe(true);
    expect(isAutomationPlatform("custom-script")).toBe(false);
  });

  it("marks a service degraded when a dependency is unhealthy", () => {
    expect(
      deriveServiceState([
        { name: "postgres", state: "healthy" },
        { name: "object-storage", state: "degraded" },
      ]),
    ).toBe("degraded");
  });
});
