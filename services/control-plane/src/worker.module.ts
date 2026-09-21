import { Module } from "@nestjs/common";

import { EnvironmentModule } from "./config/environment.module.js";
import { DatabaseModule } from "./database/database.module.js";
import { WorkerRuntimeService } from "./worker-runtime.service.js";

@Module({
  imports: [EnvironmentModule, DatabaseModule],
  providers: [WorkerRuntimeService],
})
export class WorkerModule {}
