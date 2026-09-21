import type { ServiceHealth } from "@automation-control-plane/contracts";
import {
  Controller,
  Get,
  Inject,
  ServiceUnavailableException,
} from "@nestjs/common";

import { AllowAnonymous } from "../auth/auth.decorators.js";
import { HealthService } from "./health.service.js";

@AllowAnonymous()
@Controller("health")
export class HealthController {
  public constructor(
    @Inject(HealthService) private readonly health: HealthService,
  ) {}

  @Get("live")
  public liveness(): ServiceHealth {
    return this.health.liveness();
  }

  @Get("ready")
  public async readiness(): Promise<ServiceHealth> {
    const status = await this.health.readiness();
    if (status.state === "degraded") {
      throw new ServiceUnavailableException(status);
    }
    return status;
  }
}
