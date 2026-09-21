import {
  isPlatformRole,
  type AuthenticatedPrincipal,
} from "@automation-control-plane/contracts";
import { Inject, Injectable } from "@nestjs/common";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { z } from "zod";

import { ENVIRONMENT, type Environment } from "../config/environment.js";

const tokenClaimsSchema = z.object({
  email: z.string().email().optional(),
  name: z.string().trim().min(1).optional(),
  preferred_username: z.string().trim().min(1).optional(),
  realm_access: z
    .object({
      roles: z.array(z.string()),
    })
    .optional(),
  sub: z.string().trim().min(1),
});

export function parsePrincipal(claims: unknown): AuthenticatedPrincipal {
  const result = tokenClaimsSchema.parse(claims);
  const roles = (result.realm_access?.roles ?? []).filter(isPlatformRole);

  return {
    displayName:
      result.name ?? result.preferred_username ?? result.email ?? result.sub,
    ...(result.email === undefined ? {} : { email: result.email }),
    roles,
    subject: result.sub,
  };
}

@Injectable()
export class TokenVerifier {
  private readonly jwks: ReturnType<typeof createRemoteJWKSet>;

  public constructor(
    @Inject(ENVIRONMENT) private readonly environment: Environment,
  ) {
    this.jwks = createRemoteJWKSet(new URL(environment.oidcJwksUrl));
  }

  public async verify(token: string): Promise<AuthenticatedPrincipal> {
    const result = await jwtVerify(token, this.jwks, {
      audience: this.environment.oidcAudience,
      clockTolerance: 5,
      issuer: this.environment.oidcIssuer,
    });

    return parsePrincipal(result.payload);
  }
}
