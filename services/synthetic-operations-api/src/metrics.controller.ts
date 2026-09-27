import { Controller, Get, Header, Inject } from "@nestjs/common";

import { MetricsService } from "./metrics.service.js";

@Controller()
export class MetricsController {
  public constructor(
    @Inject(MetricsService) private readonly metrics: MetricsService,
  ) {}

  @Get("metrics")
  @Header("cache-control", "no-store")
  @Header("content-type", "text/plain; version=0.0.4; charset=utf-8")
  public render(): Promise<string> {
    return this.metrics.render();
  }
}
