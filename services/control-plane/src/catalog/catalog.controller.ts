import type {
  CatalogAuditRecord,
  CatalogAutomation,
} from "@automation-control-plane/contracts";
import { Controller, Get, Inject, Param } from "@nestjs/common";

import { RequireRoles } from "../auth/auth.decorators.js";
import { CatalogService } from "./catalog.service.js";

@Controller("automations")
export class CatalogController {
  public constructor(
    @Inject(CatalogService) private readonly catalog: CatalogService,
  ) {}

  @Get()
  public async list(): Promise<readonly CatalogAutomation[]> {
    return this.catalog.list();
  }

  @Get(":id")
  public async getById(@Param("id") id: string): Promise<CatalogAutomation> {
    return this.catalog.getById(id);
  }

  @RequireRoles("AUDITOR", "AUTOMATION_OWNER")
  @Get(":id/audit")
  public async listAudit(
    @Param("id") id: string,
  ): Promise<readonly CatalogAuditRecord[]> {
    return this.catalog.listAudit(id);
  }
}
