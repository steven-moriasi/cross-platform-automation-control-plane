import {
  hasRequiredRole,
  type AuthenticatedPrincipal,
  type PlatformRole,
} from "@automation-control-plane/contracts";

interface NavigationItem {
  readonly label: string;
  readonly requiredRoles: readonly PlatformRole[];
}

const navigationItems: readonly NavigationItem[] = [
  { label: "Overview", requiredRoles: [] },
  { label: "Automations", requiredRoles: [] },
  { label: "Releases", requiredRoles: [] },
  { label: "Executions", requiredRoles: [] },
  { label: "Incidents", requiredRoles: [] },
  { label: "Audit", requiredRoles: ["AUDITOR"] },
];

export function navigationForPrincipal(
  principal: AuthenticatedPrincipal,
): readonly string[] {
  return navigationItems
    .filter((item) => hasRequiredRole(principal, item.requiredRoles))
    .map((item) => item.label);
}

export function canApproveReleases(principal: AuthenticatedPrincipal): boolean {
  return hasRequiredRole(principal, ["RELEASE_APPROVER"]);
}
