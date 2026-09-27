import type {
  FieldInspection,
  PartnerCase,
  SyntheticClaim,
  SyntheticRefund,
  SyntheticReturn,
  SignedSyntheticCallback,
} from "@automation-control-plane/contracts";
import { Injectable } from "@nestjs/common";

@Injectable()
export class SyntheticStore {
  public readonly claims = new Map<string, SyntheticClaim>();
  public readonly fieldInspections = new Map<string, FieldInspection>();
  public readonly partnerCases = new Map<string, PartnerCase>();
  public readonly partnerVerifications = new Set<string>();
  public readonly refunds = new Map<string, SyntheticRefund>();
  public readonly returns = new Map<string, SyntheticReturn>();
  public readonly callbackPayloads = new Map<
    string,
    SignedSyntheticCallback["payload"]
  >();
  public readonly warehouseWork = new Map<
    string,
    { readonly createdAt: string; readonly returnId: string }
  >();
}
