import { type NextRequest, NextResponse } from "next/server";

import { readAuthConfiguration } from "../../../../lib/auth/config";
import { openSession, SESSION_COOKIE } from "../../../../lib/auth/session";

async function readIdToken(value: string): Promise<string | undefined> {
  try {
    return (await openSession(value)).idToken;
  } catch {
    return undefined;
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const configuration = readAuthConfiguration();
  const logoutUrl = new URL(configuration.publicEndSessionUrl);
  logoutUrl.searchParams.set(
    "post_logout_redirect_uri",
    `${configuration.webBaseUrl}/login`,
  );
  logoutUrl.searchParams.set("client_id", configuration.clientId);

  const value = request.cookies.get(SESSION_COOKIE)?.value;
  if (value !== undefined) {
    const idToken = await readIdToken(value);
    if (idToken !== undefined) {
      logoutUrl.searchParams.set("id_token_hint", idToken);
    }
  }

  const response = NextResponse.redirect(logoutUrl, 303);
  response.cookies.delete(SESSION_COOKIE);
  return response;
}
