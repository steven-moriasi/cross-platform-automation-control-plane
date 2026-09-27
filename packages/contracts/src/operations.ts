import { z } from "zod";

export const releaseStatuses = ["PROPOSED", "APPROVED", "REJECTED"] as const;
export type ReleaseStatus = (typeof releaseStatuses)[number];

export const configurationChangeSchema = z
  .object({
    changeType: z.enum(["ADDED", "UPDATED", "REMOVED"]),
    name: z.string().regex(/^[A-Z][A-Z0-9_]{2,79}$/),
    sensitive: z.boolean(),
  })
  .strict();

export const releaseProposalSchema = z
  .object({
    artifactChecksum: z.string().regex(/^[a-f0-9]{64}$/),
    automationId: z
      .string()
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      .max(100),
    configurationChanges: z.array(configurationChangeSchema).max(30),
    evidenceExpiresAt: z.string().datetime({ offset: true }),
    manifestVersion: z.string().regex(/^\d+\.\d+\.\d+$/),
    providerDeploymentReference: z.string().trim().min(1).max(200).optional(),
    rollbackInstructions: z.string().trim().min(10).max(2_000),
    sourceCommit: z.string().regex(/^[a-f0-9]{7,64}$/),
    targetEnvironment: z.enum(["demo", "staging", "production"]),
    version: z.string().regex(/^\d+\.\d+\.\d+$/),
  })
  .strict();

export type ReleaseProposal = z.infer<typeof releaseProposalSchema>;

export const releaseDecisionSchema = z
  .object({
    decision: z.enum(["APPROVE", "REJECT"]),
    rationale: z.string().trim().min(10).max(1_000),
  })
  .strict();

export type ReleaseDecision = z.infer<typeof releaseDecisionSchema>;

export interface ReleaseRecord extends ReleaseProposal {
  readonly approverDisplayName?: string;
  readonly approverSubject?: string;
  readonly decidedAt?: string;
  readonly decisionRationale?: string;
  readonly id: string;
  readonly proposedAt: string;
  readonly proposerDisplayName: string;
  readonly proposerSubject: string;
  readonly status: ReleaseStatus;
}

export const incidentStatuses = [
  "OPEN",
  "ACKNOWLEDGED",
  "RESOLVED",
  "CLOSED",
] as const;
export type IncidentStatus = (typeof incidentStatuses)[number];

export const incidentSeverities = [
  "LOW",
  "MEDIUM",
  "HIGH",
  "CRITICAL",
] as const;
export type IncidentSeverity = (typeof incidentSeverities)[number];

export const incidentActionSchema = z.discriminatedUnion("action", [
  z
    .object({
      action: z.literal("ACKNOWLEDGE"),
      note: z.string().trim().min(5).max(1_000),
    })
    .strict(),
  z
    .object({
      action: z.literal("ASSIGN"),
      assignee: z.string().trim().min(1).max(200),
      note: z.string().trim().min(5).max(1_000),
    })
    .strict(),
  z
    .object({
      action: z.literal("RECORD_RECOVERY"),
      note: z.string().trim().min(10).max(2_000),
    })
    .strict(),
  z
    .object({
      action: z.literal("RESOLVE"),
      note: z.string().trim().min(10).max(2_000),
    })
    .strict(),
  z
    .object({
      action: z.literal("CLOSE"),
      note: z.string().trim().min(10).max(2_000),
    })
    .strict(),
]);

export type IncidentAction = z.infer<typeof incidentActionSchema>;

export interface IncidentRecord {
  readonly acknowledgedAt?: string;
  readonly assignee?: string;
  readonly automationId: string;
  readonly closedAt?: string;
  readonly correlationKey: string;
  readonly createdAt: string;
  readonly errorCode: string;
  readonly failureCount: number;
  readonly firstOccurredAt: string;
  readonly id: string;
  readonly lastOccurredAt: string;
  readonly recoveryNote?: string;
  readonly resolvedAt?: string;
  readonly severity: IncidentSeverity;
  readonly status: IncidentStatus;
  readonly updatedAt: string;
}

export interface IncidentHistoryRecord {
  readonly actorDisplayName: string;
  readonly actorSubject: string;
  readonly createdAt: string;
  readonly eventType:
    | "OPENED"
    | "FAILURE_CORRELATED"
    | "ACKNOWLEDGED"
    | "ASSIGNED"
    | "RECOVERY_RECORDED"
    | "RESOLVED"
    | "CLOSED";
  readonly id: string;
  readonly incidentId: string;
  readonly note?: string;
}

export interface EvidenceBundleRecord {
  readonly automationId: string;
  readonly createdAt: string;
  readonly createdByDisplayName: string;
  readonly createdBySubject: string;
  readonly expiresAt: string;
  readonly id: string;
  readonly incidentId?: string;
  readonly objectKey: string;
  readonly releaseId?: string;
  readonly sha256: string;
}

export const evidenceBundleRequestSchema = z
  .object({
    automationId: z
      .string()
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      .max(100),
    expiresAt: z.string().datetime({ offset: true }),
    incidentId: z.string().uuid().optional(),
    releaseId: z.string().uuid().optional(),
  })
  .strict()
  .refine(
    ({ incidentId, releaseId }) =>
      (incidentId === undefined) !== (releaseId === undefined),
    {
      message: "Exactly one release or incident must be selected.",
    },
  );

export type EvidenceBundleRequest = z.infer<typeof evidenceBundleRequestSchema>;

export interface EvidenceBundleDocument {
  readonly generatedAt: string;
  readonly incident?: {
    readonly history: readonly IncidentHistoryRecord[];
    readonly record: IncidentRecord;
  };
  readonly release?: ReleaseRecord;
  readonly schemaVersion: "1.0";
}
