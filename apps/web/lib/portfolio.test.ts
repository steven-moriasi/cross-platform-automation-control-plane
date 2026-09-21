import { describe, expect, it } from "vitest";

import {
  automationPortfolio,
  countHealthy,
  countHostedPending,
  formatPlatform,
} from "./portfolio";

describe("automation portfolio summaries", () => {
  it("counts healthy automations", () => {
    expect(countHealthy(automationPortfolio)).toBe(3);
  });

  it("keeps hosted evidence separate from local verification", () => {
    expect(countHostedPending(automationPortfolio)).toBe(3);
  });

  it("formats vendor names without changing platform identifiers", () => {
    expect(formatPlatform("power-platform")).toBe("Power Platform");
  });
});
