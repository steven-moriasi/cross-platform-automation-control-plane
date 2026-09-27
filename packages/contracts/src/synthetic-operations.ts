import { z } from "zod";

export const syntheticOperationsApiVersion = "1.0" as const;

export const syntheticIdentifierSchema = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  .max(100);

export const createClaimSchema = z
  .object({
    claimId: syntheticIdentifierSchema,
    documentReferences: z.array(syntheticIdentifierSchema).min(1).max(10),
    policyId: syntheticIdentifierSchema,
    reportedAmount: z.number().positive().max(10_000_000),
  })
  .strict();
export type CreateClaim = z.infer<typeof createClaimSchema>;

export interface SyntheticPolicy {
  readonly coverageLimit: number;
  readonly holderReference: string;
  readonly id: string;
  readonly status: "ACTIVE" | "LAPSED";
}

export interface SyntheticClaim extends CreateClaim {
  readonly createdAt: string;
  readonly riskScore: number;
  readonly status: "HUMAN_REVIEW" | "READY_FOR_PROCESSING" | "REJECTED";
}

export interface PartnerApplication {
  readonly applicationId: string;
  readonly organizationName: string;
  readonly submittedAt: string;
  readonly verificationStatus: "PENDING" | "VERIFIED";
}

export const partnerVerificationSchema = z
  .object({
    applicationId: syntheticIdentifierSchema,
    documentReferences: z.array(syntheticIdentifierSchema).min(1).max(10),
  })
  .strict();
export type PartnerVerification = z.infer<typeof partnerVerificationSchema>;

export const partnerCaseSchema = z
  .object({
    applicationId: syntheticIdentifierSchema,
    caseId: syntheticIdentifierSchema,
  })
  .strict();
export type PartnerCaseRequest = z.infer<typeof partnerCaseSchema>;

export const partnerStatusSchema = z
  .object({
    status: z.enum(["APPROVED", "REJECTED", "REQUIRES_INFORMATION"]),
  })
  .strict();
export type PartnerStatusUpdate = z.infer<typeof partnerStatusSchema>;

export interface PartnerCase extends PartnerCaseRequest {
  readonly createdAt: string;
  readonly status: "APPROVED" | "OPEN" | "REJECTED" | "REQUIRES_INFORMATION";
}

export interface SyntheticOrder {
  readonly currency: "KES";
  readonly customerReference: string;
  readonly id: string;
  readonly itemCount: number;
  readonly paidAmount: number;
  readonly status: "DELIVERED" | "FULFILLED";
}

export const returnRequestSchema = z
  .object({
    orderId: syntheticIdentifierSchema,
    reason: z.enum(["DAMAGED", "INCORRECT_ITEM", "NOT_REQUIRED"]),
    returnId: syntheticIdentifierSchema,
  })
  .strict();
export type ReturnRequest = z.infer<typeof returnRequestSchema>;

export interface SyntheticReturn extends ReturnRequest {
  readonly createdAt: string;
  readonly eligible: boolean;
  readonly refundAmount: number;
  readonly status: "APPROVAL_REQUIRED" | "ELIGIBLE" | "REJECTED";
}

export const warehouseWorkSchema = z
  .object({
    returnId: syntheticIdentifierSchema,
    workId: syntheticIdentifierSchema,
  })
  .strict();
export type WarehouseWorkRequest = z.infer<typeof warehouseWorkSchema>;

export const refundRequestSchema = z
  .object({
    amount: z.number().positive().max(10_000_000),
    refundId: syntheticIdentifierSchema,
    returnId: syntheticIdentifierSchema,
  })
  .strict();
export type RefundRequest = z.infer<typeof refundRequestSchema>;

export interface SyntheticRefund extends RefundRequest {
  readonly createdAt: string;
  readonly status: "PENDING" | "SUCCEEDED";
}

export const fieldInspectionSchema = z
  .object({
    inspectionId: syntheticIdentifierSchema,
    locationReference: syntheticIdentifierSchema,
    outcome: z.enum(["PASS", "REQUIRES_REMEDIATION"]),
    submittedBy: syntheticIdentifierSchema,
  })
  .strict();
export type FieldInspectionRequest = z.infer<typeof fieldInspectionSchema>;

export interface FieldInspection extends FieldInspectionRequest {
  readonly approvalStatus: "APPROVED" | "PENDING" | "REJECTED";
  readonly createdAt: string;
}

export const inspectionApprovalSchema = z
  .object({
    decision: z.enum(["APPROVE", "REJECT"]),
    rationale: z.string().trim().min(10).max(1_000),
  })
  .strict();
export type InspectionApproval = z.infer<typeof inspectionApprovalSchema>;

export interface SignedSyntheticCallback {
  readonly payload: {
    readonly operationId: string;
    readonly resourceId: string;
    readonly resourceType:
      "CLAIM" | "FIELD_INSPECTION" | "PARTNER_CASE" | "REFUND";
    readonly status: string;
  };
  readonly signature: string;
  readonly timestamp: number;
}
