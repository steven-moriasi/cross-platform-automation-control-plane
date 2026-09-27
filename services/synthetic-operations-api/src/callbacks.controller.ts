import type { SignedSyntheticCallback } from "@automation-control-plane/contracts";
import {
  Controller,
  Get,
  Inject,
  NotFoundException,
  Param,
} from "@nestjs/common";

import { signSyntheticCallback } from "./callback-signature.js";
import { readEnvironment } from "./environment.js";
import { SyntheticStore } from "./synthetic-store.js";

@Controller("api/v1/callbacks")
export class CallbacksController {
  public constructor(
    @Inject(SyntheticStore) private readonly store: SyntheticStore,
  ) {}

  @Get(":operationId")
  public callback(
    @Param("operationId") operationId: string,
  ): SignedSyntheticCallback {
    const payload = this.store.callbackPayloads.get(operationId);
    if (payload === undefined) {
      throw new NotFoundException(
        `Synthetic operation ${operationId} was not found.`,
      );
    }
    return signSyntheticCallback(
      payload,
      readEnvironment(process.env).syntheticCallbackSecret,
    );
  }
}
