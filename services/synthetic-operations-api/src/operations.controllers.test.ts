import { describe, expect, it } from "vitest";

import { ClaimsController } from "./claims.controller.js";
import { CommerceController } from "./commerce.controller.js";
import { FieldInspectionsController } from "./field-inspections.controller.js";
import { IdempotencyService } from "./idempotency.service.js";
import { PartnersController } from "./partners.controller.js";
import { SyntheticStore } from "./synthetic-store.js";

function dependencies(): {
  readonly idempotency: IdempotencyService;
  readonly store: SyntheticStore;
} {
  return {
    idempotency: new IdempotencyService(),
    store: new SyntheticStore(),
  };
}

describe("claims operations", () => {
  it("creates a claim once and replays the prior result", () => {
    const { idempotency, store } = dependencies();
    const controller = new ClaimsController(idempotency, store);
    const request = {
      claimId: "claim-test-001",
      documentReferences: ["document-001"],
      policyId: "policy-active-001",
      reportedAmount: 25_000,
    };
    const first = controller.createClaim(
      request,
      "claim-operation-001",
      undefined,
    );
    const replay = controller.createClaim(
      request,
      "claim-operation-001",
      undefined,
    );
    expect(first.replayed).toBe(false);
    expect(first.value.status).toBe("READY_FOR_PROCESSING");
    expect(replay.replayed).toBe(true);
    expect(store.claims.size).toBe(1);
  });

  it("persists an uncertain claim for reconciliation", () => {
    const { idempotency, store } = dependencies();
    const controller = new ClaimsController(idempotency, store);
    expect(() =>
      controller.createClaim(
        {
          claimId: "claim-uncertain-001",
          documentReferences: ["document-001"],
          policyId: "policy-active-001",
          reportedAmount: 50_000,
        },
        "claim-operation-uncertain-001",
        "UNCERTAIN",
      ),
    ).toThrow();
    expect(controller.claim("claim-uncertain-001").status).toBe(
      "READY_FOR_PROCESSING",
    );
  });
});

describe("partner operations", () => {
  it("paginates applications and advances a partner case", () => {
    const { idempotency, store } = dependencies();
    const controller = new PartnersController(idempotency, store);
    const firstPage = controller.listApplications("0", "2");
    expect(firstPage.data).toHaveLength(2);
    expect(firstPage.nextCursor).toBe("2");
    controller.verify(
      {
        applicationId: "partner-application-001",
        documentReferences: ["partner-document-001"],
      },
      "partner-verification-001",
      undefined,
    );
    const created = controller.createCase(
      {
        applicationId: "partner-application-001",
        caseId: "partner-case-001",
      },
      "partner-case-operation-001",
      undefined,
    );
    const updated = controller.updateStatus(
      created.value.caseId,
      { status: "APPROVED" },
      "partner-case-decision-001",
    );
    expect(updated.value.status).toBe("APPROVED");
  });
});

describe("commerce operations", () => {
  it("validates the refundable amount and supports reconciliation", () => {
    const { idempotency, store } = dependencies();
    const controller = new CommerceController(idempotency, store);
    const syntheticReturn = controller.createReturn(
      {
        orderId: "order-delivered-001",
        reason: "DAMAGED",
        returnId: "return-001",
      },
      "return-operation-001",
      undefined,
    );
    expect(syntheticReturn.value.refundAmount).toBe(72_500);
    expect(() =>
      controller.createRefund(
        {
          amount: 70_000,
          refundId: "refund-incorrect-001",
          returnId: "return-001",
        },
        "refund-operation-incorrect-001",
        undefined,
      ),
    ).toThrow();
    controller.createRefund(
      {
        amount: 72_500,
        refundId: "refund-001",
        returnId: "return-001",
      },
      "refund-operation-001",
      undefined,
    );
    expect(controller.refund("refund-001").status).toBe("SUCCEEDED");
  });
});

describe("field inspection operations", () => {
  it("requires a decision for remediation outcomes", () => {
    const { idempotency, store } = dependencies();
    const controller = new FieldInspectionsController(idempotency, store);
    const created = controller.create(
      {
        inspectionId: "inspection-001",
        locationReference: "site-001",
        outcome: "REQUIRES_REMEDIATION",
        submittedBy: "inspector-001",
      },
      "inspection-operation-001",
      undefined,
    );
    expect(created.value.approvalStatus).toBe("PENDING");
    const decided = controller.decide(
      "inspection-001",
      {
        decision: "APPROVE",
        rationale: "The remediation evidence is complete.",
      },
      "inspection-decision-001",
    );
    expect(decided.value.approvalStatus).toBe("APPROVED");
  });
});
