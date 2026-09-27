import type { TelemetryReceipt } from "@automation-control-plane/contracts";
import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  HttpCode,
  Inject,
  Post,
} from "@nestjs/common";

import { AllowAnonymous } from "../auth/auth.decorators.js";
import { TelemetryService } from "./telemetry.service.js";

function requiredHeader(
  value: string | string[] | undefined,
  name: string,
): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new BadRequestException(`${name} is required.`);
  }
  return value;
}

@Controller("telemetry")
export class TelemetryController {
  public constructor(
    @Inject(TelemetryService) private readonly telemetry: TelemetryService,
  ) {}

  @AllowAnonymous()
  @HttpCode(202)
  @Post("events")
  public async ingest(
    @Body() body: unknown,
    @Headers("x-telemetry-client-id")
    clientIdHeader: string | string[] | undefined,
    @Headers("x-telemetry-signature")
    signatureHeader: string | string[] | undefined,
    @Headers("x-telemetry-timestamp")
    timestampHeader: string | string[] | undefined,
  ): Promise<TelemetryReceipt> {
    const timestampValue = requiredHeader(
      timestampHeader,
      "x-telemetry-timestamp",
    );
    const timestamp = Number(timestampValue);
    if (!Number.isInteger(timestamp)) {
      throw new BadRequestException(
        "x-telemetry-timestamp must be Unix seconds.",
      );
    }

    return this.telemetry.ingest(body, {
      clientId: requiredHeader(clientIdHeader, "x-telemetry-client-id"),
      signature: requiredHeader(signatureHeader, "x-telemetry-signature"),
      timestamp,
    });
  }
}
