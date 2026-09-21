import { Module } from "@nestjs/common";

import { AuthModule } from "./auth/auth.module.js";
import { SessionController } from "./auth/session.controller.js";
import { EnvironmentModule } from "./config/environment.module.js";
import { DatabaseModule } from "./database/database.module.js";
import { HealthController } from "./health/health.controller.js";
import { HealthService } from "./health/health.service.js";

@Module({
  imports: [AuthModule, EnvironmentModule, DatabaseModule],
  controllers: [HealthController, SessionController],
  providers: [HealthService],
})
export class AppModule {}
