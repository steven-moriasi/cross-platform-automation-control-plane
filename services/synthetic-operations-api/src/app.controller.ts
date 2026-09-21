import type { ServiceHealth } from "@automation-control-plane/contracts";
import { Controller, Get } from "@nestjs/common";

import { getSyntheticApiMetadata, type SyntheticApiMetadata } from "./meta.js";

@Controller()
export class AppController {
  @Get("health/live")
  public liveness(): ServiceHealth {
    return {
      dependencies: [],
      service: "synthetic-operations-api",
      state: "healthy",
      timestamp: new Date().toISOString(),
      version: process.env.SERVICE_VERSION ?? "0.1.0",
    };
  }

  @Get("health/ready")
  public readiness(): ServiceHealth {
    return this.liveness();
  }

  @Get("api/v1/meta")
  public metadata(): SyntheticApiMetadata {
    return getSyntheticApiMetadata();
  }
}
