import { describe, expect, it } from "vitest";

import { ControlPlaneTelemetry } from "./ControlPlaneTelemetry.node.js";

describe("ControlPlaneTelemetry", () => {
  it("declares metadata-only terminal event fields", () => {
    const node = new ControlPlaneTelemetry();
    expect(node.description.name).toBe("controlPlaneTelemetry");
    expect(
      node.description.properties.map((property) => property.name),
    ).toEqual([
      "controlPlaneUrl",
      "automationId",
      "releaseVersion",
      "environment",
      "executionId",
      "status",
      "durationMilliseconds",
      "errorCode",
      "correlationId",
    ]);
  });
});
