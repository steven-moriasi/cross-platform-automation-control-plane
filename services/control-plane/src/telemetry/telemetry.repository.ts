import type {
  ExecutionEvent,
  TelemetryReceipt,
} from "@automation-control-plane/contracts";
import { Inject, Injectable } from "@nestjs/common";
import type { Pool, PoolClient } from "pg";

import { DATABASE_POOL } from "../database/database.constants.js";

interface AcceptedEventRow {
  readonly accepted_at: Date;
}

interface AutomationRegistrationRow {
  readonly platform: string;
  readonly target_registered: boolean;
}

@Injectable()
export class TelemetryRepository {
  public constructor(@Inject(DATABASE_POOL) private readonly pool: Pool) {}

  public async automationRegistration(
    event: ExecutionEvent,
  ): Promise<AutomationRegistrationRow | undefined> {
    const result = await this.pool.query<AutomationRegistrationRow>(
      `
        select
          platform,
          exists (
            select 1
            from jsonb_array_elements(targets) as target
            where target ->> 'environment' = $2
          ) as target_registered
        from control_plane.automations
        where id = $1
      `,
      [event.automation_id, event.environment],
    );
    return result.rows[0];
  }

  public async accept(
    event: ExecutionEvent,
    machineClientId: string,
  ): Promise<TelemetryReceipt> {
    const client = await this.pool.connect();
    try {
      await client.query("begin");
      const accepted = await this.insertEvent(client, event, machineClientId);

      if (accepted === undefined) {
        const existing = await client.query<AcceptedEventRow>(
          `
            select accepted_at
            from control_plane.execution_events
            where event_id = $1
          `,
          [event.event_id],
        );
        await client.query("commit");
        const acceptedAt = existing.rows[0]?.accepted_at;
        if (acceptedAt === undefined) {
          throw new Error("The replayed telemetry event could not be loaded.");
        }
        return {
          acceptedAt: acceptedAt.toISOString(),
          eventId: event.event_id,
          replayed: true,
        };
      }

      await this.updateExecution(client, event);
      await client.query(
        `
          insert into control_plane.outbox_messages (
            topic,
            aggregate_id,
            payload
          )
          values (
            'telemetry.execution.accepted',
            $1,
            $2::jsonb
          )
        `,
        [
          `${event.automation_id}:${event.environment}:${event.execution_id}`,
          JSON.stringify({
            automationId: event.automation_id,
            correlationId: event.correlation_id ?? event.execution_id,
            environment: event.environment,
            errorCode: event.error_code,
            eventId: event.event_id,
            executionId: event.execution_id,
            occurredAt: event.occurred_at,
            status: event.status,
          }),
        ],
      );
      await client.query("commit");

      return {
        acceptedAt: accepted.accepted_at.toISOString(),
        eventId: event.event_id,
        replayed: false,
      };
    } catch (error: unknown) {
      await client.query("rollback");
      throw error;
    } finally {
      client.release();
    }
  }

  private async insertEvent(
    client: PoolClient,
    event: ExecutionEvent,
    machineClientId: string,
  ): Promise<AcceptedEventRow | undefined> {
    const result = await client.query<AcceptedEventRow>(
      `
        insert into control_plane.execution_events (
          event_id,
          schema_version,
          automation_id,
          release_version,
          platform,
          environment,
          execution_id,
          status,
          occurred_at,
          duration_ms,
          error_code,
          correlation_id,
          machine_client_id
        )
        values (
          $1,
          $2,
          $3,
          $4,
          $5,
          $6,
          $7,
          $8,
          $9,
          $10,
          $11,
          $12,
          $13
        )
        on conflict (event_id) do nothing
        returning accepted_at
      `,
      [
        event.event_id,
        event.schema_version,
        event.automation_id,
        event.release_version,
        event.platform,
        event.environment,
        event.execution_id,
        event.status,
        event.occurred_at,
        event.duration_ms ?? null,
        event.error_code ?? null,
        event.correlation_id ?? null,
        machineClientId,
      ],
    );
    return result.rows[0];
  }

  private async updateExecution(
    client: PoolClient,
    event: ExecutionEvent,
  ): Promise<void> {
    await client.query(
      `
        insert into control_plane.executions (
          automation_id,
          environment,
          execution_id,
          release_version,
          platform,
          status,
          first_occurred_at,
          latest_occurred_at,
          duration_ms,
          error_code,
          correlation_id
        )
        values (
          $1,
          $2,
          $3,
          $4,
          $5,
          $6,
          $7,
          $7,
          $8,
          $9,
          $10
        )
        on conflict (automation_id, environment, execution_id)
        do update set
          first_occurred_at = least(
            control_plane.executions.first_occurred_at,
            excluded.first_occurred_at
          ),
          latest_occurred_at = greatest(
            control_plane.executions.latest_occurred_at,
            excluded.latest_occurred_at
          ),
          status = case
            when control_plane.executions.status = 'STARTED'
              and excluded.status <> 'STARTED'
            then excluded.status
            else control_plane.executions.status
          end,
          duration_ms = case
            when control_plane.executions.status = 'STARTED'
              and excluded.status <> 'STARTED'
            then excluded.duration_ms
            else control_plane.executions.duration_ms
          end,
          error_code = case
            when control_plane.executions.status = 'STARTED'
              and excluded.status <> 'STARTED'
            then excluded.error_code
            else control_plane.executions.error_code
          end,
          correlation_id = coalesce(
            control_plane.executions.correlation_id,
            excluded.correlation_id
          ),
          event_count = control_plane.executions.event_count + 1,
          updated_at = now()
      `,
      [
        event.automation_id,
        event.environment,
        event.execution_id,
        event.release_version,
        event.platform,
        event.status,
        event.occurred_at,
        event.duration_ms ?? null,
        event.error_code ?? null,
        event.correlation_id ?? null,
      ],
    );
  }
}
