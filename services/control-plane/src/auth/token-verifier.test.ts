import { describe, expect, it } from "vitest";

import { parsePrincipal } from "./token-verifier.js";

describe("access token claims", () => {
  it("keeps only roles understood by the control plane", () => {
    expect(
      parsePrincipal({
        email: "operator@example.test",
        preferred_username: "operator",
        realm_access: {
          roles: ["OPERATOR", "offline_access"],
        },
        sub: "user-123",
      }),
    ).toEqual({
      displayName: "operator",
      email: "operator@example.test",
      roles: ["OPERATOR"],
      subject: "user-123",
    });
  });

  it("requires a stable subject", () => {
    expect(() => parsePrincipal({ realm_access: { roles: [] } })).toThrow();
  });
});
