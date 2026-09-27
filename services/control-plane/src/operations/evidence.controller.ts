import type {
  AuthenticatedPrincipal,
  EvidenceBundleDocument,
  EvidenceBundleRecord,
} from "@automation-control-plane/contracts";
import { Body, Controller, Get, Inject, Param, Post } from "@nestjs/common";

import { Principal, RequireRoles } from "../auth/auth.decorators.js";
import { EvidenceService } from "./evidence.service.js";

@RequireRoles("AUDITOR", "OPERATOR")
@Controller("evidence")
export class EvidenceController {
  public constructor(
    @Inject(EvidenceService) private readonly evidence: EvidenceService,
  ) {}

  @Post()
  public async create(
    @Body() body: unknown,
    @Principal() principal: AuthenticatedPrincipal,
  ): Promise<EvidenceBundleRecord> {
    return this.evidence.create(body, principal);
  }

  @Get()
  public async list(): Promise<readonly EvidenceBundleRecord[]> {
    return this.evidence.list();
  }

  @Get(":id/download")
  public async download(
    @Param("id") id: string,
  ): Promise<EvidenceBundleDocument> {
    return this.evidence.download(id);
  }
}
