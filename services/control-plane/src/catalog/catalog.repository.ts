import type {
  AutomationManifest,
  CatalogAuditRecord,
  CatalogAutomation,
  ChecksumStatus,
} from "@automation-control-plane/contracts";
import { Inject, Injectable } from "@nestjs/common";
import type { Pool, PoolClient } from "pg";

import { DATABASE_POOL } from "../database/database.constants.js";
import type { LoadedCatalogAutomation } from "./catalog.types.js";

interface AutomationRow {
  readonly checksum_status: ChecksumStatus;
  readonly manifest_document: AutomationManifest;
  readonly observed_source_checksum: string;
  readonly synchronized_at: Date;
}

interface ExistingChecksumRow {
  readonly observed_source_checksum: string;
}

interface AuditRow {
  readonly automation_id: string;
  readonly current_source_checksum: string;
  readonly event_type: "REGISTERED" | "SOURCE_CHECKSUM_CHANGED";
  readonly id: string;
  readonly manifest_checksum: string;
  readonly previous_source_checksum: string | null;
  readonly recorded_at: Date;
}

function toCatalogAutomation(row: AutomationRow): CatalogAutomation {
  return {
    ...row.manifest_document,
    checksumStatus: row.checksum_status,
    observedSourceChecksum: row.observed_source_checksum,
    synchronizedAt: row.synchronized_at.toISOString(),
  };
}

function toAuditRecord(row: AuditRow): CatalogAuditRecord {
  return {
    automationId: row.automation_id,
    currentSourceChecksum: row.current_source_checksum,
    eventType: row.event_type,
    id: row.id,
    manifestChecksum: row.manifest_checksum,
    ...(row.previous_source_checksum === null
      ? {}
      : { previousSourceChecksum: row.previous_source_checksum }),
    recordedAt: row.recorded_at.toISOString(),
  };
}

@Injectable()
export class CatalogRepository {
  public constructor(@Inject(DATABASE_POOL) private readonly pool: Pool) {}

  public async synchronize(
    catalog: readonly LoadedCatalogAutomation[],
  ): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query("begin");
      for (const automation of catalog) {
        await this.synchronizeAutomation(client, automation);
      }
      await client.query("commit");
    } catch (error: unknown) {
      await client.query("rollback");
      throw error;
    } finally {
      client.release();
    }
  }

  private async synchronizeAutomation(
    client: PoolClient,
    automation: LoadedCatalogAutomation,
  ): Promise<void> {
    const existing = await client.query<ExistingChecksumRow>(
      `
        select observed_source_checksum
        from control_plane.automations
        where id = $1
        for update
      `,
      [automation.manifest.id],
    );
    const previousSourceChecksum = existing.rows[0]?.observed_source_checksum;
    const manifest = automation.manifest;

    await client.query(
      `
        insert into control_plane.automations (
          id,
          schema_version,
          manifest_version,
          display_name,
          platform,
          native_artifact_path,
          declared_source_checksum,
          observed_source_checksum,
          manifest_checksum,
          checksum_status,
          owner_email,
          support_group,
          business_capability,
          risk_tier,
          data_classification,
          trigger_type,
          expected_sla_seconds,
          alert_after_seconds,
          dependencies,
          targets,
          runbook_path,
          recovery_path,
          credential_references,
          manifest_document
        )
        values (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12,
          $13, $14, $15, $16, $17, $18, $19::jsonb, $20::jsonb,
          $21, $22, $23::jsonb, $24::jsonb
        )
        on conflict (id) do update set
          schema_version = excluded.schema_version,
          manifest_version = excluded.manifest_version,
          display_name = excluded.display_name,
          platform = excluded.platform,
          native_artifact_path = excluded.native_artifact_path,
          declared_source_checksum = excluded.declared_source_checksum,
          observed_source_checksum = excluded.observed_source_checksum,
          manifest_checksum = excluded.manifest_checksum,
          checksum_status = excluded.checksum_status,
          owner_email = excluded.owner_email,
          support_group = excluded.support_group,
          business_capability = excluded.business_capability,
          risk_tier = excluded.risk_tier,
          data_classification = excluded.data_classification,
          trigger_type = excluded.trigger_type,
          expected_sla_seconds = excluded.expected_sla_seconds,
          alert_after_seconds = excluded.alert_after_seconds,
          dependencies = excluded.dependencies,
          targets = excluded.targets,
          runbook_path = excluded.runbook_path,
          recovery_path = excluded.recovery_path,
          credential_references = excluded.credential_references,
          manifest_document = excluded.manifest_document,
          synchronized_at = now()
      `,
      [
        manifest.id,
        manifest.schemaVersion,
        manifest.manifestVersion,
        manifest.displayName,
        manifest.platform,
        manifest.nativeArtifactPath,
        manifest.sourceChecksum,
        automation.observedSourceChecksum,
        automation.manifestChecksum,
        automation.checksumStatus,
        manifest.owner.email,
        manifest.owner.supportGroup,
        manifest.businessCapability,
        manifest.riskTier,
        manifest.dataClassification,
        manifest.trigger.type,
        manifest.trigger.expectedSlaSeconds,
        manifest.trigger.alertAfterSeconds,
        JSON.stringify(manifest.dependencies),
        JSON.stringify(manifest.targets),
        manifest.runbookPath,
        manifest.recoveryPath,
        JSON.stringify(manifest.credentialReferences),
        JSON.stringify(manifest),
      ],
    );

    if (
      previousSourceChecksum === undefined ||
      previousSourceChecksum !== automation.observedSourceChecksum
    ) {
      await client.query(
        `
          insert into control_plane.automation_catalog_audit (
            automation_id,
            event_type,
            previous_source_checksum,
            current_source_checksum,
            manifest_checksum
          )
          values ($1, $2, $3, $4, $5)
        `,
        [
          manifest.id,
          previousSourceChecksum === undefined
            ? "REGISTERED"
            : "SOURCE_CHECKSUM_CHANGED",
          previousSourceChecksum ?? null,
          automation.observedSourceChecksum,
          automation.manifestChecksum,
        ],
      );
    }
  }

  public async list(): Promise<readonly CatalogAutomation[]> {
    const result = await this.pool.query<AutomationRow>(`
      select
        manifest_document,
        checksum_status,
        observed_source_checksum,
        synchronized_at
      from control_plane.automations
      order by display_name
    `);
    return result.rows.map(toCatalogAutomation);
  }

  public async findById(id: string): Promise<CatalogAutomation | undefined> {
    const result = await this.pool.query<AutomationRow>(
      `
        select
          manifest_document,
          checksum_status,
          observed_source_checksum,
          synchronized_at
        from control_plane.automations
        where id = $1
      `,
      [id],
    );
    const row = result.rows[0];
    return row === undefined ? undefined : toCatalogAutomation(row);
  }

  public async listAudit(
    automationId: string,
  ): Promise<readonly CatalogAuditRecord[]> {
    const result = await this.pool.query<AuditRow>(
      `
        select
          id::text,
          automation_id,
          event_type,
          previous_source_checksum,
          current_source_checksum,
          manifest_checksum,
          recorded_at
        from control_plane.automation_catalog_audit
        where automation_id = $1
        order by recorded_at desc, id desc
      `,
      [automationId],
    );
    return result.rows.map(toAuditRecord);
  }
}
