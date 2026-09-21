import type { AuthenticatedPrincipal } from "@automation-control-plane/contracts";
import { Controller, Get } from "@nestjs/common";

import { Principal } from "./auth.decorators.js";

@Controller("session")
export class SessionController {
  @Get()
  public getSession(
    @Principal() principal: AuthenticatedPrincipal,
  ): AuthenticatedPrincipal {
    return principal;
  }
}
