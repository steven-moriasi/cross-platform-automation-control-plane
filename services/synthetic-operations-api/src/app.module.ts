import { Module } from "@nestjs/common";

import { AppController } from "./app.controller.js";
import { CallbacksController } from "./callbacks.controller.js";
import { ClaimsController } from "./claims.controller.js";
import { CommerceController } from "./commerce.controller.js";
import { FieldInspectionsController } from "./field-inspections.controller.js";
import { IdempotencyService } from "./idempotency.service.js";
import { PartnersController } from "./partners.controller.js";
import { MetricsController } from "./metrics.controller.js";
import { MetricsService } from "./metrics.service.js";
import { SyntheticStore } from "./synthetic-store.js";

@Module({
  controllers: [
    AppController,
    CallbacksController,
    ClaimsController,
    CommerceController,
    FieldInspectionsController,
    MetricsController,
    PartnersController,
  ],
  providers: [IdempotencyService, MetricsService, SyntheticStore],
  exports: [IdempotencyService, SyntheticStore],
})
export class AppModule {}
