import { Inject, Injectable } from "@nestjs/common";
import type { OnApplicationShutdown } from "@nestjs/common";
import type { Pool } from "pg";

import { DATABASE_POOL } from "./database.constants.js";

@Injectable()
export class DatabaseService implements OnApplicationShutdown {
  public constructor(@Inject(DATABASE_POOL) private readonly pool: Pool) {}

  public async checkHealth(): Promise<number> {
    const startedAt = performance.now();
    await this.pool.query("select 1");
    return Math.round(performance.now() - startedAt);
  }

  public async recordWorkerHeartbeat(workerId: string): Promise<void> {
    await this.pool.query(
      `
        insert into control_plane.service_heartbeats (service_name, instance_id, recorded_at)
        values ('control-plane-worker', $1, now())
        on conflict (service_name, instance_id)
        do update set recorded_at = excluded.recorded_at
      `,
      [workerId],
    );
  }

  public async onApplicationShutdown(): Promise<void> {
    await this.pool.end();
  }
}
