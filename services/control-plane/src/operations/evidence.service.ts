import { createHash, randomUUID } from "node:crypto";

import {
  evidenceBundleRequestSchema,
  type AuthenticatedPrincipal,
  type EvidenceBundleDocument,
  type EvidenceBundleRecord,
} from "@automation-control-plane/contracts";
import {
  BadRequestException,
  GoneException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";

import { EvidenceRepository } from "./evidence.repository.js";
import { IncidentService } from "./incident.service.js";
import { ReleaseService } from "./release.service.js";

@Injectable()
export class EvidenceService {
  public constructor(
    @Inject(EvidenceRepository)
    private readonly repository: EvidenceRepository,
    @Inject(IncidentService) private readonly incidents: IncidentService,
    @Inject(ReleaseService) private readonly releases: ReleaseService,
  ) {}

  public async create(
    value: unknown,
    principal: AuthenticatedPrincipal,
  ): Promise<EvidenceBundleRecord> {
    const parsed = evidenceBundleRequestSchema.safeParse(value);
    if (!parsed.success) {
      throw new BadRequestException(
        "The evidence request does not match the governance contract.",
      );
    }
    const request = parsed.data;
    if (new Date(request.expiresAt).getTime() <= Date.now()) {
      throw new BadRequestException("Evidence expiry must be in the future.");
    }

    let document: EvidenceBundleDocument;
    if (request.releaseId !== undefined) {
      document = await this.releaseDocument(request.releaseId);
    } else if (request.incidentId !== undefined) {
      document = await this.incidentDocument(request.incidentId);
    } else {
      throw new BadRequestException(
        "Exactly one release or incident must be selected.",
      );
    }
    const documentAutomationId =
      document.release?.automationId ?? document.incident?.record.automationId;
    if (documentAutomationId !== request.automationId) {
      throw new BadRequestException(
        "The evidence scope does not match the automation.",
      );
    }

    const id = randomUUID();
    const serialized = JSON.stringify(document);
    return this.repository.create({
      automationId: request.automationId,
      document,
      expiresAt: request.expiresAt,
      id,
      ...(request.incidentId === undefined
        ? {}
        : { incidentId: request.incidentId }),
      objectKey: `database/evidence/${id}.json`,
      principal,
      ...(request.releaseId === undefined
        ? {}
        : { releaseId: request.releaseId }),
      sha256: createHash("sha256").update(serialized).digest("hex"),
    });
  }

  public async list(): Promise<readonly EvidenceBundleRecord[]> {
    return this.repository.list();
  }

  public async download(id: string): Promise<EvidenceBundleDocument> {
    const bundle = await this.repository.getById(id);
    if (bundle === undefined) {
      throw new NotFoundException(`Evidence bundle ${id} was not found.`);
    }
    if (new Date(bundle.record.expiresAt).getTime() <= Date.now()) {
      throw new GoneException("The evidence bundle has expired.");
    }
    return bundle.document;
  }

  private async incidentDocument(id: string): Promise<EvidenceBundleDocument> {
    const [record, history] = await Promise.all([
      this.incidents.getById(id),
      this.incidents.history(id),
    ]);
    return {
      generatedAt: new Date().toISOString(),
      incident: { history, record },
      schemaVersion: "1.0",
    };
  }

  private async releaseDocument(id: string): Promise<EvidenceBundleDocument> {
    return {
      generatedAt: new Date().toISOString(),
      release: await this.releases.getById(id),
      schemaVersion: "1.0",
    };
  }
}
