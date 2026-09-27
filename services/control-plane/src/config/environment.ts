import { z } from "zod";
import { resolve } from "node:path";

const environmentSchema = z.object({
  CATALOG_REPOSITORY_ROOT: z
    .string()
    .trim()
    .min(1)
    .default(resolve(process.cwd(), "../..")),
  DATABASE_URL: z
    .string()
    .url()
    .default(
      "postgres://automation:automation-local-only@localhost:5432/automation_control_plane",
    ),
  MAX_REQUEST_BODY_BYTES: z.coerce
    .number()
    .int()
    .min(16_384)
    .max(1_048_576)
    .default(262_144),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  OIDC_AUDIENCE: z.string().trim().min(1).default("control-plane-api"),
  OIDC_ISSUER: z
    .string()
    .url()
    .default("http://localhost:8089/realms/automation-control-plane"),
  OIDC_JWKS_URL: z
    .string()
    .url()
    .default(
      "http://localhost:8089/realms/automation-control-plane/protocol/openid-connect/certs",
    ),
  PORT: z.coerce.number().int().min(1).max(65_535).default(4000),
  SERVICE_VERSION: z.string().trim().min(1).max(64).default("0.1.0"),
  TELEMETRY_CLIENT_ID: z
    .string()
    .trim()
    .min(3)
    .max(100)
    .default("local-automation-packages"),
  TELEMETRY_MAX_CLOCK_SKEW_SECONDS: z.coerce
    .number()
    .int()
    .min(30)
    .max(900)
    .default(300),
  TELEMETRY_SIGNING_SECRET: z
    .string()
    .min(32)
    .default("local-telemetry-signing-secret-change-me"),
  WEB_ORIGIN: z.string().url().default("http://localhost:3000"),
});

export interface Environment {
  readonly catalogRepositoryRoot: string;
  readonly databaseUrl: string;
  readonly maxRequestBodyBytes: number;
  readonly nodeEnvironment: "development" | "production" | "test";
  readonly oidcAudience: string;
  readonly oidcIssuer: string;
  readonly oidcJwksUrl: string;
  readonly port: number;
  readonly serviceVersion: string;
  readonly telemetryClientId: string;
  readonly telemetryMaxClockSkewSeconds: number;
  readonly telemetrySigningSecret: string;
  readonly webOrigin: string;
}

export const ENVIRONMENT = Symbol("ENVIRONMENT");

export function readEnvironment(source: NodeJS.ProcessEnv): Environment {
  const result = environmentSchema.parse(source);

  return {
    catalogRepositoryRoot: result.CATALOG_REPOSITORY_ROOT,
    databaseUrl: result.DATABASE_URL,
    maxRequestBodyBytes: result.MAX_REQUEST_BODY_BYTES,
    nodeEnvironment: result.NODE_ENV,
    oidcAudience: result.OIDC_AUDIENCE,
    oidcIssuer: result.OIDC_ISSUER,
    oidcJwksUrl: result.OIDC_JWKS_URL,
    port: result.PORT,
    serviceVersion: result.SERVICE_VERSION,
    telemetryClientId: result.TELEMETRY_CLIENT_ID,
    telemetryMaxClockSkewSeconds: result.TELEMETRY_MAX_CLOCK_SKEW_SECONDS,
    telemetrySigningSecret: result.TELEMETRY_SIGNING_SECRET,
    webOrigin: result.WEB_ORIGIN,
  };
}
