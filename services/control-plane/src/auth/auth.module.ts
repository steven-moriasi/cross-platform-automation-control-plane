import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";

import { AuthGuard } from "./auth.guard.js";
import { TokenVerifier } from "./token-verifier.js";

@Module({
  providers: [
    TokenVerifier,
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
  ],
})
export class AuthModule {}
