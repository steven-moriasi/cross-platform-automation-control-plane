import type {
  AutomationPlatform,
  CatalogAutomation,
} from "@automation-control-plane/contracts";

export type Platform = AutomationPlatform;

export function countMatchingChecksums(
  automations: readonly CatalogAutomation[],
): number {
  return automations.filter(({ checksumStatus }) => checksumStatus === "MATCH")
    .length;
}

export function countHighRisk(
  automations: readonly CatalogAutomation[],
): number {
  return automations.filter(
    ({ riskTier }) => riskTier === "HIGH" || riskTier === "CRITICAL",
  ).length;
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
