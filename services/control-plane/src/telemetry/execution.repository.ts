import type { ExecutionRecord } from "@automation-control-plane/contracts";
import { Inject, Injectable } from "@nestjs/common";
import type { Pool } from "pg";

import { DATABASE_POOL } from "../database/database.constants.js";

interface ExecutionRow {
  readonly automation_id: string;
  readonly correlation_id: string | null;
  readonly duration_ms: number | null;
  readonly environment: "demo" | "production" | "staging";
  readonly error_code: string | null;
  readonly event_count: number;
  readonly execution_id: string;
  readonly first_occurred_at: Date;
  readonly latest_occurred_at: Date;
  readonly platform: "make" | "n8n" | "power-platform" | "zapier";
  readonly release_version: string;
  readonly status: "FAILED" | "STARTED" | "SUCCEEDED" | "TIMED_OUT";
}

@Injectable()
export class ExecutionRepository {
  public constructor(@Inject(DATABASE_POOL) private readonly pool: Pool) {}

  public async list(): Promise<readonly ExecutionRecord[]> {
    const result = await this.pool.query<ExecutionRow>(
      `
        select *
        from control_plane.executions
        order by latest_occurred_at desc
        limit 100
      `,
    );
    return result.rows.map((row) => ({
      automationId: row.automation_id,
      ...(row.correlation_id === null
        ? {}
        : { correlationId: row.correlation_id }),
      ...(row.duration_ms === null
        ? {}
        : { durationMilliseconds: row.duration_ms }),
      environment: row.environment,
      ...(row.error_code === null ? {} : { errorCode: row.error_code }),
      eventCount: row.event_count,
      executionId: row.execution_id,
      firstOccurredAt: row.first_occurred_at.toISOString(),
      latestOccurredAt: row.latest_occurred_at.toISOString(),
      platform: row.platform,
      releaseVersion: row.release_version,
      status: row.status,
    }));
  }
}
