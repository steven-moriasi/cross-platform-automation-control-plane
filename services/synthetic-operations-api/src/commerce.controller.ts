import {
  refundRequestSchema,
  returnRequestSchema,
  warehouseWorkSchema,
  type SyntheticOrder,
  type SyntheticRefund,
  type SyntheticReturn,
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

const orders: readonly SyntheticOrder[] = [
  {
    currency: "KES",
    customerReference: "synthetic-customer-001",
    id: "order-delivered-001",
    itemCount: 2,
    paidAmount: 72_500,
    status: "DELIVERED",
  },
  {
    currency: "KES",
    customerReference: "synthetic-customer-002",
    id: "order-high-value-001",
    itemCount: 4,
    paidAmount: 280_000,
    status: "FULFILLED",
  },
];

@Controller("api/v1")
export class CommerceController {
  public constructor(
    @Inject(IdempotencyService)
    private readonly idempotency: IdempotencyService,
    @Inject(SyntheticStore) private readonly store: SyntheticStore,
  ) {}

  @Get("orders/:id")
  public order(@Param("id") id: string): SyntheticOrder {
    const order = orders.find((candidate) => candidate.id === id);
    if (order === undefined) {
      throw new NotFoundException(`Synthetic order ${id} was not found.`);
    }
    return order;
  }

  @Post("returns")
  public createReturn(
    @Body() body: unknown,
    @Headers("x-idempotency-key")
    idempotencyHeader: string | string[] | undefined,
    @Headers("x-synthetic-failure")
    failureHeader: string | string[] | undefined,
  ): IdempotentResult<SyntheticReturn> {
    const request = parseRequest(returnRequestSchema, body);
    const order = this.order(request.orderId);
    const mode = parseFailureMode(failureHeader);
    failBeforeSideEffect(mode);
    const result = this.idempotency.execute(
      "create-return",
      optionalHeader(idempotencyHeader),
      request,
      () => {
        if (this.store.returns.has(request.returnId)) {
          throw new ConflictException(
            `Synthetic return ${request.returnId} already exists.`,
          );
        }
        const eligible =
          order.status === "DELIVERED" && request.reason !== "NOT_REQUIRED";
        const syntheticReturn: SyntheticReturn = {
          ...request,
          createdAt: new Date().toISOString(),
          eligible,
          refundAmount: eligible ? order.paidAmount : 0,
          status: eligible
            ? order.paidAmount > 100_000
              ? "APPROVAL_REQUIRED"
              : "ELIGIBLE"
            : "REJECTED",
        };
        this.store.returns.set(request.returnId, syntheticReturn);
        return syntheticReturn;
      },
    );
    failAfterSideEffect(mode);
    return result;
  }

  @Get("returns/:id")
  public syntheticReturn(@Param("id") id: string): SyntheticReturn {
    const syntheticReturn = this.store.returns.get(id);
    if (syntheticReturn === undefined) {
      throw new NotFoundException(`Synthetic return ${id} was not found.`);
    }
    return syntheticReturn;
  }

  @Post("warehouse/work")
  public createWarehouseWork(
    @Body() body: unknown,
    @Headers("x-idempotency-key")
    idempotencyHeader: string | string[] | undefined,
  ): IdempotentResult<{
    readonly createdAt: string;
    readonly returnId: string;
    readonly workId: string;
  }> {
    const request = parseRequest(warehouseWorkSchema, body);
    this.syntheticReturn(request.returnId);
    return this.idempotency.execute(
      "create-warehouse-work",
      optionalHeader(idempotencyHeader),
      request,
      () => {
        const work = {
          createdAt: new Date().toISOString(),
          returnId: request.returnId,
          workId: request.workId,
        };
        this.store.warehouseWork.set(request.workId, work);
        return work;
      },
    );
  }

  @Post("refunds")
  public createRefund(
    @Body() body: unknown,
    @Headers("x-idempotency-key")
    idempotencyHeader: string | string[] | undefined,
    @Headers("x-synthetic-failure")
    failureHeader: string | string[] | undefined,
  ): IdempotentResult<SyntheticRefund> {
    const request = parseRequest(refundRequestSchema, body);
    const syntheticReturn = this.syntheticReturn(request.returnId);
    if (!syntheticReturn.eligible) {
      throw new ConflictException("The synthetic return is not eligible.");
    }
    if (request.amount !== syntheticReturn.refundAmount) {
      throw new ConflictException(
        "The refund amount must match the eligible return amount.",
      );
    }
    const mode = parseFailureMode(failureHeader);
    failBeforeSideEffect(mode);
    const operationId = optionalHeader(idempotencyHeader) ?? "";
    const result = this.idempotency.execute(
      "create-refund",
      operationId,
      request,
      () => {
        if (this.store.refunds.has(request.refundId)) {
          throw new ConflictException(
            `Synthetic refund ${request.refundId} already exists.`,
          );
        }
        const refund: SyntheticRefund = {
          ...request,
          createdAt: new Date().toISOString(),
          status: "SUCCEEDED",
        };
        this.store.refunds.set(request.refundId, refund);
        this.store.callbackPayloads.set(operationId, {
          operationId,
          resourceId: refund.refundId,
          resourceType: "REFUND",
          status: refund.status,
        });
        return refund;
      },
    );
    failAfterSideEffect(mode);
    return result;
  }

  @Get("refunds/:id")
  public refund(@Param("id") id: string): SyntheticRefund {
    const refund = this.store.refunds.get(id);
    if (refund === undefined) {
      throw new NotFoundException(`Synthetic refund ${id} was not found.`);
    }
    return refund;
  }
}
