"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const { packageRoot, validateSolution } = require("./solution-contract");

const pacVersion = "2.12.2";
const pacChecksum =
  "86f1a950ca3410a325e0c1f26d1c7f17026bf85f5c8c82ec275aa21907545bd1";
const dotnetImage =
  "mcr.microsoft.com/dotnet/sdk@sha256:2fa828c68761b1b8c23d7662dc134421b9d3b59fe1425fdbc80804e390cdb24d";
const packageName = `microsoft.powerapps.cli.tool.${pacVersion}.nupkg`;
const packageUrl =
  `https://api.nuget.org/v3-flatcontainer/microsoft.powerapps.cli.tool/` +
  `${pacVersion}/${packageName}`;

const run = (command, argumentsList, options = {}) =>
  execFileSync(command, argumentsList, {
    encoding: "utf8",
    stdio: options.capture ? "pipe" : "inherit",
  });

const checksum = (file) =>
  crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");

const ensurePac = () => {
  if (process.env.PAC_CLI_ROOT !== undefined) {
    const configuredDll = path.join(process.env.PAC_CLI_ROOT, "pac.dll");
    if (!fs.existsSync(configuredDll)) {
      throw new Error(
        `PAC_CLI_ROOT does not contain pac.dll: ${configuredDll}`,
      );
    }
    return process.env.PAC_CLI_ROOT;
  }

  const cacheRoot = path.join(
    os.homedir(),
    ".cache",
    "power-platform-cli",
    pacVersion,
  );
  const packageFile = path.join(cacheRoot, packageName);
  const toolsRoot = path.join(cacheRoot, "tools", "net10.0", "any");
  const pacDll = path.join(toolsRoot, "pac.dll");
  fs.mkdirSync(cacheRoot, { recursive: true });

  if (!fs.existsSync(packageFile)) {
    run("curl", ["-fsSL", "-o", packageFile, packageUrl]);
  }
  if (checksum(packageFile) !== pacChecksum) {
    throw new Error("Power Platform CLI package checksum did not match.");
  }
  if (!fs.existsSync(pacDll)) {
    run("unzip", ["-q", "-o", packageFile, "-d", cacheRoot]);
  }
  if (!fs.existsSync(pacDll)) {
    throw new Error("Power Platform CLI package did not contain pac.dll.");
  }
  return toolsRoot;
};

const runPac = (pacRoot, argumentsList) => {
  const pacHostRoot = process.env.PAC_HOST_ROOT ?? pacRoot;
  const packageHostRoot = process.env.PACKAGE_HOST_ROOT ?? packageRoot;
  return run("docker", [
    "run",
    "--rm",
    "-v",
    `${pacHostRoot}:/pac:ro`,
    "-v",
    `${packageHostRoot}:/workspace`,
    dotnetImage,
    "dotnet",
    "/pac/pac.dll",
    ...argumentsList,
  ]);
};

const archiveManifest = (archive) => {
  const entries = run("unzip", ["-Z1", archive], { capture: true })
    .trim()
    .split("\n")
    .filter(Boolean)
    .sort();
  return entries.map((entry) => {
    const pattern = entry.replace(/([*?[\\\]])/gu, "\\$1");
    const contents = run("unzip", ["-p", archive, pattern], { capture: true });
    return `${entry}:${crypto.createHash("sha256").update(contents).digest("hex")}`;
  });
};

validateSolution();
const pacRoot = ensurePac();
const dist = path.join(packageRoot, "dist");
const firstArchive = path.join(dist, "FieldInspectionAutomation.zip");
const secondArchive = path.join(dist, "FieldInspectionAutomation.verify.zip");
const unpacked = path.join(dist, "unpacked");
fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(dist, { recursive: true });

for (const archive of [firstArchive, secondArchive]) {
  runPac(pacRoot, [
    "solution",
    "pack",
    "--zipfile",
    `/workspace/dist/${path.basename(archive)}`,
    "--folder",
    "/workspace/solution",
    "--packagetype",
    "Unmanaged",
  ]);
}

const firstManifest = archiveManifest(firstArchive);
const secondManifest = archiveManifest(secondArchive);
if (JSON.stringify(firstManifest) !== JSON.stringify(secondManifest)) {
  throw new Error(
    "Repeated solution packs produced different archive content.",
  );
}
for (const requiredEntry of [
  "connectors/ste_syntheticoperations/apiDefinition.swagger.json",
  "connectors/ste_syntheticoperations/apiProperties.json",
  "customizations.xml",
  "solution.xml",
]) {
  if (!firstManifest.some((entry) => entry.startsWith(`${requiredEntry}:`))) {
    throw new Error(`Packed solution is missing ${requiredEntry}.`);
  }
}

runPac(pacRoot, [
  "solution",
  "unpack",
  "--zipfile",
  "/workspace/dist/FieldInspectionAutomation.zip",
  "--folder",
  "/workspace/dist/unpacked",
  "--packagetype",
  "Unmanaged",
  "--allowWrite",
  "true",
  "--allowDelete",
  "true",
]);
for (const unpackedFile of [
  "Other/Customizations.xml",
  "Other/Solution.xml",
  "connectionreferences/ste_SyntheticOperations.meta.xml",
]) {
  if (!fs.existsSync(path.join(unpacked, unpackedFile))) {
    throw new Error(`Unpacked solution is missing ${unpackedFile}.`);
  }
}

fs.rmSync(secondArchive);
console.log("Power Platform solution pack and unpack verification passed.");
