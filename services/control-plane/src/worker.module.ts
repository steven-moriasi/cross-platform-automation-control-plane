import { Module } from "@nestjs/common";

import { EnvironmentModule } from "./config/environment.module.js";
import { DatabaseModule } from "./database/database.module.js";
import { OutboxModule } from "./outbox/outbox.module.js";
import { WorkerRuntimeService } from "./worker-runtime.service.js";

@Module({
  imports: [EnvironmentModule, DatabaseModule, OutboxModule],
  providers: [WorkerRuntimeService],
})
export class WorkerModule {}
