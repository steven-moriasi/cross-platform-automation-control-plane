import { afterEach, describe, expect, it } from "vitest";

import {
  readAuthConfiguration,
  resetAuthConfigurationForTests,
} from "./config";

const originalEnvironment = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnvironment };
  resetAuthConfigurationForTests();
});

describe("web authentication configuration", () => {
  it("uses an internal endpoint without changing the public issuer", () => {
    process.env.OIDC_CLIENT_SECRET = "local-client-secret-for-tests";
    process.env.OIDC_INTERNAL_BASE_URL = "http://keycloak:8080";
    process.env.SESSION_SECRET = "local-session-secret-for-tests-12345";

    expect(readAuthConfiguration()).toMatchObject({
      internalTokenUrl:
        "http://keycloak:8080/realms/automation-control-plane/protocol/openid-connect/token",
      publicIssuer: "http://localhost:8089/realms/automation-control-plane",
    });
  });
});
