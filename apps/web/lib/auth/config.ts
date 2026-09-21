import { z } from "zod";

const authConfigurationSchema = z.object({
  CONTROL_PLANE_INTERNAL_URL: z.string().url().default("http://localhost:4000"),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  OIDC_CLIENT_ID: z
    .string()
    .trim()
    .min(1)
    .default("automation-control-plane-web"),
  OIDC_CLIENT_SECRET: z.string().trim().min(16),
  OIDC_INTERNAL_BASE_URL: z.string().url().default("http://localhost:8089"),
  OIDC_PUBLIC_ISSUER: z
    .string()
    .url()
    .default("http://localhost:8089/realms/automation-control-plane"),
  SESSION_SECRET: z.string().min(32),
  WEB_BASE_URL: z.string().url().default("http://localhost:3000"),
});

export interface AuthConfiguration {
  readonly clientId: string;
  readonly clientSecret: string;
  readonly controlPlaneInternalUrl: string;
  readonly internalJwksUrl: string;
  readonly internalTokenUrl: string;
  readonly publicAuthorizationUrl: string;
  readonly publicEndSessionUrl: string;
  readonly publicIssuer: string;
  readonly redirectUri: string;
  readonly sessionSecret: string;
  readonly secureCookies: boolean;
  readonly webBaseUrl: string;
}

let cachedConfiguration: AuthConfiguration | undefined;

export function readAuthConfiguration(): AuthConfiguration {
  if (cachedConfiguration !== undefined) {
    return cachedConfiguration;
  }

  const source = authConfigurationSchema.parse(process.env);
  const realmPath = new URL(source.OIDC_PUBLIC_ISSUER).pathname;
  const internalIssuer = new URL(realmPath, source.OIDC_INTERNAL_BASE_URL);
  const publicIssuer = source.OIDC_PUBLIC_ISSUER.replace(/\/$/, "");
  const internalIssuerUrl = internalIssuer.toString().replace(/\/$/, "");

  cachedConfiguration = {
    clientId: source.OIDC_CLIENT_ID,
    clientSecret: source.OIDC_CLIENT_SECRET,
    controlPlaneInternalUrl: source.CONTROL_PLANE_INTERNAL_URL.replace(
      /\/$/,
      "",
    ),
    internalJwksUrl: `${internalIssuerUrl}/protocol/openid-connect/certs`,
    internalTokenUrl: `${internalIssuerUrl}/protocol/openid-connect/token`,
    publicAuthorizationUrl: `${publicIssuer}/protocol/openid-connect/auth`,
    publicEndSessionUrl: `${publicIssuer}/protocol/openid-connect/logout`,
    publicIssuer,
    redirectUri: `${source.WEB_BASE_URL.replace(/\/$/, "")}/api/auth/callback`,
    sessionSecret: source.SESSION_SECRET,
    secureCookies: source.NODE_ENV === "production",
    webBaseUrl: source.WEB_BASE_URL.replace(/\/$/, ""),
  };

  return cachedConfiguration;
}

export function resetAuthConfigurationForTests(): void {
  cachedConfiguration = undefined;
}
