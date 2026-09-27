import { Injectable } from "@nestjs/common";
import {
  Counter,
  Histogram,
  Registry,
  collectDefaultMetrics,
} from "prom-client";

@Injectable()
export class MetricsService {
  private readonly registry = new Registry();
  private readonly requests = new Counter({
    help: "HTTP requests completed by the synthetic operations API.",
    labelNames: ["method", "route", "status_code"] as const,
    name: "synthetic_operations_http_requests_total",
    registers: [this.registry],
  });
  private readonly requestDuration = new Histogram({
    buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
    help: "Synthetic operations API request duration in seconds.",
    labelNames: ["method", "route", "status_code"] as const,
    name: "synthetic_operations_http_request_duration_seconds",
    registers: [this.registry],
  });

  public constructor() {
    this.registry.setDefaultLabels({
      service: "synthetic-operations-api",
      version: process.env.SERVICE_VERSION ?? "0.1.0",
    });
    collectDefaultMetrics({
      prefix: "synthetic_operations_",
      register: this.registry,
    });
  }

  public observeRequest(
    method: string,
    route: string,
    statusCode: number,
    durationSeconds: number,
  ): void {
    const labels = {
      method,
      route,
      status_code: statusCode.toString(),
    };
    this.requests.inc(labels);
    this.requestDuration.observe(labels, durationSeconds);
  }

  public render(): Promise<string> {
    return this.registry.metrics();
  }
}
