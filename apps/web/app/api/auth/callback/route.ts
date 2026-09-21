import { type NextRequest, NextResponse } from "next/server";

import { readAuthConfiguration } from "../../../../lib/auth/config";
import {
  openOidcTransaction,
  sealSession,
  SESSION_COOKIE,
  TRANSACTION_COOKIE,
} from "../../../../lib/auth/session";
import { exchangeAuthorizationCode } from "../../../../lib/auth/tokens";

function loginFailure(request: Request): NextResponse {
  const url = new URL("/login", request.url);
  url.searchParams.set("error", "authentication_failed");
  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const returnedState = requestUrl.searchParams.get("state");
  const transactionCookie = request.cookies.get(TRANSACTION_COOKIE)?.value;

  if (
    code === null ||
    returnedState === null ||
    transactionCookie === undefined
  ) {
    return loginFailure(request);
  }

  try {
    const configuration = readAuthConfiguration();
    const transaction = await openOidcTransaction(transactionCookie);
    if (transaction.state !== returnedState) {
      return loginFailure(request);
    }

    const result = await exchangeAuthorizationCode(code, transaction);
    const response = NextResponse.redirect(configuration.webBaseUrl);
    response.cookies.set(
      SESSION_COOKIE,
      await sealSession(result.session, result.lifetimeSeconds),
      {
        httpOnly: true,
        maxAge: result.lifetimeSeconds,
        path: "/",
        sameSite: "lax",
        secure: configuration.secureCookies,
      },
    );
    response.cookies.delete(TRANSACTION_COOKIE);
    return response;
  } catch {
    return loginFailure(request);
  }
}
