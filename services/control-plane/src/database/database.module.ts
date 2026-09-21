import { Module } from "@nestjs/common";
import { Pool } from "pg";

import { ENVIRONMENT, type Environment } from "../config/environment.js";
import { EnvironmentModule } from "../config/environment.module.js";
import { DATABASE_POOL } from "./database.constants.js";
import { DatabaseService } from "./database.service.js";

@Module({
  imports: [EnvironmentModule],
  providers: [
    {
      provide: DATABASE_POOL,
      inject: [ENVIRONMENT],
      useFactory: (environment: Environment): Pool =>
        new Pool({
          application_name: "automation-control-plane",
          connectionString: environment.databaseUrl,
          max: 10,
          statement_timeout: 10_000,
        }),
    },
    DatabaseService,
  ],
  exports: [DatabaseService],
})
export class DatabaseModule {}
