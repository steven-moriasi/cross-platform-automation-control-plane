import {
  createClaimSchema,
  type SyntheticClaim,
  type SyntheticPolicy,
} from "@automation-control-plane/contracts";
import {
  Body,
  Controller,
  Get,
  Headers,
  Inject,
  NotFoundException,
  Param,
  Post,
} from "@nestjs/common";

import {
  failAfterSideEffect,
  failBeforeSideEffect,
  parseFailureMode,
} from "./failure-injection.js";
import {
  IdempotencyService,
  type IdempotentResult,
} from "./idempotency.service.js";
import { optionalHeader, parseRequest } from "./request-validation.js";
import { SyntheticStore } from "./synthetic-store.js";

const policies: readonly SyntheticPolicy[] = [
  {
    coverageLimit: 500_000,
    holderReference: "synthetic-holder-a",
    id: "policy-active-001",
    status: "ACTIVE",
  },
  {
    coverageLimit: 100_000,
    holderReference: "synthetic-holder-b",
    id: "policy-lapsed-001",
    status: "LAPSED",
  },
];

@Controller("api/v1")
export class ClaimsController {
  public constructor(
    @Inject(IdempotencyService)
    private readonly idempotency: IdempotencyService,
    @Inject(SyntheticStore) private readonly store: SyntheticStore,
  ) {}

  @Get("policies/:id")
  public policy(@Param("id") id: string): SyntheticPolicy {
    const policy = policies.find((candidate) => candidate.id === id);
    if (policy === undefined) {
      throw new NotFoundException(`Synthetic policy ${id} was not found.`);
    }
    return policy;
  }

  @Post("claims")
  public createClaim(
    @Body() body: unknown,
    @Headers("x-idempotency-key")
    idempotencyKey: string | string[] | undefined,
    @Headers("x-synthetic-failure")
    failureHeader: string | string[] | undefined,
  ): IdempotentResult<SyntheticClaim> {
    const request = parseRequest(createClaimSchema, body);
    const mode = parseFailureMode(failureHeader);
    failBeforeSideEffect(mode);
    const operationId = optionalHeader(idempotencyKey) ?? "";

    const result = this.idempotency.execute(
      "create-claim",
      operationId,
      request,
      () => {
        const policy = policies.find(
          (candidate) => candidate.id === request.policyId,
        );
        if (policy === undefined) {
          throw new NotFoundException(
            `Synthetic policy ${request.policyId} was not found.`,
          );
        }
        const highRisk =
          request.reportedAmount > 250_000 ||
          request.documentReferences.length > 2;
        const claim: SyntheticClaim = {
          ...request,
          createdAt: new Date().toISOString(),
          riskScore: highRisk ? 85 : 20,
          status:
            policy.status === "LAPSED"
              ? "REJECTED"
              : highRisk
                ? "HUMAN_REVIEW"
                : "READY_FOR_PROCESSING",
        };
        this.store.claims.set(claim.claimId, claim);
        this.store.callbackPayloads.set(operationId, {
          operationId,
          resourceId: claim.claimId,
          resourceType: "CLAIM",
          status: claim.status,
        });
        return claim;
      },
    );
    failAfterSideEffect(mode);
    return result;
  }

  @Get("claims/:id")
  public claim(@Param("id") id: string): SyntheticClaim {
    const claim = this.store.claims.get(id);
    if (claim === undefined) {
      throw new NotFoundException(`Synthetic claim ${id} was not found.`);
    }
    return claim;
  }
}
