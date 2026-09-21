import { randomUUID } from "node:crypto";

import { Inject, Injectable, Logger } from "@nestjs/common";

import { DatabaseService } from "./database/database.service.js";

const heartbeatIntervalMilliseconds = 10_000;

@Injectable()
export class WorkerRuntimeService {
  private readonly instanceId = randomUUID();
  private readonly logger = new Logger(WorkerRuntimeService.name);

  public constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
  ) {}

  public async run(signal: AbortSignal): Promise<void> {
    while (!signal.aborted) {
      await this.database.recordWorkerHeartbeat(this.instanceId);
      this.logger.debug(`Worker heartbeat recorded for ${this.instanceId}`);
      await this.waitForNextHeartbeat(signal);
    }
  }

  private async waitForNextHeartbeat(signal: AbortSignal): Promise<void> {
    await new Promise<void>((resolve) => {
      const timeout = setTimeout(resolve, heartbeatIntervalMilliseconds);
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
