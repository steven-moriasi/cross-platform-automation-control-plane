import {
  fieldInspectionSchema,
  inspectionApprovalSchema,
  type FieldInspection,
} from "@automation-control-plane/contracts";
import {
  Body,
  ConflictException,
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

@Controller("api/v1/field-inspections")
export class FieldInspectionsController {
  public constructor(
    @Inject(IdempotencyService)
    private readonly idempotency: IdempotencyService,
    @Inject(SyntheticStore) private readonly store: SyntheticStore,
  ) {}

  @Post()
  public create(
    @Body() body: unknown,
    @Headers("x-idempotency-key")
    idempotencyHeader: string | string[] | undefined,
    @Headers("x-synthetic-failure")
    failureHeader: string | string[] | undefined,
  ): IdempotentResult<FieldInspection> {
    const request = parseRequest(fieldInspectionSchema, body);
    const mode = parseFailureMode(failureHeader);
    failBeforeSideEffect(mode);
    const operationId = optionalHeader(idempotencyHeader) ?? "";
    const result = this.idempotency.execute(
      "create-field-inspection",
      operationId,
      request,
      () => {
        if (this.store.fieldInspections.has(request.inspectionId)) {
          throw new ConflictException(
            `Synthetic field inspection ${request.inspectionId} already exists.`,
          );
        }
        const inspection: FieldInspection = {
          ...request,
          approvalStatus: request.outcome === "PASS" ? "APPROVED" : "PENDING",
          createdAt: new Date().toISOString(),
        };
        this.store.fieldInspections.set(request.inspectionId, inspection);
        this.recordCallback(operationId, inspection);
        return inspection;
      },
    );
    failAfterSideEffect(mode);
    return result;
  }

  @Get(":id")
  public get(@Param("id") id: string): FieldInspection {
    const inspection = this.store.fieldInspections.get(id);
    if (inspection === undefined) {
      throw new NotFoundException(
        `Synthetic field inspection ${id} was not found.`,
      );
    }
    return inspection;
  }

  @Post(":id/decision")
  public decide(
    @Param("id") id: string,
    @Body() body: unknown,
    @Headers("x-idempotency-key")
    idempotencyHeader: string | string[] | undefined,
  ): IdempotentResult<FieldInspection> {
    const request = parseRequest(inspectionApprovalSchema, body);
    const operationId = optionalHeader(idempotencyHeader) ?? "";
    return this.idempotency.execute(
      `decide-field-inspection:${id}`,
      operationId,
      request,
      () => {
        const current = this.get(id);
        if (current.approvalStatus !== "PENDING") {
          throw new ConflictException(
            "The synthetic field inspection is already decided.",
          );
        }
        const updated: FieldInspection = {
          ...current,
          approvalStatus:
            request.decision === "APPROVE" ? "APPROVED" : "REJECTED",
        };
        this.store.fieldInspections.set(id, updated);
        this.recordCallback(operationId, updated);
        return updated;
      },
    );
  }

  private recordCallback(
    operationId: string,
    inspection: FieldInspection,
  ): void {
    this.store.callbackPayloads.set(operationId, {
      operationId,
      resourceId: inspection.inspectionId,
      resourceType: "FIELD_INSPECTION",
      status: inspection.approvalStatus,
    });
  }
}
