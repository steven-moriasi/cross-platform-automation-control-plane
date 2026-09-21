import { describe, expect, it } from "vitest";

import { readEnvironment } from "./environment.js";

describe("control-plane environment", () => {
  it("uses safe local defaults", () => {
    const environment = readEnvironment({});

    expect(environment.port).toBe(4000);
    expect(environment.maxRequestBodyBytes).toBe(262_144);
    expect(environment.databaseUrl).toContain("automation_control_plane");
  });

  it("rejects invalid network configuration", () => {
    expect(() => readEnvironment({ PORT: "70000" })).toThrow();
    expect(() => readEnvironment({ WEB_ORIGIN: "not-a-url" })).toThrow();
  });
});
