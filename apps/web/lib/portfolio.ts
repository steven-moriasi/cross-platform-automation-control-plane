export type Platform = "make" | "n8n" | "power-platform" | "zapier";

export type PlatformEvidence = "hosted-pending" | "locally-verified";

export interface AutomationSummary {
  readonly id: string;
  readonly name: string;
  readonly owner: string;
  readonly platform: Platform;
  readonly evidence: PlatformEvidence;
  readonly health: "degraded" | "healthy";
  readonly lastExecution: string;
}

export const automationPortfolio: readonly AutomationSummary[] = [
  {
    id: "claims-intake-n8n",
    name: "Claims intake and triage",
    owner: "Claims Automation",
    platform: "n8n",
    evidence: "locally-verified",
    health: "healthy",
    lastExecution: "4 minutes ago",
  },
  {
    id: "partner-onboarding-zapier",
    name: "Partner onboarding",
    owner: "Distribution Operations",
    platform: "zapier",
    evidence: "hosted-pending",
    health: "healthy",
    lastExecution: "Fixture replay",
  },
  {
    id: "returns-orchestration-make",
    name: "Returns and refunds",
    owner: "Commerce Operations",
    platform: "make",
    evidence: "hosted-pending",
    health: "degraded",
    lastExecution: "Contract replay",
  },
  {
    id: "field-inspection-power-platform",
    name: "Field inspection approval",
    owner: "Field Services",
    platform: "power-platform",
    evidence: "hosted-pending",
    health: "healthy",
    lastExecution: "Package validation",
  },
] as const;

export function countHealthy(
  automations: readonly AutomationSummary[],
): number {
  return automations.filter(({ health }) => health === "healthy").length;
}

export function countHostedPending(
  automations: readonly AutomationSummary[],
): number {
  return automations.filter(({ evidence }) => evidence === "hosted-pending")
    .length;
}

export function formatPlatform(platform: Platform): string {
  const names: Record<Platform, string> = {
    make: "Make",
    n8n: "n8n",
    "power-platform": "Power Platform",
    zapier: "Zapier",
  };

  return names[platform];
}
