import { Global, Module } from "@nestjs/common";

import { ENVIRONMENT, readEnvironment } from "./environment.js";

@Global()
@Module({
  providers: [
    {
      provide: ENVIRONMENT,
      useFactory: () => readEnvironment(process.env),
    },
  ],
  exports: [ENVIRONMENT],
})
export class EnvironmentModule {}
