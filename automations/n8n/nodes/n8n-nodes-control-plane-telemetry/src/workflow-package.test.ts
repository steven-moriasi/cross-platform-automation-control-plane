import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

interface WorkflowNode {
  readonly credentials?: unknown;
  readonly id: string;
  readonly name: string;
  readonly retryOnFail?: boolean;
  readonly type: string;
}

interface WorkflowDocument {
  readonly connections: Readonly<Record<string, unknown>>;
  readonly id: string;
  readonly nodes: readonly WorkflowNode[];
  readonly settings: {
    readonly errorWorkflow?: string;
  };
}

interface ManifestDocument {
  readonly nativeArtifactPath: string;
  readonly sourceChecksum: string;
}

const workflowUrl = new URL(
  "../../../claims-intake/workflow.json",
  import.meta.url,
);
const errorWorkflowUrl = new URL(
  "../../../claims-intake/error-workflow.json",
  import.meta.url,
);
const manifestUrl = new URL(
  "../../../../manifests/claims-intake-n8n.json",
  import.meta.url,
);

async function readJson<Output>(url: URL): Promise<Output> {
  return JSON.parse(await readFile(url, "utf8")) as Output;
}

describe("n8n claim intake package", () => {
  it("contains the governed workflow and recovery controls", async () => {
    const workflow = await readJson<WorkflowDocument>(workflowUrl);
    const names = workflow.nodes.map((node) => node.name);
    const types = workflow.nodes.map((node) => node.type);

    expect(workflow.id).toBe("claims-intake-n8n");
    expect(new Set(workflow.nodes.map((node) => node.id)).size).toBe(
      workflow.nodes.length,
    );
    expect(names).toContain("Needs reconciliation");
    expect(names).toContain("Create claim for reconciliation");
    expect(types).toContain("n8n-nodes-base.wait");
    expect(types).toContain("CUSTOM.controlPlaneTelemetry");
    expect(
      workflow.nodes.find((node) => node.name === "Create claim")?.retryOnFail,
    ).toBe(true);
    expect(workflow.settings.errorWorkflow).toBe("claims-intake-error");
    expect(workflow.nodes.every((node) => node.credentials === undefined)).toBe(
      true,
    );
  });

  it("contains a credential-free failure telemetry workflow", async () => {
    const workflow = await readJson<WorkflowDocument>(errorWorkflowUrl);

    expect(workflow.id).toBe("claims-intake-error");
    expect(workflow.nodes.map((node) => node.type)).toEqual([
      "n8n-nodes-base.errorTrigger",
      "CUSTOM.controlPlaneTelemetry",
    ]);
    expect(workflow.nodes.every((node) => node.credentials === undefined)).toBe(
      true,
    );
  });

  it("keeps the governance manifest checksum current", async () => {
    const manifest = await readJson<ManifestDocument>(manifestUrl);
    const source = await readFile(workflowUrl);

    expect(manifest.nativeArtifactPath).toBe(
      "automations/n8n/claims-intake/workflow.json",
    );
    expect(createHash("sha256").update(source).digest("hex")).toBe(
      manifest.sourceChecksum,
    );
  });
});
