import { BadRequestException } from "@nestjs/common";
import type { z } from "zod";

export function parseRequest<Output>(
  schema: z.ZodType<Output>,
  value: unknown,
): Output {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new BadRequestException(
      "The request does not match the synthetic API contract.",
    );
  }
  return result.data;
}

export function optionalHeader(
  value: string | string[] | undefined,
): string | undefined {
  return typeof value === "string" ? value : undefined;
}
