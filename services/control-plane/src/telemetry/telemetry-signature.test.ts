import { parseExecutionEvent } from "@automation-control-plane/contracts";
import { describe, expect, it } from "vitest";

import {
  createTelemetrySignature,
  verifyTelemetrySignature,
} from "./telemetry-signature.js";

const event = parseExecutionEvent({
  schema_version: "1.0",
  event_id: "3df0bbf4-047d-4e30-a739-b925db9233c2",
  automation_id: "claims-intake-n8n",
  release_version: "1.0.0",
  platform: "n8n",
  environment: "demo",
  execution_id: "synthetic-execution-1",
  status: "STARTED",
  occurred_at: "2026-09-27T18:00:00Z",
});

describe("telemetry signatures", () => {
  it("verifies a current signature from the configured machine identity", () => {
    const timestamp = 1_800_000_000;
    const secret = "local-telemetry-signing-secret-change-me";
    expect(
      verifyTelemetrySignature(
        event,
        {
          clientId: "local-automation-packages",
          signature: createTelemetrySignature(event, timestamp, secret),
          timestamp,
        },
        "local-automation-packages",
        secret,
        300,
        timestamp + 30,
      ),
    ).toBe(true);
  });

  it("rejects stale requests even when the signature is valid", () => {
    const timestamp = 1_800_000_000;
    const secret = "local-telemetry-signing-secret-change-me";
    expect(
      verifyTelemetrySignature(
        event,
        {
          clientId: "local-automation-packages",
          signature: createTelemetrySignature(event, timestamp, secret),
          timestamp,
        },
        "local-automation-packages",
        secret,
        300,
        timestamp + 301,
      ),
    ).toBe(false);
  });
});
