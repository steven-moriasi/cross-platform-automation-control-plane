import {
  executionEventSigningPayload,
  type ExecutionEvent,
} from "@automation-control-plane/contracts";
import { createHmac, timingSafeEqual } from "node:crypto";

export interface TelemetrySignatureHeaders {
  readonly clientId: string;
  readonly signature: string;
  readonly timestamp: number;
}

export function createTelemetrySignature(
  event: ExecutionEvent,
  timestamp: number,
  secret: string,
): string {
  return createHmac("sha256", secret)
    .update(executionEventSigningPayload(event, timestamp))
    .digest("hex");
}

export function verifyTelemetrySignature(
  event: ExecutionEvent,
  headers: TelemetrySignatureHeaders,
  expectedClientId: string,
  secret: string,
  maxClockSkewSeconds: number,
  nowSeconds = Math.floor(Date.now() / 1_000),
): boolean {
  if (
    headers.clientId !== expectedClientId ||
    !Number.isInteger(headers.timestamp) ||
    Math.abs(nowSeconds - headers.timestamp) > maxClockSkewSeconds ||
    !/^[a-f0-9]{64}$/.test(headers.signature)
  ) {
    return false;
  }

  const expected = Buffer.from(
    createTelemetrySignature(event, headers.timestamp, secret),
    "hex",
  );
  const supplied = Buffer.from(headers.signature, "hex");
  return (
    expected.length === supplied.length && timingSafeEqual(expected, supplied)
  );
}
