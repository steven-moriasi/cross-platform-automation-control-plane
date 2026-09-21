import { createHash } from "node:crypto";

import { base64url } from "jose";
import { NextResponse } from "next/server";

import { readAuthConfiguration } from "../../../../lib/auth/config";
import {
  randomBase64Url,
  sealOidcTransaction,
  TRANSACTION_COOKIE,
} from "../../../../lib/auth/session";

export async function GET(): Promise<NextResponse> {
  const configuration = readAuthConfiguration();
  const transaction = {
    codeVerifier: randomBase64Url(64),
    nonce: randomBase64Url(),
    state: randomBase64Url(),
  };
  const challenge = base64url.encode(
    createHash("sha256").update(transaction.codeVerifier).digest(),
  );
  const authorizationUrl = new URL(configuration.publicAuthorizationUrl);
  authorizationUrl.search = new URLSearchParams({
    client_id: configuration.clientId,
    code_challenge: challenge,
    code_challenge_method: "S256",
    nonce: transaction.nonce,
    redirect_uri: configuration.redirectUri,
    response_type: "code",
    scope: "openid profile email",
    state: transaction.state,
  }).toString();

  const response = NextResponse.redirect(authorizationUrl);
  response.cookies.set(
    TRANSACTION_COOKIE,
    await sealOidcTransaction(transaction),
    {
      httpOnly: true,
      maxAge: 600,
      path: "/api/auth/callback",
      sameSite: "lax",
      secure: configuration.secureCookies,
    },
  );
  return response;
}
