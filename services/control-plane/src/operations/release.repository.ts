import {
  configurationChangeSchema,
  type AuthenticatedPrincipal,
  type ReleaseProposal,
  type ReleaseRecord,
} from "@automation-control-plane/contracts";
import { Inject, Injectable } from "@nestjs/common";
import type { Pool, PoolClient } from "pg";

import { DATABASE_POOL } from "../database/database.constants.js";

interface ReleasePolicyRow {
  readonly manifest_version: string;
  readonly observed_source_checksum: string;
  readonly risk_tier: "CRITICAL" | "HIGH" | "LOW" | "MEDIUM";
  readonly target_registered: boolean;
}

interface ReleaseRow {
  readonly approver_display_name: string | null;
  readonly approver_subject: string | null;
  readonly artifact_checksum: string;
  readonly automation_id: string;
  readonly configuration_changes: unknown;
  readonly decided_at: Date | null;
  readonly decision_rationale: string | null;
  readonly evidence_expires_at: Date;
  readonly id: string;
  readonly manifest_version: string;
  readonly proposed_at: Date;
  readonly proposer_display_name: string;
  readonly proposer_subject: string;
  readonly provider_deployment_reference: string | null;
  readonly rollback_instructions: string;
  readonly source_commit: string;
  readonly status: "APPROVED" | "PROPOSED" | "REJECTED";
  readonly target_environment: "demo" | "production" | "staging";
  readonly version: string;
}

@Injectable()
export class ReleaseRepository {
  public constructor(@Inject(DATABASE_POOL) private readonly pool: Pool) {}

  public async policy(
    automationId: string,
    environment: string,
  ): Promise<ReleasePolicyRow | undefined> {
    const result = await this.pool.query<ReleasePolicyRow>(
      `
        select
          manifest_version,
          observed_source_checksum,
          risk_tier,
          exists (
            select 1
            from jsonb_array_elements(targets) as target
            where target ->> 'environment' = $2
          ) as target_registered
        from control_plane.automations
        where id = $1
      `,
      [automationId, environment],
    );
    return result.rows[0];
  }

  public async create(
    id: string,
    proposal: ReleaseProposal,
    principal: AuthenticatedPrincipal,
  ): Promise<ReleaseRecord> {
    const client = await this.pool.connect();
    try {
      await client.query("begin");
      const result = await client.query<ReleaseRow>(
        `
          insert into control_plane.releases (
            id,
            automation_id,
            version,
            manifest_version,
            target_environment,
            source_commit,
            artifact_checksum,
            configuration_changes,
            provider_deployment_reference,
            rollback_instructions,
            evidence_expires_at,
            proposer_subject,
            proposer_display_name
          )
          values (
            $1,
            $2,
            $3,
            $4,
            $5,
            $6,
            $7,
            $8::jsonb,
            $9,
            $10,
            $11,
            $12,
            $13
          )
          returning *
        `,
        [
          id,
          proposal.automationId,
          proposal.version,
          proposal.manifestVersion,
          proposal.targetEnvironment,
          proposal.sourceCommit,
          proposal.artifactChecksum,
          JSON.stringify(proposal.configurationChanges),
          proposal.providerDeploymentReference ?? null,
          proposal.rollbackInstructions,
          proposal.evidenceExpiresAt,
          principal.subject,
          principal.displayName,
        ],
      );
      await this.insertHistory(
        client,
        id,
        "PROPOSED",
        principal,
        "Release proposal recorded.",
      );
      await client.query("commit");
      return mapRelease(result.rows[0]!);
    } catch (error: unknown) {
      await client.query("rollback");
      throw error;
    } finally {
      client.release();
    }
  }

  public async list(): Promise<readonly ReleaseRecord[]> {
    const result = await this.pool.query<ReleaseRow>(
      `
        select *
        from control_plane.releases
        order by proposed_at desc
        limit 100
      `,
    );
    return result.rows.map(mapRelease);
  }

  public async getById(id: string): Promise<ReleaseRecord | undefined> {
    const result = await this.pool.query<ReleaseRow>(
      `
        select *
        from control_plane.releases
        where id = $1
      `,
      [id],
    );
    const row = result.rows[0];
    return row === undefined ? undefined : mapRelease(row);
  }

  public async decide(
    id: string,
    status: "APPROVED" | "REJECTED",
    rationale: string,
    principal: AuthenticatedPrincipal,
  ): Promise<ReleaseRecord | undefined> {
    const client = await this.pool.connect();
    try {
      await client.query("begin");
      const result = await client.query<ReleaseRow>(
        `
          update control_plane.releases
          set
            status = $2,
            decided_at = now(),
            approver_subject = $3,
            approver_display_name = $4,
            decision_rationale = $5
          where id = $1
            and status = 'PROPOSED'
          returning *
        `,
        [id, status, principal.subject, principal.displayName, rationale],
      );
      const release = result.rows[0];
      if (release === undefined) {
        await client.query("rollback");
        return undefined;
      }
      await this.insertHistory(client, id, status, principal, rationale);
      await client.query("commit");
      return mapRelease(release);
    } catch (error: unknown) {
      await client.query("rollback");
      throw error;
    } finally {
      client.release();
    }
  }

  private async insertHistory(
    client: PoolClient,
    releaseId: string,
    eventType: "APPROVED" | "PROPOSED" | "REJECTED",
    principal: AuthenticatedPrincipal,
    rationale: string,
  ): Promise<void> {
    await client.query(
      `
        insert into control_plane.release_history (
          release_id,
          event_type,
          actor_subject,
          actor_display_name,
          rationale
        )
        values ($1, $2, $3, $4, $5)
      `,
      [
        releaseId,
        eventType,
        principal.subject,
        principal.displayName,
        rationale,
      ],
    );
  }
}

function mapRelease(row: ReleaseRow): ReleaseRecord {
  return {
    ...(row.approver_display_name === null
      ? {}
      : { approverDisplayName: row.approver_display_name }),
    ...(row.approver_subject === null
      ? {}
      : { approverSubject: row.approver_subject }),
    artifactChecksum: row.artifact_checksum,
    automationId: row.automation_id,
    configurationChanges: configurationChangeSchema
      .array()
      .parse(row.configuration_changes),
    ...(row.decided_at === null
      ? {}
      : { decidedAt: row.decided_at.toISOString() }),
    ...(row.decision_rationale === null
      ? {}
      : { decisionRationale: row.decision_rationale }),
    evidenceExpiresAt: row.evidence_expires_at.toISOString(),
    id: row.id,
    manifestVersion: row.manifest_version,
    proposedAt: row.proposed_at.toISOString(),
    proposerDisplayName: row.proposer_display_name,
    proposerSubject: row.proposer_subject,
    ...(row.provider_deployment_reference === null
      ? {}
      : {
          providerDeploymentReference: row.provider_deployment_reference,
        }),
    rollbackInstructions: row.rollback_instructions,
    sourceCommit: row.source_commit,
    status: row.status,
    targetEnvironment: row.target_environment,
    version: row.version,
  };
}
