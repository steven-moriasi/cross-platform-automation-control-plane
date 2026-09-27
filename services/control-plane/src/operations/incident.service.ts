import {
  incidentActionSchema,
  type AuthenticatedPrincipal,
  type IncidentHistoryRecord,
  type IncidentRecord,
} from "@automation-control-plane/contracts";
import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";

import { IncidentRepository } from "./incident.repository.js";
import { isIncidentActionAllowed } from "./operations-policy.js";

@Injectable()
export class IncidentService {
  public constructor(
    @Inject(IncidentRepository)
    private readonly repository: IncidentRepository,
  ) {}

  public async list(): Promise<readonly IncidentRecord[]> {
    return this.repository.list();
  }

  public async getById(id: string): Promise<IncidentRecord> {
    const incident = await this.repository.getById(id);
    if (incident === undefined) {
      throw new NotFoundException(`Incident ${id} was not found.`);
    }
    return incident;
  }

  public async history(id: string): Promise<readonly IncidentHistoryRecord[]> {
    await this.getById(id);
    return this.repository.history(id);
  }

  public async applyAction(
    id: string,
    value: unknown,
    principal: AuthenticatedPrincipal,
  ): Promise<IncidentRecord> {
    const parsed = incidentActionSchema.safeParse(value);
    if (!parsed.success) {
      throw new BadRequestException(
        "The incident action does not match the operations contract.",
      );
    }
    const current = await this.getById(id);
    if (!isIncidentActionAllowed(current.status, parsed.data.action)) {
      throw new ConflictException(
        "The incident action is invalid for its current state.",
      );
    }
    const incident = await this.repository.applyAction(
      id,
      parsed.data,
      principal,
    );
    if (incident === undefined) {
      throw new ConflictException(
        "The incident action is invalid for its current state.",
      );
    }
    return incident;
  }
}
