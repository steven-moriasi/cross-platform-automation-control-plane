import { Module } from "@nestjs/common";

import { DatabaseModule } from "../database/database.module.js";
import { MetricsController } from "./metrics.controller.js";
import { MetricsService } from "./metrics.service.js";

@Module({
  imports: [DatabaseModule],
  controllers: [MetricsController],
  providers: [MetricsService],
  exports: [MetricsService],
})
export class ObservabilityModule {}
