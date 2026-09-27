import {
  parseExecutionEvent,
  type TelemetryReceipt,
} from "@automation-control-plane/contracts";
import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";

import { ENVIRONMENT, type Environment } from "../config/environment.js";
import { TelemetryRepository } from "./telemetry.repository.js";
import {
  type TelemetrySignatureHeaders,
  verifyTelemetrySignature,
} from "./telemetry-signature.js";

@Injectable()
export class TelemetryService {
  public constructor(
    @Inject(ENVIRONMENT) private readonly environment: Environment,
    @Inject(TelemetryRepository)
    private readonly repository: TelemetryRepository,
  ) {}

  public async ingest(
    value: unknown,
    headers: TelemetrySignatureHeaders,
  ): Promise<TelemetryReceipt> {
    let event;
    try {
      event = parseExecutionEvent(value);
    } catch {
      throw new BadRequestException(
        "The execution event does not match the telemetry contract.",
      );
    }

    if (
      !verifyTelemetrySignature(
        event,
        headers,
        this.environment.telemetryClientId,
        this.environment.telemetrySigningSecret,
        this.environment.telemetryMaxClockSkewSeconds,
      )
    ) {
      throw new UnauthorizedException(
        "The telemetry request signature is invalid.",
      );
    }

    const registration = await this.repository.automationRegistration(event);
    if (registration === undefined) {
      throw new NotFoundException(
        `Automation ${event.automation_id} is not registered.`,
      );
    }
    if (
      registration.platform !== event.platform ||
      !registration.target_registered
    ) {
      throw new BadRequestException(
        "The telemetry platform or target environment is not registered.",
      );
    }

    return this.repository.accept(event, headers.clientId);
  }
}
