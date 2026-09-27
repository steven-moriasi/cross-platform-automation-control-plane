import type { CatalogAutomation } from "@automation-control-plane/contracts";
import { describe, expect, it } from "vitest";

import {
  countHighRisk,
  countMatchingChecksums,
  formatPlatform,
} from "./portfolio";

const automation = {
  businessCapability: "Synthetic example",
  checksumStatus: "MATCH",
  credentialReferences: [],
  dataClassification: "INTERNAL",
  dependencies: [],
  displayName: "Example",
  id: "example-n8n",
  manifestVersion: "1.0.0",
  nativeArtifactPath: "automations/n8n/example.json",
  observedSourceChecksum: "1".repeat(64),
  owner: {
    email: "owner@example.test",
    supportGroup: "Automation",
  },
  platform: "n8n",
  recoveryPath: "docs/recovery.md",
  riskTier: "HIGH",
  runbookPath: "docs/runbook.md",
  schemaVersion: "1.0",
  sourceChecksum: "1".repeat(64),
  synchronizedAt: "2026-09-27T18:00:00.000Z",
  targets: [{ environment: "demo", releaseStrategy: "PIPELINE" }],
  trigger: {
    alertAfterSeconds: 120,
    expectedSlaSeconds: 60,
    type: "WEBHOOK",
  },
} satisfies CatalogAutomation;

describe("automation portfolio summaries", () => {
  it("counts matching checksum evidence", () => {
    expect(countMatchingChecksums([automation])).toBe(1);
  });

  it("counts high and critical risk automations", () => {
    expect(countHighRisk([automation])).toBe(1);
  });

  it("formats vendor names without changing platform identifiers", () => {
    expect(formatPlatform("power-platform")).toBe("Power Platform");
  });
});
