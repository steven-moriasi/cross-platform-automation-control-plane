import { z } from "zod";

import { assertNoEmbeddedSecrets } from "./manifest.js";
import { automationPlatforms } from "./platform.js";

export const executionEventSchemaVersion = "1.0" as const;

export const executionStatuses = [
  "STARTED",
  "SUCCEEDED",
  "FAILED",
  "TIMED_OUT",
] as const;
export type ExecutionStatus = (typeof executionStatuses)[number];

export const executionEventSchema = z
  .object({
    schema_version: z.literal(executionEventSchemaVersion),
    event_id: z.string().uuid(),
    automation_id: z
      .string()
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      .max(100),
    release_version: z.string().regex(/^\d+\.\d+\.\d+$/),
    platform: z.enum(automationPlatforms),
    environment: z.enum(["demo", "staging", "production"]),
    execution_id: z.string().trim().min(1).max(200),
    status: z.enum(executionStatuses),
    occurred_at: z.string().datetime({ offset: true }),
    duration_ms: z.number().int().nonnegative().max(604_800_000).optional(),
    error_code: z
      .string()
      .regex(/^[A-Z][A-Z0-9_]{2,79}$/)
      .optional(),
    correlation_id: z.string().trim().min(1).max(200).optional(),
  })
  .strict()
  .superRefine((event, context) => {
    if (
      (event.status === "FAILED" || event.status === "TIMED_OUT") &&
      event.error_code === undefined
    ) {
      context.addIssue({
        code: "custom",
        message: "Failed and timed-out events require an error code.",
        path: ["error_code"],
      });
    }

    if (
      (event.status === "SUCCEEDED" ||
        event.status === "FAILED" ||
        event.status === "TIMED_OUT") &&
      event.duration_ms === undefined
    ) {
      context.addIssue({
        code: "custom",
        message: "Terminal events require a duration.",
        path: ["duration_ms"],
      });
    }
  });

export type ExecutionEvent = z.infer<typeof executionEventSchema>;

export interface TelemetryReceipt {
  readonly acceptedAt: string;
  readonly eventId: string;
  readonly replayed: boolean;
}

export function parseExecutionEvent(value: unknown): ExecutionEvent {
  assertNoEmbeddedSecrets(value, "executionEvent");
  return executionEventSchema.parse(value);
}
