import type {
  AuthenticatedPrincipal,
  ReleaseRecord,
} from "@automation-control-plane/contracts";
import { Body, Controller, Get, Inject, Param, Post } from "@nestjs/common";

import { Principal, RequireRoles } from "../auth/auth.decorators.js";
import { ReleaseService } from "./release.service.js";

@Controller("releases")
export class ReleaseController {
  public constructor(
    @Inject(ReleaseService) private readonly releases: ReleaseService,
  ) {}

  @RequireRoles("AUTOMATION_OWNER")
  @Post()
  public async propose(
    @Body() body: unknown,
    @Principal() principal: AuthenticatedPrincipal,
  ): Promise<ReleaseRecord> {
    return this.releases.propose(body, principal);
  }

  @Get()
  public async list(): Promise<readonly ReleaseRecord[]> {
    return this.releases.list();
  }

  @Get(":id")
  public async getById(@Param("id") id: string): Promise<ReleaseRecord> {
    return this.releases.getById(id);
  }

  @RequireRoles("RELEASE_APPROVER")
  @Post(":id/decision")
  public async decide(
    @Param("id") id: string,
    @Body() body: unknown,
    @Principal() principal: AuthenticatedPrincipal,
  ): Promise<ReleaseRecord> {
    return this.releases.decide(id, body, principal);
  }
}
