import {
  isPlatformRole,
  type AuthenticatedPrincipal,
} from "@automation-control-plane/contracts";
import { createHash, randomBytes } from "node:crypto";

import { EncryptJWT, base64url, jwtDecrypt } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { readAuthConfiguration } from "./config";

export const SESSION_COOKIE = "automation-control-plane-session";
export const TRANSACTION_COOKIE = "automation-control-plane-oidc-transaction";

const principalSchema = z.object({
  displayName: z.string().trim().min(1),
  email: z.string().email().optional(),
  roles: z.array(z.string()).transform((roles) => roles.filter(isPlatformRole)),
  subject: z.string().trim().min(1),
});

const sessionSchema = z.object({
  accessToken: z.string().min(1),
  expiresAt: z.number().int().positive(),
  idToken: z.string().min(1),
  principal: principalSchema,
});

const transactionSchema = z.object({
  codeVerifier: z.string().min(43).max(128),
  nonce: z.string().min(32),
  state: z.string().min(32),
});

export interface WebSession {
  readonly accessToken: string;
  readonly expiresAt: number;
  readonly idToken: string;
  readonly principal: AuthenticatedPrincipal;
}

export interface OidcTransaction {
  readonly codeVerifier: string;
  readonly nonce: string;
  readonly state: string;
}

function encryptionKey(secret: string): Uint8Array {
  return createHash("sha256").update(secret).digest();
}

async function encrypt(
  payload: Record<string, unknown>,
  lifetimeSeconds: number,
): Promise<string> {
  const configuration = readAuthConfiguration();
  return new EncryptJWT(payload)
    .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
    .setIssuedAt()
    .setExpirationTime(`${lifetimeSeconds}s`)
    .encrypt(encryptionKey(configuration.sessionSecret));
}

async function decrypt(token: string): Promise<unknown> {
  const configuration = readAuthConfiguration();
  const result = await jwtDecrypt(
    token,
    encryptionKey(configuration.sessionSecret),
    {
      clockTolerance: 5,
    },
  );
  return result.payload;
}

export function randomBase64Url(bytes = 32): string {
  return base64url.encode(randomBytes(bytes));
}

export async function sealOidcTransaction(
  transaction: OidcTransaction,
): Promise<string> {
  return encrypt({ ...transaction }, 600);
}

export async function openOidcTransaction(
  value: string,
): Promise<OidcTransaction> {
  return transactionSchema.parse(await decrypt(value));
}

export async function sealSession(
  session: WebSession,
  lifetimeSeconds: number,
): Promise<string> {
  return encrypt(
    {
      accessToken: session.accessToken,
      expiresAt: session.expiresAt,
      idToken: session.idToken,
      principal: session.principal,
    },
    lifetimeSeconds,
  );
}

export async function openSession(value: string): Promise<WebSession> {
  const result = sessionSchema.parse(await decrypt(value));
  return {
    accessToken: result.accessToken,
    expiresAt: result.expiresAt,
    idToken: result.idToken,
    principal: {
      displayName: result.principal.displayName,
      ...(result.principal.email === undefined
        ? {}
        : { email: result.principal.email }),
      roles: result.principal.roles,
      subject: result.principal.subject,
    },
  };
}

export async function getSession(): Promise<WebSession | undefined> {
  const cookieStore = await cookies();
  const value = cookieStore.get(SESSION_COOKIE)?.value;

  if (value === undefined) {
    return undefined;
  }

  try {
    const session = await openSession(value);
    return session.expiresAt > Math.floor(Date.now() / 1000) + 5
      ? session
      : undefined;
  } catch {
    return undefined;
  }
}

export async function requireSession(): Promise<WebSession> {
  const session = await getSession();
  if (session === undefined) {
    redirect("/login");
  }
  return session;
}
