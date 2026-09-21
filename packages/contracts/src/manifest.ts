import { z } from "zod";

import { automationPlatforms } from "./platform.js";

export const automationManifestSchemaVersion = "1.0" as const;

export const riskTiers = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;
export type RiskTier = (typeof riskTiers)[number];

export const dataClassifications = [
  "PUBLIC",
  "INTERNAL",
  "CONFIDENTIAL",
  "RESTRICTED",
] as const;
export type DataClassification = (typeof dataClassifications)[number];

export const triggerTypes = [
  "WEBHOOK",
  "SCHEDULE",
  "POLLING",
  "EVENT",
  "MANUAL",
] as const;
export type TriggerType = (typeof triggerTypes)[number];

const repositoryPathSchema = z
  .string()
  .trim()
  .min(1)
  .max(300)
  .refine(
    (value) =>
      !value.startsWith("/") &&
      !value.includes("\\") &&
      !value.split("/").includes(".."),
    "Repository paths must be relative and cannot traverse directories.",
  );

const dependencySchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    required: z.boolean(),
    type: z.enum(["API", "DATABASE", "QUEUE", "SERVICE"]),
  })
  .strict();

const credentialReferenceSchema = z
  .object({
    name: z.string().regex(/^[A-Z][A-Z0-9_]{2,79}$/),
    purpose: z.string().trim().min(1).max(200),
  })
  .strict();

const targetSchema = z
  .object({
    environment: z.enum(["demo", "staging", "production"]),
    releaseStrategy: z.enum(["MANUAL", "PROMOTED", "PIPELINE"]),
  })
  .strict();

export const automationManifestSchema = z
  .object({
    businessCapability: z.string().trim().min(1).max(120),
    credentialReferences: z.array(credentialReferenceSchema).max(20),
    dataClassification: z.enum(dataClassifications),
    dependencies: z.array(dependencySchema).max(30),
    displayName: z.string().trim().min(1).max(120),
    id: z
      .string()
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      .max(100),
    manifestVersion: z.string().regex(/^\d+\.\d+\.\d+$/),
    nativeArtifactPath: repositoryPathSchema,
    owner: z
      .object({
        email: z.string().email(),
        supportGroup: z.string().trim().min(1).max(120),
      })
      .strict(),
    platform: z.enum(automationPlatforms),
    recoveryPath: repositoryPathSchema,
    riskTier: z.enum(riskTiers),
    runbookPath: repositoryPathSchema,
    schemaVersion: z.literal(automationManifestSchemaVersion),
    sourceChecksum: z.string().regex(/^[a-f0-9]{64}$/),
    targets: z.array(targetSchema).min(1).max(3),
    trigger: z
      .object({
        alertAfterSeconds: z.number().int().positive().max(604_800),
        expectedSlaSeconds: z.number().int().positive().max(604_800),
        type: z.enum(triggerTypes),
      })
      .strict(),
  })
  .strict()
  .superRefine((manifest, context) => {
    if (
      manifest.trigger.alertAfterSeconds < manifest.trigger.expectedSlaSeconds
    ) {
      context.addIssue({
        code: "custom",
        message: "The alert threshold cannot be shorter than the expected SLA.",
        path: ["trigger", "alertAfterSeconds"],
      });
    }

    for (const field of ["dependencies", "credentialReferences"] as const) {
      const names = manifest[field].map((entry) => entry.name);
      if (new Set(names).size !== names.length) {
        context.addIssue({
          code: "custom",
          message: `${field} names must be unique.`,
          path: [field],
        });
      }
    }
  });

export type AutomationManifest = z.infer<typeof automationManifestSchema>;

const prohibitedSecretKeys = new Set([
  "accesskey",
  "apikey",
  "clientsecret",
  "credentialvalue",
  "password",
  "privatekey",
  "secret",
  "token",
]);

function normalizeKey(value: string): string {
  return value.replaceAll(/[^a-zA-Z0-9]/g, "").toLowerCase();
}

export function assertNoEmbeddedSecrets(
  value: unknown,
  path = "manifest",
): void {
  if (Array.isArray(value)) {
    value.forEach((entry, index) =>
      assertNoEmbeddedSecrets(entry, `${path}[${index}]`),
    );
    return;
  }

  if (typeof value !== "object" || value === null) {
    if (
      typeof value === "string" &&
      value.includes("-----BEGIN PRIVATE KEY-----")
    ) {
      throw new Error(`Embedded private key detected at ${path}.`);
    }
    return;
  }

  for (const [key, entry] of Object.entries(value)) {
    const entryPath = `${path}.${key}`;
    if (prohibitedSecretKeys.has(normalizeKey(key))) {
      throw new Error(`Embedded secret field detected at ${entryPath}.`);
    }
    assertNoEmbeddedSecrets(entry, entryPath);
  }
}

export function parseAutomationManifest(value: unknown): AutomationManifest {
  assertNoEmbeddedSecrets(value);
  return automationManifestSchema.parse(value);
}
