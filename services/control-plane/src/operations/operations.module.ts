import { Module } from "@nestjs/common";

import { DatabaseModule } from "../database/database.module.js";
import { EvidenceController } from "./evidence.controller.js";
import { EvidenceRepository } from "./evidence.repository.js";
import { EvidenceService } from "./evidence.service.js";
import { IncidentController } from "./incident.controller.js";
import { IncidentRepository } from "./incident.repository.js";
import { IncidentService } from "./incident.service.js";
import { ReleaseController } from "./release.controller.js";
import { ReleaseRepository } from "./release.repository.js";
import { ReleaseService } from "./release.service.js";

@Module({
  imports: [DatabaseModule],
  controllers: [EvidenceController, IncidentController, ReleaseController],
  providers: [
    EvidenceRepository,
    EvidenceService,
    IncidentRepository,
    IncidentService,
    ReleaseRepository,
    ReleaseService,
  ],
})
export class OperationsModule {}
