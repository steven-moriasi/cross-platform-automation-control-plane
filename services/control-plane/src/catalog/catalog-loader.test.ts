import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { loadCatalog } from "./catalog-loader.js";

const repositories: string[] = [];

async function createRepository(
  schemaVersion = "1.0",
  sourceChecksum?: string,
): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "automation-catalog-"));
  repositories.push(root);
  await mkdir(join(root, "automations/manifests"), { recursive: true });
  await mkdir(join(root, "automations/n8n/example"), { recursive: true });
  await mkdir(join(root, "docs/runbooks"), { recursive: true });
  const artifact = '{"name":"example"}\n';
  await writeFile(
    join(root, "automations/n8n/example/workflow.json"),
    artifact,
  );
  await writeFile(join(root, "docs/runbooks/example.md"), "# Runbook\n");
  await writeFile(
    join(root, "docs/runbooks/example-recovery.md"),
    "# Recovery\n",
  );
  const checksum =
    sourceChecksum ?? createHash("sha256").update(artifact).digest("hex");

  await writeFile(
    join(root, "automations/manifests/example.json"),
    JSON.stringify({
      businessCapability: "Synthetic example",
      credentialReferences: [],
      dataClassification: "INTERNAL",
      dependencies: [],
      displayName: "Example",
      id: "example-n8n",
      manifestVersion: "1.0.0",
      nativeArtifactPath: "automations/n8n/example/workflow.json",
      owner: {
        email: "owner@example.test",
        supportGroup: "Automation",
      },
      platform: "n8n",
      recoveryPath: "docs/runbooks/example-recovery.md",
      riskTier: "LOW",
      runbookPath: "docs/runbooks/example.md",
      schemaVersion,
      sourceChecksum: checksum,
      targets: [{ environment: "demo", releaseStrategy: "PIPELINE" }],
      trigger: {
        alertAfterSeconds: 120,
        expectedSlaSeconds: 60,
        type: "WEBHOOK",
      },
    }),
  );
  return root;
}

afterEach(async () => {
  await Promise.all(
    repositories
      .splice(0)
      .map((repository) => rm(repository, { force: true, recursive: true })),
  );
});

describe("catalog loader", () => {
  it("loads a valid catalog with matching source evidence", async () => {
    const catalog = await loadCatalog(await createRepository());

    expect(catalog).toHaveLength(1);
    expect(catalog[0]?.checksumStatus).toBe("MATCH");
  });

  it("reports source drift without hiding the catalog", async () => {
    const catalog = await loadCatalog(
      await createRepository("1.0", "0".repeat(64)),
    );

    expect(catalog[0]?.checksumStatus).toBe("MISMATCH");
  });

  it("rejects incompatible manifest schema versions", async () => {
    await expect(loadCatalog(await createRepository("2.0"))).rejects.toThrow();
  });

  it("rejects duplicate automation identifiers", async () => {
    const repository = await createRepository();
    const manifest = await readFile(
      join(repository, "automations/manifests/example.json"),
      "utf8",
    );
    await writeFile(
      join(repository, "automations/manifests/duplicate.json"),
      manifest,
    );

    await expect(loadCatalog(repository)).rejects.toThrow(
      "Duplicate automation identifier",
    );
  });
});
