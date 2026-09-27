import { Module } from "@nestjs/common";

import { DatabaseModule } from "../database/database.module.js";
import { TelemetryController } from "./telemetry.controller.js";
import { TelemetryRepository } from "./telemetry.repository.js";
import { TelemetryService } from "./telemetry.service.js";

@Module({
  imports: [DatabaseModule],
  controllers: [TelemetryController],
  providers: [TelemetryRepository, TelemetryService],
})
export class TelemetryModule {}
