export const automationPlatforms = [
  "n8n",
  "zapier",
  "make",
  "power-platform",
] as const;

export type AutomationPlatform = (typeof automationPlatforms)[number];

export function isAutomationPlatform(
  value: string,
): value is AutomationPlatform {
  return automationPlatforms.some((platform) => platform === value);
}
