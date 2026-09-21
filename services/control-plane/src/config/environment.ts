import { z } from "zod";

const environmentSchema = z.object({
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
  PORT: z.coerce.number().int().min(1).max(65_535).default(4000),
  SERVICE_VERSION: z.string().trim().min(1).max(64).default("0.1.0"),
  WEB_ORIGIN: z.string().url().default("http://localhost:3000"),
});

export interface Environment {
  readonly databaseUrl: string;
  readonly maxRequestBodyBytes: number;
  readonly nodeEnvironment: "development" | "production" | "test";
  readonly port: number;
  readonly serviceVersion: string;
  readonly webOrigin: string;
}

export const ENVIRONMENT = Symbol("ENVIRONMENT");

export function readEnvironment(source: NodeJS.ProcessEnv): Environment {
  const result = environmentSchema.parse(source);

  return {
    databaseUrl: result.DATABASE_URL,
    maxRequestBodyBytes: result.MAX_REQUEST_BODY_BYTES,
    nodeEnvironment: result.NODE_ENV,
    port: result.PORT,
    serviceVersion: result.SERVICE_VERSION,
    webOrigin: result.WEB_ORIGIN,
  };
}
