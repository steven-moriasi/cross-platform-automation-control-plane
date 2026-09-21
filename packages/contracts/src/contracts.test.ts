import { describe, expect, it } from "vitest";

import {
  deriveServiceState,
  hasRequiredRole,
  isAutomationPlatform,
  parseAutomationManifest,
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

describe("automation manifests", () => {
  const manifest = {
    businessCapability: "Synthetic claim intake",
    credentialReferences: [
      {
        name: "SYNTHETIC_OPERATIONS_API",
        purpose: "Call the synthetic policy API",
      },
    ],
    dataClassification: "CONFIDENTIAL",
    dependencies: [
      { name: "synthetic-operations-api", required: true, type: "API" },
    ],
    displayName: "Claim intake",
    id: "claims-intake-n8n",
    manifestVersion: "1.0.0",
    nativeArtifactPath: "automations/n8n/claims-intake/workflow.json",
    owner: {
      email: "automation.owner@example.test",
      supportGroup: "Claims Automation",
    },
    platform: "n8n",
    recoveryPath: "docs/runbooks/claims-intake-recovery.md",
    riskTier: "HIGH",
    runbookPath: "docs/runbooks/claims-intake.md",
    schemaVersion: "1.0",
    sourceChecksum:
      "d2a1380cdcd3173a72f9b4175df89c1e43d7293955cc4f8144341074654829c9",
    targets: [{ environment: "demo", releaseStrategy: "PIPELINE" }],
    trigger: {
      alertAfterSeconds: 600,
      expectedSlaSeconds: 300,
      type: "WEBHOOK",
    },
  };

  it("accepts a versioned manifest containing only secret references", () => {
    expect(parseAutomationManifest(manifest).id).toBe("claims-intake-n8n");
  });

  it("rejects embedded secret fields", () => {
    expect(() =>
      parseAutomationManifest({
        ...manifest,
        clientSecret: "must-not-be-stored",
      }),
    ).toThrow("Embedded secret field");
  });

  it("rejects unsupported schema versions", () => {
    expect(() =>
      parseAutomationManifest({ ...manifest, schemaVersion: "2.0" }),
    ).toThrow();
  });
});
