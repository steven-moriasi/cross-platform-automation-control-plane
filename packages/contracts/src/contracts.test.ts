import { describe, expect, it } from "vitest";

import {
  deriveServiceState,
  hasRequiredRole,
  isAutomationPlatform,
  type AuthenticatedPrincipal,
} from "./index.js";

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

describe("role authorization", () => {
  const operator: AuthenticatedPrincipal = {
    displayName: "Local Operator",
    roles: ["OPERATOR"],
    subject: "operator",
  };

  it("allows an explicitly assigned role", () => {
    expect(hasRequiredRole(operator, ["OPERATOR"])).toBe(true);
  });

  it("does not infer administrative permissions", () => {
    expect(hasRequiredRole(operator, ["PLATFORM_ADMIN"])).toBe(false);
  });
});
