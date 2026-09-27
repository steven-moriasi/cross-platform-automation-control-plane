import { randomUUID } from "node:crypto";

import { Inject, Injectable, Logger } from "@nestjs/common";

import { DatabaseService } from "./database/database.service.js";
import { OutboxProcessor } from "./outbox/outbox-processor.service.js";

const heartbeatIntervalMilliseconds = 10_000;
const idleIntervalMilliseconds = 2_000;

@Injectable()
export class WorkerRuntimeService {
  private readonly instanceId = randomUUID();
  private readonly logger = new Logger(WorkerRuntimeService.name);

  public constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
    @Inject(OutboxProcessor)
    private readonly outbox: OutboxProcessor,
  ) {}

  public async run(signal: AbortSignal): Promise<void> {
    let nextHeartbeatAt = 0;
    while (!signal.aborted) {
      if (Date.now() >= nextHeartbeatAt) {
        await this.database.recordWorkerHeartbeat(this.instanceId);
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
