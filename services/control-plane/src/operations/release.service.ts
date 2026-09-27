import { randomUUID } from "node:crypto";

import {
  releaseDecisionSchema,
  releaseProposalSchema,
  type AuthenticatedPrincipal,
  type ReleaseRecord,
} from "@automation-control-plane/contracts";
import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";

import { requiresIndependentApproval } from "./operations-policy.js";
import { ReleaseRepository } from "./release.repository.js";

@Injectable()
export class ReleaseService {
  public constructor(
    @Inject(ReleaseRepository)
    private readonly repository: ReleaseRepository,
  ) {}

  public async propose(
    value: unknown,
    principal: AuthenticatedPrincipal,
  ): Promise<ReleaseRecord> {
    const parsed = releaseProposalSchema.safeParse(value);
    if (!parsed.success) {
      throw new BadRequestException(
        "The release proposal does not match the governance contract.",
      );
    }
    const proposal = parsed.data;
    const policy = await this.repository.policy(
      proposal.automationId,
      proposal.targetEnvironment,
    );
    if (policy === undefined) {
      throw new NotFoundException(
        `Automation ${proposal.automationId} is not registered.`,
      );
    }
    if (!policy.target_registered) {
      throw new BadRequestException(
        "The target environment is not registered for this automation.",
      );
    }
    if (
      proposal.manifestVersion !== policy.manifest_version ||
      proposal.artifactChecksum !== policy.observed_source_checksum
    ) {
      throw new ConflictException(
        "The proposal does not match the registered manifest and artifact.",
      );
    }
    if (new Date(proposal.evidenceExpiresAt).getTime() <= Date.now()) {
      throw new BadRequestException(
        "Release evidence must expire in the future.",
      );
    }

    try {
      return await this.repository.create(randomUUID(), proposal, principal);
    } catch (error: unknown) {
      if (isUniqueViolation(error)) {
        throw new ConflictException(
          "This automation version already has a proposal for the target.",
        );
      }
      throw error;
    }
  }

  public async list(): Promise<readonly ReleaseRecord[]> {
    return this.repository.list();
  }

  public async getById(id: string): Promise<ReleaseRecord> {
    const release = await this.repository.getById(id);
    if (release === undefined) {
      throw new NotFoundException(`Release ${id} was not found.`);
    }
    return release;
  }

  public async decide(
    id: string,
    value: unknown,
    principal: AuthenticatedPrincipal,
  ): Promise<ReleaseRecord> {
    const parsed = releaseDecisionSchema.safeParse(value);
    if (!parsed.success) {
      throw new BadRequestException(
        "The release decision does not match the governance contract.",
      );
    }
    const current = await this.getById(id);
    const policy = await this.repository.policy(
      current.automationId,
      current.targetEnvironment,
    );
    if (
      parsed.data.decision === "APPROVE" &&
      policy !== undefined &&
      requiresIndependentApproval(
        policy.risk_tier,
        current.proposerSubject,
        principal.subject,
      )
    ) {
      throw new ConflictException(
        "High-risk releases require an independent approver.",
      );
    }

    const release = await this.repository.decide(
      id,
      parsed.data.decision === "APPROVE" ? "APPROVED" : "REJECTED",
      parsed.data.rationale,
      principal,
    );
    if (release === undefined) {
      throw new ConflictException("The release has already been decided.");
    }
    return release;
  }
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "23505"
  );
}
