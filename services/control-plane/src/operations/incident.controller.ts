import type {
  AuthenticatedPrincipal,
  IncidentHistoryRecord,
  IncidentRecord,
} from "@automation-control-plane/contracts";
import { Body, Controller, Get, Inject, Param, Patch } from "@nestjs/common";

import { Principal, RequireRoles } from "../auth/auth.decorators.js";
import { IncidentService } from "./incident.service.js";

@RequireRoles("OPERATOR", "AUDITOR", "AUTOMATION_OWNER")
@Controller("incidents")
export class IncidentController {
  public constructor(
    @Inject(IncidentService) private readonly incidents: IncidentService,
  ) {}

  @Get()
  public async list(): Promise<readonly IncidentRecord[]> {
    return this.incidents.list();
  }

  @Get(":id")
  public async getById(@Param("id") id: string): Promise<IncidentRecord> {
    return this.incidents.getById(id);
  }

  @Get(":id/history")
  public async history(
    @Param("id") id: string,
  ): Promise<readonly IncidentHistoryRecord[]> {
    return this.incidents.history(id);
  }

  @RequireRoles("OPERATOR")
  @Patch(":id")
  public async applyAction(
    @Param("id") id: string,
    @Body() body: unknown,
    @Principal() principal: AuthenticatedPrincipal,
  ): Promise<IncidentRecord> {
    return this.incidents.applyAction(id, body, principal);
  }
}
