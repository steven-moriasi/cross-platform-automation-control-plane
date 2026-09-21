import type { AuthenticatedPrincipal } from "@automation-control-plane/contracts";
import { describe, expect, it } from "vitest";

import { canApproveReleases, navigationForPrincipal } from "./authorization";

function principal(
  roles: AuthenticatedPrincipal["roles"],
): AuthenticatedPrincipal {
  return {
    displayName: "Synthetic User",
    roles,
    subject: "synthetic-user",
  };
}

describe("operations shell authorization", () => {
  it("shows administrative navigation and actions to platform administrators", () => {
    const administrator = principal(["PLATFORM_ADMIN"]);
    expect(navigationForPrincipal(administrator)).toContain("Audit");
    expect(canApproveReleases(administrator)).toBe(true);
  });

  it("keeps approval controls and restricted navigation from viewers", () => {
    const viewer = principal(["VIEWER"]);
    expect(navigationForPrincipal(viewer)).not.toContain("Audit");
    expect(navigationForPrincipal(viewer)).toContain("Incidents");
    expect(canApproveReleases(viewer)).toBe(false);
  });
});
