import type { ExecutionRecord } from "@automation-control-plane/contracts";
import { Controller, Get, Inject } from "@nestjs/common";

import { RequireRoles } from "../auth/auth.decorators.js";
import { ExecutionRepository } from "./execution.repository.js";

@RequireRoles("OPERATOR", "AUDITOR", "AUTOMATION_OWNER")
@Controller("executions")
export class ExecutionController {
  public constructor(
    @Inject(ExecutionRepository)
    private readonly executions: ExecutionRepository,
  ) {}

  @Get()
  public async list(): Promise<readonly ExecutionRecord[]> {
    return this.executions.list();
  }
}
