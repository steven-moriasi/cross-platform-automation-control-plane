import {
  partnerCaseSchema,
  partnerStatusSchema,
  partnerVerificationSchema,
  type PartnerApplication,
  type PartnerCase,
} from "@automation-control-plane/contracts";
import {
  Body,
  Controller,
  Get,
  Headers,
  Inject,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
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

const applications: readonly PartnerApplication[] = [
  {
    applicationId: "partner-application-001",
    organizationName: "Synthetic Logistics Limited",
    submittedAt: "2026-01-10T08:00:00.000Z",
    verificationStatus: "PENDING",
  },
  {
    applicationId: "partner-application-002",
    organizationName: "Demo Repair Network",
    submittedAt: "2026-01-11T08:00:00.000Z",
    verificationStatus: "PENDING",
  },
  {
    applicationId: "partner-application-003",
    organizationName: "Reference Assessors PLC",
    submittedAt: "2026-01-12T08:00:00.000Z",
    verificationStatus: "PENDING",
  },
];

@Controller("api/v1/partners")
export class PartnersController {
  public constructor(
    @Inject(IdempotencyService)
    private readonly idempotency: IdempotencyService,
    @Inject(SyntheticStore) private readonly store: SyntheticStore,
  ) {}

  @Get("applications")
  public listApplications(
    @Query("cursor") cursor = "0",
    @Query("limit") requestedLimit = "2",
  ): {
    readonly data: readonly PartnerApplication[];
    readonly nextCursor?: string;
  } {
    const offset = Number.parseInt(cursor, 10);
    const limit = Math.min(Number.parseInt(requestedLimit, 10), 10);
    const safeOffset = Number.isNaN(offset) || offset < 0 ? 0 : offset;
    const safeLimit = Number.isNaN(limit) || limit < 1 ? 2 : limit;
    const data = applications
      .slice(safeOffset, safeOffset + safeLimit)
      .map((application) => ({
        ...application,
        verificationStatus: this.store.partnerVerifications.has(
          application.applicationId,
        )
          ? ("VERIFIED" as const)
          : application.verificationStatus,
      }));
    const nextOffset = safeOffset + data.length;
    return {
      data,
      ...(nextOffset >= applications.length
        ? {}
        : { nextCursor: String(nextOffset) }),
    };
  }

  @Post("verifications")
  public verify(
    @Body() body: unknown,
    @Headers("x-idempotency-key")
    idempotencyHeader: string | string[] | undefined,
    @Headers("x-synthetic-failure")
    failureHeader: string | string[] | undefined,
  ): IdempotentResult<{
    readonly applicationId: string;
    readonly status: "VERIFIED";
  }> {
    const request = parseRequest(partnerVerificationSchema, body);
    this.application(request.applicationId);
    const mode = parseFailureMode(failureHeader);
    failBeforeSideEffect(mode);
    const result = this.idempotency.execute(
      "verify-partner",
      optionalHeader(idempotencyHeader),
      request,
      () => {
        this.store.partnerVerifications.add(request.applicationId);
        return {
          applicationId: request.applicationId,
          status: "VERIFIED" as const,
        };
      },
    );
    failAfterSideEffect(mode);
    return result;
  }

  @Post("cases")
  public createCase(
    @Body() body: unknown,
    @Headers("x-idempotency-key")
    idempotencyHeader: string | string[] | undefined,
    @Headers("x-synthetic-failure")
    failureHeader: string | string[] | undefined,
  ): IdempotentResult<PartnerCase> {
    const request = parseRequest(partnerCaseSchema, body);
    this.application(request.applicationId);
    const mode = parseFailureMode(failureHeader);
    failBeforeSideEffect(mode);
    const operationId = optionalHeader(idempotencyHeader) ?? "";
    const result = this.idempotency.execute(
      "create-partner-case",
      operationId,
      request,
      () => {
        const partnerCase: PartnerCase = {
          ...request,
          createdAt: new Date().toISOString(),
          status: "OPEN",
        };
        this.store.partnerCases.set(partnerCase.caseId, partnerCase);
        this.recordCallback(operationId, partnerCase);
        return partnerCase;
      },
    );
    failAfterSideEffect(mode);
    return result;
  }

  @Get("cases/:id")
  public partnerCase(@Param("id") id: string): PartnerCase {
    const partnerCase = this.store.partnerCases.get(id);
    if (partnerCase === undefined) {
      throw new NotFoundException(
        `Synthetic partner case ${id} was not found.`,
      );
    }
    return partnerCase;
  }

  @Patch("cases/:id/status")
  public updateStatus(
    @Param("id") id: string,
    @Body() body: unknown,
    @Headers("x-idempotency-key")
    idempotencyHeader: string | string[] | undefined,
  ): IdempotentResult<PartnerCase> {
    const request = parseRequest(partnerStatusSchema, body);
    const operationId = optionalHeader(idempotencyHeader) ?? "";
    return this.idempotency.execute(
      `update-partner-case:${id}`,
      operationId,
      request,
      () => {
        const current = this.partnerCase(id);
        const updated: PartnerCase = {
          ...current,
          status: request.status,
        };
        this.store.partnerCases.set(id, updated);
        this.recordCallback(operationId, updated);
        return updated;
      },
    );
  }

  private application(id: string): PartnerApplication {
    const application = applications.find(
      (candidate) => candidate.applicationId === id,
    );
    if (application === undefined) {
      throw new NotFoundException(
        `Synthetic partner application ${id} was not found.`,
      );
    }
    return application;
  }

  private recordCallback(operationId: string, partnerCase: PartnerCase): void {
    this.store.callbackPayloads.set(operationId, {
      operationId,
      resourceId: partnerCase.caseId,
      resourceType: "PARTNER_CASE",
      status: partnerCase.status,
    });
  }
}
