import { describe, expect, it } from "vitest";

import {
  isIncidentActionAllowed,
  requiresIndependentApproval,
} from "./operations-policy.js";

describe("release approval policy", () => {
  it("requires another principal for high-risk approvals", () => {
    expect(requiresIndependentApproval("HIGH", "owner-1", "owner-1")).toBe(
      true,
    );
    expect(requiresIndependentApproval("HIGH", "owner-1", "approver-1")).toBe(
      false,
    );
    expect(requiresIndependentApproval("LOW", "owner-1", "owner-1")).toBe(
      false,
    );
  });
});

describe("incident transition policy", () => {
  it("allows only governed state transitions", () => {
    expect(isIncidentActionAllowed("OPEN", "ACKNOWLEDGE")).toBe(true);
    expect(isIncidentActionAllowed("ACKNOWLEDGED", "ACKNOWLEDGE")).toBe(false);
    expect(isIncidentActionAllowed("ACKNOWLEDGED", "RESOLVE")).toBe(true);
    expect(isIncidentActionAllowed("RESOLVED", "CLOSE")).toBe(true);
    expect(isIncidentActionAllowed("CLOSED", "ASSIGN")).toBe(false);
  });
});
