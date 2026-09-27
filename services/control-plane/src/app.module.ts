import { Module } from "@nestjs/common";

import { AuthModule } from "./auth/auth.module.js";
import { SessionController } from "./auth/session.controller.js";
import { CatalogModule } from "./catalog/catalog.module.js";
import { EnvironmentModule } from "./config/environment.module.js";
import { DatabaseModule } from "./database/database.module.js";
import { HealthController } from "./health/health.controller.js";
import { HealthService } from "./health/health.service.js";
import { TelemetryModule } from "./telemetry/telemetry.module.js";

@Module({
  imports: [
    AuthModule,
    CatalogModule,
    EnvironmentModule,
    DatabaseModule,
    TelemetryModule,
  ],
  controllers: [HealthController, SessionController],
  providers: [HealthService],
})
export class AppModule {}
