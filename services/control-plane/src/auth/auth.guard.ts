import { hasRequiredRole } from "@automation-control-plane/contracts";
import type { PlatformRole } from "@automation-control-plane/contracts";
import {
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import type { CanActivate, ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";

import { ALLOW_ANONYMOUS, REQUIRED_ROLES } from "./auth.constants.js";
import type { AuthenticatedRequest } from "./auth.types.js";
import { TokenVerifier } from "./token-verifier.js";

export function readBearerToken(
  header: string | string[] | undefined,
): string | undefined {
  if (typeof header !== "string") {
    return undefined;
  }

  const [scheme, token, extra] = header.split(" ");
  return scheme === "Bearer" && token !== undefined && extra === undefined
    ? token
    : undefined;
}

@Injectable()
export class AuthGuard implements CanActivate {
  public constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(TokenVerifier) private readonly tokenVerifier: TokenVerifier,
  ) {}

  public async canActivate(context: ExecutionContext): Promise<boolean> {
    const isAnonymous = this.reflector.getAllAndOverride<boolean>(
      ALLOW_ANONYMOUS,
      [context.getHandler(), context.getClass()],
    );

    if (isAnonymous === true) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = readBearerToken(request.headers.authorization);

    if (token === undefined) {
      throw new UnauthorizedException("A bearer access token is required.");
    }

    try {
      request.principal = await this.tokenVerifier.verify(token);
    } catch {
      throw new UnauthorizedException("The bearer access token is invalid.");
    }

    const requiredRoles =
      this.reflector.getAllAndOverride<readonly PlatformRole[]>(
        REQUIRED_ROLES,
        [context.getHandler(), context.getClass()],
      ) ?? [];

    if (!hasRequiredRole(request.principal, requiredRoles)) {
      throw new ForbiddenException(
        "The assigned role cannot perform this action.",
      );
    }

    return true;
  }
}
