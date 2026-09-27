import { Module } from "@nestjs/common";

import { DatabaseModule } from "../database/database.module.js";
import { ExecutionController } from "./execution.controller.js";
import { ExecutionRepository } from "./execution.repository.js";
import { TelemetryController } from "./telemetry.controller.js";
import { TelemetryRepository } from "./telemetry.repository.js";
import { TelemetryService } from "./telemetry.service.js";

@Module({
  imports: [DatabaseModule],
  controllers: [ExecutionController, TelemetryController],
  providers: [ExecutionRepository, TelemetryRepository, TelemetryService],
})
export class TelemetryModule {}
