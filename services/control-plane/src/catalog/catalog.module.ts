import { Module } from "@nestjs/common";

import { DatabaseModule } from "../database/database.module.js";
import { CatalogController } from "./catalog.controller.js";
import { CatalogRepository } from "./catalog.repository.js";
import { CatalogService } from "./catalog.service.js";

@Module({
  imports: [DatabaseModule],
  controllers: [CatalogController],
  providers: [CatalogRepository, CatalogService],
})
export class CatalogModule {}
