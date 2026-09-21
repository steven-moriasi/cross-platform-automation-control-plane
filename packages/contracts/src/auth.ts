export const platformRoles = [
  "PLATFORM_ADMIN",
  "AUTOMATION_OWNER",
  "RELEASE_APPROVER",
  "OPERATOR",
  "AUDITOR",
  "VIEWER",
] as const;

export type PlatformRole = (typeof platformRoles)[number];

export interface AuthenticatedPrincipal {
  readonly displayName: string;
  readonly email?: string;
  readonly roles: readonly PlatformRole[];
  readonly subject: string;
}

export function isPlatformRole(value: string): value is PlatformRole {
  return platformRoles.some((role) => role === value);
}

export function hasRequiredRole(
  principal: AuthenticatedPrincipal,
  requiredRoles: readonly PlatformRole[],
): boolean {
  return (
    principal.roles.includes("PLATFORM_ADMIN") ||
    requiredRoles.length === 0 ||
    requiredRoles.some((role) => principal.roles.includes(role))
  );
}
