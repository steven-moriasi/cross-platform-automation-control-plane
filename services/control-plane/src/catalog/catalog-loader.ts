import { createHash } from "node:crypto";
import { access, readFile, readdir } from "node:fs/promises";
import { resolve, sep } from "node:path";

import { parseAutomationManifest } from "@automation-control-plane/contracts";

import type { LoadedCatalogAutomation } from "./catalog.types.js";

function checksum(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

function resolveRepositoryPath(
  repositoryRoot: string,
  repositoryPath: string,
): string {
  const resolvedRoot = resolve(repositoryRoot);
  const resolvedPath = resolve(resolvedRoot, repositoryPath);
  if (!resolvedPath.startsWith(`${resolvedRoot}${sep}`)) {
    throw new Error(`Catalog path escapes the repository: ${repositoryPath}`);
  }
  return resolvedPath;
}

export async function loadCatalog(
  repositoryRoot: string,
): Promise<readonly LoadedCatalogAutomation[]> {
  const manifestDirectory = resolve(repositoryRoot, "automations", "manifests");
  const filenames = (await readdir(manifestDirectory))
    .filter((filename) => filename.endsWith(".json"))
    .sort();
  const automationIds = new Set<string>();
  const catalog: LoadedCatalogAutomation[] = [];

  for (const filename of filenames) {
    const manifestSource = await readFile(
      resolve(manifestDirectory, filename),
      "utf8",
    );
    const manifest = parseAutomationManifest(JSON.parse(manifestSource));
    if (automationIds.has(manifest.id)) {
      throw new Error(`Duplicate automation identifier: ${manifest.id}`);
    }
    automationIds.add(manifest.id);

    const artifact = await readFile(
      resolveRepositoryPath(repositoryRoot, manifest.nativeArtifactPath),
    );
    await access(resolveRepositoryPath(repositoryRoot, manifest.runbookPath));
    await access(resolveRepositoryPath(repositoryRoot, manifest.recoveryPath));
    const observedSourceChecksum = checksum(artifact);

    catalog.push({
      checksumStatus:
        observedSourceChecksum === manifest.sourceChecksum
          ? "MATCH"
          : "MISMATCH",
      manifest,
      manifestChecksum: checksum(manifestSource),
      observedSourceChecksum,
    });
  }

  if (catalog.length === 0) {
    throw new Error("The automation catalog contains no manifests.");
  }

  return catalog;
}
