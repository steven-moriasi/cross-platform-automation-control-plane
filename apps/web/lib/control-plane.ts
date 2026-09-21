import type { AuthenticatedPrincipal } from "@automation-control-plane/contracts";
import { z } from "zod";

import { readAuthConfiguration } from "./auth/config";

const principalSchema = z.object({
  displayName: z.string().min(1),
  email: z.string().email().optional(),
  roles: z.array(
    z.enum([
      "PLATFORM_ADMIN",
      "AUTOMATION_OWNER",
      "RELEASE_APPROVER",
      "OPERATOR",
      "AUDITOR",
      "VIEWER",
    ]),
  ),
  subject: z.string().min(1),
});

export async function getVerifiedPrincipal(
  accessToken: string,
): Promise<AuthenticatedPrincipal> {
  const configuration = readAuthConfiguration();
  const response = await fetch(
    `${configuration.controlPlaneInternalUrl}/api/v1/session`,
    {
      cache: "no-store",
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
    },
  );

  if (!response.ok) {
    throw new Error(
      `Control-plane session validation failed with status ${response.status}.`,
    );
  }

  const principal = principalSchema.parse(await response.json());
  return {
    displayName: principal.displayName,
    ...(principal.email === undefined ? {} : { email: principal.email }),
    roles: principal.roles,
    subject: principal.subject,
  };
}
