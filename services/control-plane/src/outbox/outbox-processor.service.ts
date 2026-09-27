import { Logger } from "@nestjs/common";
import { Inject, Injectable } from "@nestjs/common";
import { z } from "zod";

import {
  OutboxRepository,
  type LeasedOutboxMessage,
} from "./outbox.repository.js";

const telemetryPayloadSchema = z
  .object({
    automationId: z.string().min(1),
    correlationId: z.string().min(1),
    environment: z.string().min(1),
    errorCode: z.string().optional(),
    eventId: z.string().uuid(),
    executionId: z.string().min(1),
    occurredAt: z.string().datetime({ offset: true }),
    status: z.enum(["STARTED", "SUCCEEDED", "FAILED", "TIMED_OUT"]),
  })
  .strict();

@Injectable()
export class OutboxProcessor {
  private readonly logger = new Logger(OutboxProcessor.name);

  public constructor(
    @Inject(OutboxRepository)
    private readonly repository: OutboxRepository,
  ) {}

  public async processAvailable(
    instanceId: string,
    limit = 25,
  ): Promise<number> {
    let processed = 0;
    while (processed < limit) {
      const message = await this.repository.lease(instanceId);
      if (message === undefined) {
        break;
      }
      await this.processOne(message, instanceId);
      processed += 1;
    }
    return processed;
  }

  private async processOne(
    message: LeasedOutboxMessage,
    instanceId: string,
  ): Promise<void> {
    try {
      if (message.topic !== "telemetry.execution.accepted") {
        throw new Error(`Unsupported outbox topic: ${message.topic}`);
      }
      const payload = telemetryPayloadSchema.parse(message.payload);
      if (payload.status === "FAILED" || payload.status === "TIMED_OUT") {
        if (payload.errorCode === undefined) {
          throw new Error("Failure telemetry is missing an error code.");
        }
        await this.repository.correlateFailure({
          automationId: payload.automationId,
          correlationKey: payload.correlationId,
          errorCode: payload.errorCode,
          occurredAt: payload.occurredAt,
        });
      }
      await this.repository.complete(message.id, instanceId);
    } catch (error: unknown) {
      const detail =
        error instanceof Error
          ? error.message.slice(0, 2_000)
          : "Unknown error";
      this.logger.error(`Outbox message ${message.id} failed: ${detail}`);
      await this.repository.fail(message, instanceId, detail);
    }
  }
}
