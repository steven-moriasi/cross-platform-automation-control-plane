import type {
  CatalogAuditRecord,
  CatalogAutomation,
} from "@automation-control-plane/contracts";
import {
  Inject,
  Injectable,
  NotFoundException,
  type OnModuleInit,
} from "@nestjs/common";

import { ENVIRONMENT, type Environment } from "../config/environment.js";
import { loadCatalog } from "./catalog-loader.js";
import { CatalogRepository } from "./catalog.repository.js";

@Injectable()
export class CatalogService implements OnModuleInit {
  public constructor(
    @Inject(ENVIRONMENT) private readonly environment: Environment,
    @Inject(CatalogRepository) private readonly repository: CatalogRepository,
  ) {}

  public async onModuleInit(): Promise<void> {
    const catalog = await loadCatalog(this.environment.catalogRepositoryRoot);
    await this.repository.synchronize(catalog);
  }

  public async list(): Promise<readonly CatalogAutomation[]> {
    return this.repository.list();
  }

  public async getById(id: string): Promise<CatalogAutomation> {
    const automation = await this.repository.findById(id);
    if (automation === undefined) {
      throw new NotFoundException("Automation was not found.");
    }
    return automation;
  }

  public async listAudit(id: string): Promise<readonly CatalogAuditRecord[]> {
    await this.getById(id);
    return this.repository.listAudit(id);
  }
}
