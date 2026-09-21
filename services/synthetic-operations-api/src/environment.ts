import { z } from "zod";

const environmentSchema = z.object({
  MAX_REQUEST_BODY_BYTES: z.coerce
    .number()
    .int()
    .min(16_384)
    .max(1_048_576)
    .default(262_144),
  PORT: z.coerce.number().int().min(1).max(65_535).default(4100),
  SERVICE_VERSION: z.string().trim().min(1).max(64).default("0.1.0"),
  WEB_ORIGIN: z.string().url().default("http://localhost:3000"),
});

export interface Environment {
  readonly maxRequestBodyBytes: number;
  readonly port: number;
  readonly serviceVersion: string;
  readonly webOrigin: string;
}

export function readEnvironment(source: NodeJS.ProcessEnv): Environment {
  const result = environmentSchema.parse(source);

  return {
    maxRequestBodyBytes: result.MAX_REQUEST_BODY_BYTES,
    port: result.PORT,
    serviceVersion: result.SERVICE_VERSION,
    webOrigin: result.WEB_ORIGIN,
  };
}
