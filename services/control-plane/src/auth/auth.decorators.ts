import type {
  AuthenticatedPrincipal,
  PlatformRole,
} from "@automation-control-plane/contracts";
import { createParamDecorator, SetMetadata } from "@nestjs/common";
import type { ExecutionContext } from "@nestjs/common";

import { ALLOW_ANONYMOUS, REQUIRED_ROLES } from "./auth.constants.js";
import type { AuthenticatedRequest } from "./auth.types.js";

export const AllowAnonymous = () => SetMetadata(ALLOW_ANONYMOUS, true);

export const RequireRoles = (...roles: PlatformRole[]) =>
  SetMetadata(REQUIRED_ROLES, roles);

export const Principal = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedPrincipal =>
    context.switchToHttp().getRequest<AuthenticatedRequest>().principal,
);
