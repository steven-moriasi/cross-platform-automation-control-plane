import type {
  AuthenticatedPrincipal,
  EvidenceBundleDocument,
  EvidenceBundleRecord,
} from "@automation-control-plane/contracts";
import { Inject, Injectable } from "@nestjs/common";
import type { Pool } from "pg";

import { DATABASE_POOL } from "../database/database.constants.js";

interface EvidenceRow {
  readonly automation_id: string;
  readonly created_at: Date;
  readonly created_by_display_name: string;
  readonly created_by_subject: string;
  readonly document: EvidenceBundleDocument;
  readonly expires_at: Date;
  readonly id: string;
  readonly incident_id: string | null;
  readonly object_key: string;
  readonly release_id: string | null;
  readonly sha256: string;
}

export interface StoredEvidenceBundle {
  readonly document: EvidenceBundleDocument;
  readonly record: EvidenceBundleRecord;
}

@Injectable()
export class EvidenceRepository {
  public constructor(@Inject(DATABASE_POOL) private readonly pool: Pool) {}

  public async create(input: {
    readonly automationId: string;
    readonly document: EvidenceBundleDocument;
    readonly expiresAt: string;
    readonly id: string;
    readonly incidentId?: string;
    readonly objectKey: string;
    readonly principal: AuthenticatedPrincipal;
    readonly releaseId?: string;
    readonly sha256: string;
  }): Promise<EvidenceBundleRecord> {
    const result = await this.pool.query<EvidenceRow>(
      `
        insert into control_plane.evidence_bundles (
          id,
          automation_id,
          release_id,
          incident_id,
          object_key,
          sha256,
          expires_at,
          created_by_subject,
          created_by_display_name,
          document
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
          $10::jsonb
        )
        returning *
      `,
      [
        input.id,
        input.automationId,
        input.releaseId ?? null,
        input.incidentId ?? null,
        input.objectKey,
        input.sha256,
        input.expiresAt,
        input.principal.subject,
        input.principal.displayName,
        JSON.stringify(input.document),
      ],
    );
    return mapEvidence(result.rows[0]!);
  }

  public async list(): Promise<readonly EvidenceBundleRecord[]> {
    const result = await this.pool.query<EvidenceRow>(
      `
        select *
        from control_plane.evidence_bundles
        order by created_at desc
        limit 100
      `,
    );
    return result.rows.map(mapEvidence);
  }

  public async getById(id: string): Promise<StoredEvidenceBundle | undefined> {
    const result = await this.pool.query<EvidenceRow>(
      `
        select *
        from control_plane.evidence_bundles
        where id = $1
      `,
      [id],
    );
    const row = result.rows[0];
    return row === undefined
      ? undefined
      : { document: row.document, record: mapEvidence(row) };
  }
}

function mapEvidence(row: EvidenceRow): EvidenceBundleRecord {
  return {
    automationId: row.automation_id,
    createdAt: row.created_at.toISOString(),
    createdByDisplayName: row.created_by_display_name,
    createdBySubject: row.created_by_subject,
    expiresAt: row.expires_at.toISOString(),
    id: row.id,
    ...(row.incident_id === null ? {} : { incidentId: row.incident_id }),
    objectKey: row.object_key,
    ...(row.release_id === null ? {} : { releaseId: row.release_id }),
    sha256: row.sha256,
  };
}
