import { randomUUID } from "node:crypto";

const requestIdPattern = /^[A-Za-z0-9._:-]{8,100}$/;

export function resolveRequestId(header: string | undefined): string {
  return header !== undefined && requestIdPattern.test(header)
    ? header
    : randomUUID();
}
