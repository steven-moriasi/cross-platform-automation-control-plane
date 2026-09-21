export const syntheticCapabilities = [
  "claim-intake",
  "partner-onboarding",
  "return-and-refund",
  "field-inspection",
] as const;

export interface SyntheticApiMetadata {
  readonly capabilities: typeof syntheticCapabilities;
  readonly classification: "synthetic-only";
  readonly name: "synthetic-operations-api";
}

export function getSyntheticApiMetadata(): SyntheticApiMetadata {
  return {
    capabilities: syntheticCapabilities,
    classification: "synthetic-only",
    name: "synthetic-operations-api",
  };
}
