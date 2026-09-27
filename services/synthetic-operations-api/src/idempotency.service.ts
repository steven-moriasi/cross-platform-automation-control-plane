import { createHash } from "node:crypto";

import {
  BadRequestException,
  ConflictException,
  Injectable,
} from "@nestjs/common";

interface IdempotencyRecord {
  readonly requestHash: string;
  readonly value: unknown;
}

export interface IdempotentResult<Value> {
  readonly replayed: boolean;
  readonly value: Value;
}

@Injectable()
export class IdempotencyService {
  private readonly records = new Map<string, IdempotencyRecord>();

  public execute<Value>(
    operation: string,
    key: string | undefined,
    request: unknown,
    action: () => Value,
  ): IdempotentResult<Value> {
    if (
      key === undefined ||
      key.length < 8 ||
      key.length > 200 ||
      !/^[A-Za-z0-9._:-]+$/.test(key)
    ) {
      throw new BadRequestException(
        "A valid x-idempotency-key header is required.",
      );
    }

    const recordKey = `${operation}:${key}`;
    const requestHash = createHash("sha256")
      .update(JSON.stringify(request))
      .digest("hex");
    const existing = this.records.get(recordKey);
    if (existing !== undefined) {
      if (existing.requestHash !== requestHash) {
        throw new ConflictException(
          "The idempotency key was already used with different input.",
        );
      }
      return { replayed: true, value: existing.value as Value };
    }

    const value = action();
    this.records.set(recordKey, { requestHash, value });
    return { replayed: false, value };
  }
}
