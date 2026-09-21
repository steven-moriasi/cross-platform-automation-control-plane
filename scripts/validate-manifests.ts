import { createHash } from "node:crypto";
import { access, readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";

import { parseAutomationManifest } from "../packages/contracts/src/index.js";

const repositoryRoot = resolve(process.cwd());
const manifestDirectory = resolve(repositoryRoot, "automations/manifests");

function repositoryPath(path: string): string {
  const absolutePath = resolve(repositoryRoot, path);
  if (!absolutePath.startsWith(`${repositoryRoot}/`)) {
    throw new Error(`Path escapes the repository: ${path}`);
  }
  return absolutePath;
}

async function main(): Promise<void> {
  const filenames = (await readdir(manifestDirectory))
    .filter((filename) => filename.endsWith(".json"))
    .sort();
  const automationIds = new Set<string>();

  for (const filename of filenames) {
    const manifestPath = resolve(manifestDirectory, filename);
    const manifestSource = await readFile(manifestPath, "utf8");
    const manifest = parseAutomationManifest(JSON.parse(manifestSource));

    if (automationIds.has(manifest.id)) {
      throw new Error(`Duplicate automation identifier: ${manifest.id}`);
    }
    automationIds.add(manifest.id);

    const artifact = await readFile(
      repositoryPath(manifest.nativeArtifactPath),
    );
    const checksum = createHash("sha256").update(artifact).digest("hex");
    if (checksum !== manifest.sourceChecksum) {
      throw new Error(
        `Checksum mismatch for ${manifest.id}: expected ${manifest.sourceChecksum}, received ${checksum}.`,
      );
    }

    await access(repositoryPath(manifest.runbookPath));
    await access(repositoryPath(manifest.recoveryPath));
  }

  if (filenames.length === 0) {
    throw new Error("At least one automation manifest is required.");
  }

  console.log(`Validated ${filenames.length} automation manifests.`);
}

void main();
