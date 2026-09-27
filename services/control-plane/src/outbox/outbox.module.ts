import { Module } from "@nestjs/common";

import { DatabaseModule } from "../database/database.module.js";
import { OutboxProcessor } from "./outbox-processor.service.js";
import { OutboxRepository } from "./outbox.repository.js";

@Module({
  imports: [DatabaseModule],
  providers: [OutboxProcessor, OutboxRepository],
  exports: [OutboxProcessor],
})
export class OutboxModule {}
