import {
  isPlatformRole,
  type AuthenticatedPrincipal,
} from "@automation-control-plane/contracts";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { z } from "zod";

import { readAuthConfiguration } from "./config";
import type { OidcTransaction, WebSession } from "./session";

const tokenResponseSchema = z.object({
  access_token: z.string().min(1),
  expires_in: z.number().int().positive().max(86_400),
  id_token: z.string().min(1),
  token_type: z.literal("Bearer"),
});

const idTokenClaimsSchema = z.object({
  email: z.string().email().optional(),
  name: z.string().trim().min(1).optional(),
  nonce: z.string().min(1),
  preferred_username: z.string().trim().min(1).optional(),
  realm_access: z
    .object({
      roles: z.array(z.string()),
    })
    .optional(),
  sub: z.string().trim().min(1),
});

let jwks: ReturnType<typeof createRemoteJWKSet> | undefined;

function principalFromClaims(
  claims: z.infer<typeof idTokenClaimsSchema>,
): AuthenticatedPrincipal {
  return {
    displayName:
      claims.name ?? claims.preferred_username ?? claims.email ?? claims.sub,
    ...(claims.email === undefined ? {} : { email: claims.email }),
    roles: (claims.realm_access?.roles ?? []).filter(isPlatformRole),
    subject: claims.sub,
  };
}

export async function exchangeAuthorizationCode(
  code: string,
  transaction: OidcTransaction,
): Promise<{ readonly lifetimeSeconds: number; readonly session: WebSession }> {
  const configuration = readAuthConfiguration();
  const response = await fetch(configuration.internalTokenUrl, {
    body: new URLSearchParams({
      client_id: configuration.clientId,
      client_secret: configuration.clientSecret,
      code,
      code_verifier: transaction.codeVerifier,
      grant_type: "authorization_code",
      redirect_uri: configuration.redirectUri,
    }),
    headers: {
      "content-type": "application/x-www-form-urlencoded",
    },
    method: "POST",
  });

  if (!response.ok) {
    throw new Error(
      `OIDC token exchange failed with status ${response.status}.`,
    );
  }

  const tokens = tokenResponseSchema.parse(await response.json());
  jwks ??= createRemoteJWKSet(new URL(configuration.internalJwksUrl));
  const verification = await jwtVerify(tokens.id_token, jwks, {
    audience: configuration.clientId,
    clockTolerance: 5,
    issuer: configuration.publicIssuer,
  });
  const claims = idTokenClaimsSchema.parse(verification.payload);

  if (claims.nonce !== transaction.nonce) {
    throw new Error("OIDC nonce validation failed.");
  }

  const now = Math.floor(Date.now() / 1000);
  return {
    lifetimeSeconds: tokens.expires_in,
    session: {
      accessToken: tokens.access_token,
      expiresAt: now + tokens.expires_in,
      idToken: tokens.id_token,
      principal: principalFromClaims(claims),
    },
  };
}
