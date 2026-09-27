import type {
  AuthenticatedPrincipal,
  IncidentAction,
  IncidentHistoryRecord,
  IncidentRecord,
} from "@automation-control-plane/contracts";
import { Inject, Injectable } from "@nestjs/common";
import type { Pool, PoolClient } from "pg";

import { DATABASE_POOL } from "../database/database.constants.js";

interface IncidentRow {
  readonly acknowledged_at: Date | null;
  readonly assignee: string | null;
  readonly automation_id: string;
  readonly closed_at: Date | null;
  readonly correlation_key: string;
  readonly created_at: Date;
  readonly error_code: string;
  readonly failure_count: number;
  readonly first_occurred_at: Date;
  readonly id: string;
  readonly last_occurred_at: Date;
  readonly recovery_note: string | null;
  readonly resolved_at: Date | null;
  readonly severity: "CRITICAL" | "HIGH" | "LOW" | "MEDIUM";
  readonly status: "ACKNOWLEDGED" | "CLOSED" | "OPEN" | "RESOLVED";
  readonly updated_at: Date;
}

interface IncidentHistoryRow {
  readonly actor_display_name: string;
  readonly actor_subject: string;
  readonly created_at: Date;
  readonly event_type:
    | "ACKNOWLEDGED"
    | "ASSIGNED"
    | "CLOSED"
    | "FAILURE_CORRELATED"
    | "OPENED"
    | "RECOVERY_RECORDED"
    | "RESOLVED";
  readonly id: string;
  readonly incident_id: string;
  readonly note: string | null;
}

@Injectable()
export class IncidentRepository {
  public constructor(@Inject(DATABASE_POOL) private readonly pool: Pool) {}

  public async list(): Promise<readonly IncidentRecord[]> {
    const result = await this.pool.query<IncidentRow>(
      `
        select *
        from control_plane.incidents
        order by
          case severity
            when 'CRITICAL' then 1
            when 'HIGH' then 2
            when 'MEDIUM' then 3
            else 4
          end,
          last_occurred_at desc
        limit 100
      `,
    );
    return result.rows.map(mapIncident);
  }

  public async getById(id: string): Promise<IncidentRecord | undefined> {
    const result = await this.pool.query<IncidentRow>(
      `
        select *
        from control_plane.incidents
        where id = $1
      `,
      [id],
    );
    const row = result.rows[0];
    return row === undefined ? undefined : mapIncident(row);
  }

  public async history(
    incidentId: string,
  ): Promise<readonly IncidentHistoryRecord[]> {
    const result = await this.pool.query<IncidentHistoryRow>(
      `
        select
          id::text,
          incident_id::text,
          event_type,
          actor_subject,
          actor_display_name,
          note,
          created_at
        from control_plane.incident_history
        where incident_id = $1
        order by created_at, id
      `,
      [incidentId],
    );
    return result.rows.map((row) => ({
      actorDisplayName: row.actor_display_name,
      actorSubject: row.actor_subject,
      createdAt: row.created_at.toISOString(),
      eventType: row.event_type,
      id: row.id,
      incidentId: row.incident_id,
      ...(row.note === null ? {} : { note: row.note }),
    }));
  }

  public async applyAction(
    id: string,
    action: IncidentAction,
    principal: AuthenticatedPrincipal,
  ): Promise<IncidentRecord | undefined> {
    const client = await this.pool.connect();
    try {
      await client.query("begin");
      const updated = await this.updateIncident(client, id, action);
      if (updated === undefined) {
        await client.query("rollback");
        return undefined;
      }
      await client.query(
        `
          insert into control_plane.incident_history (
            incident_id,
            event_type,
            actor_subject,
            actor_display_name,
            note
          )
          values ($1, $2, $3, $4, $5)
        `,
        [
          id,
          historyEventType(action),
          principal.subject,
          principal.displayName,
          action.note,
        ],
      );
      await client.query("commit");
      return mapIncident(updated);
    } catch (error: unknown) {
      await client.query("rollback");
      throw error;
    } finally {
      client.release();
    }
  }

  private async updateIncident(
    client: PoolClient,
    id: string,
    action: IncidentAction,
  ): Promise<IncidentRow | undefined> {
    if (action.action === "ACKNOWLEDGE") {
      return this.update(
        client,
        `
          update control_plane.incidents
          set
            status = 'ACKNOWLEDGED',
            acknowledged_at = now(),
            updated_at = now()
          where id = $1 and status = 'OPEN'
          returning *
        `,
        [id],
      );
    }
    if (action.action === "ASSIGN") {
      return this.update(
        client,
        `
          update control_plane.incidents
          set assignee = $2, updated_at = now()
          where id = $1 and status in ('OPEN', 'ACKNOWLEDGED')
          returning *
        `,
        [id, action.assignee],
      );
    }
    if (action.action === "RECORD_RECOVERY") {
      return this.update(
        client,
        `
          update control_plane.incidents
          set recovery_note = $2, updated_at = now()
          where id = $1 and status in ('OPEN', 'ACKNOWLEDGED')
          returning *
        `,
        [id, action.note],
      );
    }
    if (action.action === "RESOLVE") {
      return this.update(
        client,
        `
          update control_plane.incidents
          set
            status = 'RESOLVED',
            recovery_note = $2,
            resolved_at = now(),
            updated_at = now()
          where id = $1 and status in ('OPEN', 'ACKNOWLEDGED')
          returning *
        `,
        [id, action.note],
      );
    }
    return this.update(
      client,
      `
        update control_plane.incidents
        set
          status = 'CLOSED',
          closed_at = now(),
          updated_at = now()
        where id = $1 and status = 'RESOLVED'
        returning *
      `,
      [id],
    );
  }

  private async update(
    client: PoolClient,
    query: string,
    values: readonly unknown[],
  ): Promise<IncidentRow | undefined> {
    const result = await client.query<IncidentRow>(query, [...values]);
    return result.rows[0];
  }
}

function historyEventType(
  action: IncidentAction,
): "ACKNOWLEDGED" | "ASSIGNED" | "CLOSED" | "RECOVERY_RECORDED" | "RESOLVED" {
  const values = {
    ACKNOWLEDGE: "ACKNOWLEDGED",
    ASSIGN: "ASSIGNED",
    CLOSE: "CLOSED",
    RECORD_RECOVERY: "RECOVERY_RECORDED",
    RESOLVE: "RESOLVED",
  } as const;
  return values[action.action];
}

function mapIncident(row: IncidentRow): IncidentRecord {
  return {
    ...(row.acknowledged_at === null
      ? {}
      : { acknowledgedAt: row.acknowledged_at.toISOString() }),
    ...(row.assignee === null ? {} : { assignee: row.assignee }),
    automationId: row.automation_id,
    ...(row.closed_at === null
      ? {}
      : { closedAt: row.closed_at.toISOString() }),
    correlationKey: row.correlation_key,
    createdAt: row.created_at.toISOString(),
    errorCode: row.error_code,
    failureCount: row.failure_count,
    firstOccurredAt: row.first_occurred_at.toISOString(),
    id: row.id,
    lastOccurredAt: row.last_occurred_at.toISOString(),
    ...(row.recovery_note === null ? {} : { recoveryNote: row.recovery_note }),
    ...(row.resolved_at === null
      ? {}
      : { resolvedAt: row.resolved_at.toISOString() }),
    severity: row.severity,
    status: row.status,
    updatedAt: row.updated_at.toISOString(),
  };
}
