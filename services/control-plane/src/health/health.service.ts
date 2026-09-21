import type { ServiceHealth } from "@automation-control-plane/contracts";
import { Inject, Injectable } from "@nestjs/common";

import { ENVIRONMENT, type Environment } from "../config/environment.js";
import { DatabaseService } from "../database/database.service.js";

@Injectable()
export class HealthService {
  public constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
    @Inject(ENVIRONMENT) private readonly environment: Environment,
  ) {}

  public liveness(): ServiceHealth {
    return {
      dependencies: [],
      service: "control-plane-api",
      state: "healthy",
      timestamp: new Date().toISOString(),
      version: this.environment.serviceVersion,
    };
  }

  public async readiness(): Promise<ServiceHealth> {
    try {
      const latencyMilliseconds = await this.database.checkHealth();
      return {
        dependencies: [
          {
            latencyMilliseconds,
            name: "postgres",
            state: "healthy",
          },
        ],
        service: "control-plane-api",
        state: "healthy",
        timestamp: new Date().toISOString(),
        version: this.environment.serviceVersion,
      };
    } catch {
      return {
        dependencies: [{ name: "postgres", state: "degraded" }],
        service: "control-plane-api",
        state: "degraded",
        timestamp: new Date().toISOString(),
        version: this.environment.serviceVersion,
      };
    }
  }
}
