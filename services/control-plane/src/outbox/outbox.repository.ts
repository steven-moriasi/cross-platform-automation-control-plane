import { randomUUID } from "node:crypto";

import { Inject, Injectable } from "@nestjs/common";
import type { Pool, PoolClient } from "pg";

import { DATABASE_POOL } from "../database/database.constants.js";

export interface LeasedOutboxMessage {
  readonly aggregateId: string;
  readonly attempts: number;
  readonly id: string;
  readonly maxAttempts: number;
  readonly payload: unknown;
  readonly topic: string;
}

interface OutboxRow {
  readonly aggregate_id: string;
  readonly attempts: number;
  readonly id: string;
  readonly max_attempts: number;
  readonly payload: unknown;
  readonly topic: string;
}

interface IncidentRow {
  readonly id: string;
}

@Injectable()
export class OutboxRepository {
  public constructor(@Inject(DATABASE_POOL) private readonly pool: Pool) {}

  public async lease(
    instanceId: string,
  ): Promise<LeasedOutboxMessage | undefined> {
    const result = await this.pool.query<OutboxRow>(
      `
        update control_plane.outbox_messages
        set
          attempts = attempts + 1,
          leased_by = $1,
          lease_expires_at = now() + interval '30 seconds'
        where id = (
          select id
          from control_plane.outbox_messages
          where processed_at is null
            and available_at <= now()
            and attempts < max_attempts
            and (
              lease_expires_at is null
              or lease_expires_at < now()
            )
          order by available_at, id
          for update skip locked
          limit 1
        )
        returning
          id::text,
          topic,
          aggregate_id,
          payload,
          attempts,
          max_attempts
      `,
      [instanceId],
    );
    const row = result.rows[0];
    return row === undefined
      ? undefined
      : {
          aggregateId: row.aggregate_id,
          attempts: row.attempts,
          id: row.id,
          maxAttempts: row.max_attempts,
          payload: row.payload,
          topic: row.topic,
        };
  }

  public async complete(id: string, instanceId: string): Promise<void> {
    await this.pool.query(
      `
        update control_plane.outbox_messages
        set
          processed_at = now(),
          leased_by = null,
          lease_expires_at = null
        where id = $1
          and leased_by = $2
      `,
      [id, instanceId],
    );
  }

  public async fail(
    message: LeasedOutboxMessage,
    instanceId: string,
    error: string,
  ): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query("begin");
      if (message.attempts >= message.maxAttempts) {
        await client.query(
          `
            insert into control_plane.outbox_dead_letters (
              outbox_message_id,
              topic,
              aggregate_id,
              payload,
              attempts,
              last_error
            )
            select
              id,
              topic,
              aggregate_id,
              payload,
              attempts,
              $3
            from control_plane.outbox_messages
            where id = $1
              and leased_by = $2
            on conflict (outbox_message_id) do nothing
          `,
          [message.id, instanceId, error],
        );
        await client.query(
          `
            update control_plane.outbox_messages
            set
              processed_at = now(),
              last_error = $3,
              leased_by = null,
              lease_expires_at = null
            where id = $1
              and leased_by = $2
          `,
          [message.id, instanceId, error],
        );
      } else {
        await client.query(
          `
            update control_plane.outbox_messages
            set
              available_at = now() + ($3 * interval '1 second'),
              last_error = $4,
              leased_by = null,
              lease_expires_at = null
            where id = $1
              and leased_by = $2
          `,
          [message.id, instanceId, retryDelaySeconds(message.attempts), error],
        );
      }
      await client.query("commit");
    } catch (failure: unknown) {
      await client.query("rollback");
      throw failure;
    } finally {
      client.release();
    }
  }

  public async correlateFailure(input: {
    readonly automationId: string;
    readonly correlationKey: string;
    readonly errorCode: string;
    readonly occurredAt: string;
  }): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query("begin");
      const existing = await client.query<IncidentRow>(
        `
          select id::text
          from control_plane.incidents
          where automation_id = $1
            and correlation_key = $2
            and error_code = $3
            and status in ('OPEN', 'ACKNOWLEDGED')
          for update
        `,
        [input.automationId, input.correlationKey, input.errorCode],
      );
      const incidentId = existing.rows[0]?.id;

      if (incidentId === undefined) {
        const id = randomUUID();
        await client.query(
          `
            insert into control_plane.incidents (
              id,
              automation_id,
              correlation_key,
              error_code,
              severity,
              first_occurred_at,
              last_occurred_at
            )
            select
              $1,
              automation.id,
              $2,
              $3,
              automation.risk_tier,
              $4,
              $4
            from control_plane.automations as automation
            where automation.id = $5
          `,
          [
            id,
            input.correlationKey,
            input.errorCode,
            input.occurredAt,
            input.automationId,
          ],
        );
        await this.insertIncidentHistory(
          client,
          id,
          "OPENED",
          `Failure ${input.errorCode} opened an incident.`,
        );
      } else {
        await client.query(
          `
            update control_plane.incidents
            set
              failure_count = failure_count + 1,
              last_occurred_at = greatest(last_occurred_at, $2),
              updated_at = now()
            where id = $1
          `,
          [incidentId, input.occurredAt],
        );
        await this.insertIncidentHistory(
          client,
          incidentId,
          "FAILURE_CORRELATED",
          `Repeated failure ${input.errorCode} was correlated.`,
        );
      }
      await client.query("commit");
    } catch (error: unknown) {
      await client.query("rollback");
      throw error;
    } finally {
      client.release();
    }
  }

  private async insertIncidentHistory(
    client: PoolClient,
    incidentId: string,
    eventType: "FAILURE_CORRELATED" | "OPENED",
    note: string,
  ): Promise<void> {
    await client.query(
      `
        insert into control_plane.incident_history (
          incident_id,
          event_type,
          actor_subject,
          actor_display_name,
          note
        )
        values ($1, $2, 'control-plane-worker', 'Control plane worker', $3)
      `,
      [incidentId, eventType, note],
    );
  }
}

export function retryDelaySeconds(attempts: number): number {
  return Math.min(2 ** Math.max(0, attempts - 1), 60);
}
