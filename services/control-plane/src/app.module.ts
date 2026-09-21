import { Module } from "@nestjs/common";

import { EnvironmentModule } from "./config/environment.module.js";
import { DatabaseModule } from "./database/database.module.js";
import { HealthController } from "./health/health.controller.js";
import { HealthService } from "./health/health.service.js";

@Module({
  imports: [EnvironmentModule, DatabaseModule],
  controllers: [HealthController],
  providers: [HealthService],
})
export class AppModule {}
