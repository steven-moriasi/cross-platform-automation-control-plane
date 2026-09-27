import { randomUUID } from "node:crypto";

import { OtlpTraceEmitter } from "@automation-control-plane/observability";
import { Inject, Injectable, Logger } from "@nestjs/common";

import { DatabaseService } from "./database/database.service.js";
import { OutboxProcessor } from "./outbox/outbox-processor.service.js";

const heartbeatIntervalMilliseconds = 10_000;
const idleIntervalMilliseconds = 2_000;

@Injectable()
export class WorkerRuntimeService {
  private readonly instanceId = randomUUID();
  private readonly logger = new Logger(WorkerRuntimeService.name);
  private readonly traces = new OtlpTraceEmitter({
    endpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
    serviceName: "control-plane-worker",
    serviceVersion: process.env.SERVICE_VERSION ?? "0.1.0",
  });

  public constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
    @Inject(OutboxProcessor)
    private readonly outbox: OutboxProcessor,
  ) {}

  public async run(signal: AbortSignal): Promise<void> {
    let nextHeartbeatAt = 0;
    while (!signal.aborted) {
      if (Date.now() >= nextHeartbeatAt) {
        const span = this.traces.startSpan({
          attributes: { "worker.instance.id": this.instanceId },
          kind: "internal",
          name: "worker heartbeat",
        });
        try {
          await this.database.recordWorkerHeartbeat(this.instanceId);
          span.end({ status: "ok" });
        } catch (error: unknown) {
          span.end({
            attributes: {
              "error.type":
                error instanceof Error ? error.name : "UnknownWorkerError",
            },
            status: "error",
          });
          throw error;
        }
        this.logger.debug(`Worker heartbeat recorded for ${this.instanceId}`);
        nextHeartbeatAt = Date.now() + heartbeatIntervalMilliseconds;
      }

      const processed = await this.outbox.processAvailable(this.instanceId);
      if (processed === 0) {
        await this.waitForWork(signal);
      }
    }
  }

  private async waitForWork(signal: AbortSignal): Promise<void> {
    await new Promise<void>((resolve) => {
      const timeout = setTimeout(resolve, idleIntervalMilliseconds);
      signal.addEventListener(
        "abort",
        () => {
          clearTimeout(timeout);
          resolve();
        },
        { once: true },
      );
    });
  }
}
