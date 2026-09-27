import {
  GatewayTimeoutException,
  ServiceUnavailableException,
} from "@nestjs/common";

export type FailureMode = "TRANSIENT" | "TIMEOUT" | "UNCERTAIN";

export function parseFailureMode(
  value: string | string[] | undefined,
): FailureMode | undefined {
  if (typeof value !== "string" || value.length === 0) {
    return undefined;
  }
  if (value === "TRANSIENT" || value === "TIMEOUT" || value === "UNCERTAIN") {
    return value;
  }
  throw new ServiceUnavailableException(
    "Unsupported deterministic failure mode.",
  );
}

export function failBeforeSideEffect(mode: FailureMode | undefined): void {
  if (mode === "TRANSIENT") {
    throw new ServiceUnavailableException(
      "Synthetic transient dependency failure.",
    );
  }
  if (mode === "TIMEOUT") {
    throw new GatewayTimeoutException(
      "Synthetic timeout before the side effect.",
    );
  }
}

export function failAfterSideEffect(mode: FailureMode | undefined): void {
  if (mode === "UNCERTAIN") {
    throw new GatewayTimeoutException(
      "Synthetic timeout after the side effect; reconcile before retrying.",
    );
  }
}
