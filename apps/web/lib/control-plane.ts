import {
  parseAutomationManifest,
  type AuthenticatedPrincipal,
  type CatalogAuditRecord,
  type CatalogAutomation,
} from "@automation-control-plane/contracts";
import { z } from "zod";

import { readAuthConfiguration } from "./auth/config";

const principalSchema = z.object({
  displayName: z.string().min(1),
  email: z.string().email().optional(),
  roles: z.array(
    z.enum([
      "PLATFORM_ADMIN",
      "AUTOMATION_OWNER",
      "RELEASE_APPROVER",
      "OPERATOR",
      "AUDITOR",
      "VIEWER",
    ]),
  ),
  subject: z.string().min(1),
});

const catalogMetadataSchema = z
  .object({
    checksumStatus: z.enum(["MATCH", "MISMATCH"]),
    observedSourceChecksum: z.string().regex(/^[a-f0-9]{64}$/),
    synchronizedAt: z.string().datetime(),
  })
  .passthrough();

const catalogAuditSchema = z.object({
  automationId: z.string().min(1),
  currentSourceChecksum: z.string().regex(/^[a-f0-9]{64}$/),
  eventType: z.enum(["REGISTERED", "SOURCE_CHECKSUM_CHANGED"]),
  id: z.string().min(1),
  manifestChecksum: z.string().regex(/^[a-f0-9]{64}$/),
  previousSourceChecksum: z
    .string()
    .regex(/^[a-f0-9]{64}$/)
    .optional(),
  recordedAt: z.string().datetime(),
});

async function getControlPlaneResource(
  accessToken: string,
  path: string,
): Promise<unknown> {
  const configuration = readAuthConfiguration();
  const response = await fetch(
    `${configuration.controlPlaneInternalUrl}/api/v1/${path}`,
    {
      cache: "no-store",
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
    },
  );

  if (!response.ok) {
    throw new Error(
      `Control-plane request to ${path} failed with status ${response.status}.`,
    );
  }

  return response.json();
}

function parseCatalogAutomation(value: unknown): CatalogAutomation {
  const result = catalogMetadataSchema.parse(value);
  const {
    checksumStatus,
    observedSourceChecksum,
    synchronizedAt,
    ...manifestSource
  } = result;
  const manifest = parseAutomationManifest(manifestSource);

  return {
    ...manifest,
    checksumStatus,
    observedSourceChecksum,
    synchronizedAt,
  };
}

export async function getVerifiedPrincipal(
  accessToken: string,
): Promise<AuthenticatedPrincipal> {
  const principal = principalSchema.parse(
    await getControlPlaneResource(accessToken, "session"),
  );
  return {
    displayName: principal.displayName,
    ...(principal.email === undefined ? {} : { email: principal.email }),
    roles: principal.roles,
    subject: principal.subject,
  };
}

export async function getAutomationCatalog(
  accessToken: string,
): Promise<readonly CatalogAutomation[]> {
  const catalog = z
    .array(z.unknown())
    .parse(await getControlPlaneResource(accessToken, "automations"));
  return catalog.map(parseCatalogAutomation);
}

export async function getAutomation(
  accessToken: string,
  id: string,
): Promise<CatalogAutomation> {
  return parseCatalogAutomation(
    await getControlPlaneResource(
      accessToken,
      `automations/${encodeURIComponent(id)}`,
    ),
  );
}

export async function getAutomationAudit(
  accessToken: string,
  id: string,
): Promise<readonly CatalogAuditRecord[]> {
  const records = z
    .array(catalogAuditSchema)
    .parse(
      await getControlPlaneResource(
        accessToken,
        `automations/${encodeURIComponent(id)}/audit`,
      ),
    );

  return records.map((record) => ({
    automationId: record.automationId,
    currentSourceChecksum: record.currentSourceChecksum,
    eventType: record.eventType,
    id: record.id,
    manifestChecksum: record.manifestChecksum,
    ...(record.previousSourceChecksum === undefined
      ? {}
      : { previousSourceChecksum: record.previousSourceChecksum }),
    recordedAt: record.recordedAt,
  }));
}
