import type { SignedSyntheticCallback } from "@automation-control-plane/contracts";
import { createHmac } from "node:crypto";

export function signSyntheticCallback(
  payload: SignedSyntheticCallback["payload"],
  secret: string,
  timestamp = Math.floor(Date.now() / 1_000),
): SignedSyntheticCallback {
  return {
    payload,
    signature: createHmac("sha256", secret)
      .update(`${timestamp}.${JSON.stringify(payload)}`)
      .digest("hex"),
    timestamp,
  };
}
