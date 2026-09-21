import type { AuthenticatedPrincipal } from "@automation-control-plane/contracts";

export interface AuthenticatedRequest {
  readonly headers: Readonly<Record<string, string | string[] | undefined>>;
  principal: AuthenticatedPrincipal;
}
