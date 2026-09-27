import { Inject, Injectable } from "@nestjs/common";
import {
  Counter,
  Gauge,
  Histogram,
  Registry,
  collectDefaultMetrics,
} from "prom-client";
import type { Pool } from "pg";

import { ENVIRONMENT, type Environment } from "../config/environment.js";
import { DATABASE_POOL } from "../database/database.constants.js";

interface CountRow {
  readonly count: string;
}

interface ExecutionCountRow extends CountRow {
  readonly platform: string;
  readonly status: string;
}

interface IncidentCountRow extends CountRow {
  readonly severity: string;
  readonly status: string;
}

interface AutomationRow {
  readonly checksum_status: string;
  readonly id: string;
  readonly platform: string;
  readonly risk_tier: string;
}

interface WorkerHeartbeatRow {
  readonly age_seconds: number | null;
  readonly count: string;
}

@Injectable()
export class MetricsService {
  private readonly registry = new Registry();
  private readonly requests = new Counter({
    help: "HTTP requests completed by the control-plane API.",
    labelNames: ["method", "route", "status_code"] as const,
    name: "control_plane_http_requests_total",
    registers: [this.registry],
  });
  private readonly requestDuration = new Histogram({
    buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
    help: "Control-plane API request duration in seconds.",
    labelNames: ["method", "route", "status_code"] as const,
    name: "control_plane_http_request_duration_seconds",
    registers: [this.registry],
  });
  private readonly automationInfo = new Gauge({
    help: "Registered automation metadata and checksum state.",
    labelNames: [
      "automation_id",
      "platform",
      "risk_tier",
      "checksum_status",
    ] as const,
    name: "control_plane_automation_info",
    registers: [this.registry],
  });
  private readonly executions = new Gauge({
    help: "Current execution records by platform and status.",
    labelNames: ["platform", "status"] as const,
    name: "control_plane_executions",
    registers: [this.registry],
  });
  private readonly incidents = new Gauge({
    help: "Current incidents by severity and workflow status.",
    labelNames: ["severity", "status"] as const,
    name: "control_plane_incidents",
    registers: [this.registry],
  });
  private readonly proposedReleases = new Gauge({
    help: "Release proposals awaiting an independent decision.",
    name: "control_plane_releases_proposed",
    registers: [this.registry],
  });
  private readonly outboxPending = new Gauge({
    help: "Outbox messages waiting for worker processing.",
    name: "control_plane_outbox_pending",
    registers: [this.registry],
  });
  private readonly deadLetters = new Gauge({
    help: "Outbox messages moved to the dead-letter table.",
    name: "control_plane_outbox_dead_letters",
    registers: [this.registry],
  });
  private readonly evidenceExpired = new Gauge({
    help: "Evidence bundles past their declared retention time.",
    name: "control_plane_evidence_expired",
    registers: [this.registry],
  });
  private readonly evidenceExpiring = new Gauge({
    help: "Evidence bundles expiring within seven days.",
    name: "control_plane_evidence_expiring_soon",
    registers: [this.registry],
  });
  private readonly workerHeartbeatPresent = new Gauge({
    help: "Whether at least one control-plane worker heartbeat exists.",
    name: "control_plane_worker_heartbeat_present",
    registers: [this.registry],
  });
  private readonly workerHeartbeatAge = new Gauge({
    help: "Seconds since the newest control-plane worker heartbeat.",
    name: "control_plane_worker_heartbeat_age_seconds",
    registers: [this.registry],
  });

  public constructor(
    @Inject(DATABASE_POOL) private readonly pool: Pool,
    @Inject(ENVIRONMENT) environment: Environment,
  ) {
    this.registry.setDefaultLabels({
      service: "control-plane-api",
      version: environment.serviceVersion,
    });
    collectDefaultMetrics({
      prefix: "control_plane_",
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

  public async render(): Promise<string> {
    await this.refreshPortfolioMetrics();
    return this.registry.metrics();
  }

  private async refreshPortfolioMetrics(): Promise<void> {
    const [
      automations,
      executions,
      incidents,
      releases,
      pending,
      deadLetters,
      evidenceExpired,
      evidenceExpiring,
      worker,
    ] = await Promise.all([
      this.pool.query<AutomationRow>(
        "select id, platform, risk_tier, checksum_status from control_plane.automations order by id",
      ),
      this.pool.query<ExecutionCountRow>(
        "select platform, status, count(*)::text as count from control_plane.executions group by platform, status",
      ),
      this.pool.query<IncidentCountRow>(
        "select severity, status, count(*)::text as count from control_plane.incidents group by severity, status",
      ),
      this.pool.query<CountRow>(
        "select count(*)::text as count from control_plane.releases where status = 'PROPOSED'",
      ),
      this.pool.query<CountRow>(
        "select count(*)::text as count from control_plane.outbox_messages where processed_at is null",
      ),
      this.pool.query<CountRow>(
        "select count(*)::text as count from control_plane.outbox_dead_letters",
      ),
      this.pool.query<CountRow>(
        "select count(*)::text as count from control_plane.evidence_bundles where expires_at <= now()",
      ),
      this.pool.query<CountRow>(
        "select count(*)::text as count from control_plane.evidence_bundles where expires_at > now() and expires_at <= now() + interval '7 days'",
      ),
      this.pool.query<WorkerHeartbeatRow>(
        `
          select
            count(*)::text as count,
            extract(epoch from (now() - max(recorded_at)))::double precision as age_seconds
          from control_plane.service_heartbeats
          where service_name = 'control-plane-worker'
        `,
      ),
    ]);

    this.automationInfo.reset();
    for (const row of automations.rows) {
      this.automationInfo.set(
        {
          automation_id: row.id,
          checksum_status: row.checksum_status,
          platform: row.platform,
          risk_tier: row.risk_tier,
        },
        1,
      );
    }

    this.executions.reset();
    for (const row of executions.rows) {
      this.executions.set(
        { platform: row.platform, status: row.status },
        Number.parseInt(row.count, 10),
      );
    }

    this.incidents.reset();
    for (const row of incidents.rows) {
      this.incidents.set(
        { severity: row.severity, status: row.status },
        Number.parseInt(row.count, 10),
      );
    }

    this.proposedReleases.set(
      Number.parseInt(releases.rows[0]?.count ?? "0", 10),
    );
    this.outboxPending.set(Number.parseInt(pending.rows[0]?.count ?? "0", 10));
    this.deadLetters.set(
      Number.parseInt(deadLetters.rows[0]?.count ?? "0", 10),
    );
    this.evidenceExpired.set(
      Number.parseInt(evidenceExpired.rows[0]?.count ?? "0", 10),
    );
    this.evidenceExpiring.set(
      Number.parseInt(evidenceExpiring.rows[0]?.count ?? "0", 10),
    );

    const heartbeat = worker.rows[0];
    const heartbeatCount = Number.parseInt(heartbeat?.count ?? "0", 10);
    this.workerHeartbeatPresent.set(heartbeatCount > 0 ? 1 : 0);
    this.workerHeartbeatAge.set(heartbeat?.age_seconds ?? 0);
  }
}
