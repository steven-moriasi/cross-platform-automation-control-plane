import { randomBytes } from "node:crypto";

export type SpanKind =
  "client" | "consumer" | "internal" | "producer" | "server";
export type SpanStatus = "error" | "ok" | "unset";
export type TraceAttributeValue = boolean | number | string;

interface OtlpTraceEmitterOptions {
  readonly endpoint?: string | undefined;
  readonly serviceName: string;
  readonly serviceVersion: string;
}

interface StartSpanOptions {
  readonly attributes?: Readonly<Record<string, TraceAttributeValue>>;
  readonly kind: SpanKind;
  readonly name: string;
  readonly traceparent?: string | undefined;
}

interface EndSpanOptions {
  readonly attributes?: Readonly<Record<string, TraceAttributeValue>>;
  readonly status?: SpanStatus;
}

interface TraceContext {
  readonly parentSpanId?: string;
  readonly sampled: boolean;
  readonly spanId: string;
  readonly traceId: string;
}

interface OtlpAttribute {
  readonly key: string;
  readonly value:
    | { readonly boolValue: boolean }
    | { readonly doubleValue: number }
    | { readonly stringValue: string };
}

interface CompletedSpan {
  readonly attributes: readonly OtlpAttribute[];
  readonly endTimeUnixNano: string;
  readonly kind: number;
  readonly name: string;
  readonly parentSpanId?: string;
  readonly spanId: string;
  readonly startTimeUnixNano: string;
  readonly status: { readonly code: number };
  readonly traceId: string;
}

export interface TraceSpan {
  readonly traceparent: string;
  end(options?: EndSpanOptions): void;
}

const kindCodes: Readonly<Record<SpanKind, number>> = {
  client: 3,
  consumer: 5,
  internal: 1,
  producer: 4,
  server: 2,
};

const statusCodes: Readonly<Record<SpanStatus, number>> = {
  error: 2,
  ok: 1,
  unset: 0,
};

function randomHex(bytes: number): string {
  return randomBytes(bytes).toString("hex");
}

function unixNanoseconds(): string {
  return (BigInt(Date.now()) * 1_000_000n).toString();
}

function toOtlpAttributes(
  attributes: Readonly<Record<string, TraceAttributeValue>>,
): readonly OtlpAttribute[] {
  return Object.entries(attributes).map(([key, value]) => {
    if (typeof value === "boolean") {
      return { key, value: { boolValue: value } };
    }
    if (typeof value === "number") {
      return { key, value: { doubleValue: value } };
    }
    return { key, value: { stringValue: value } };
  });
}

export function parseTraceparent(value: string | undefined): TraceContext {
  const match =
    value?.match(/^00-([a-f0-9]{32})-([a-f0-9]{16})-([a-f0-9]{2})$/u) ??
    undefined;
  const traceId = match?.[1];
  const parentSpanId = match?.[2];
  const flags = match?.[3];
  return {
    ...(parentSpanId === undefined ? {} : { parentSpanId }),
    sampled: flags === undefined || (Number.parseInt(flags, 16) & 1) === 1,
    spanId: randomHex(8),
    traceId: traceId ?? randomHex(16),
  };
}

export class OtlpTraceEmitter {
  private readonly endpoint: string | undefined;

  public constructor(private readonly options: OtlpTraceEmitterOptions) {
    this.endpoint =
      options.endpoint === undefined
        ? undefined
        : `${options.endpoint.replace(/\/$/u, "")}/v1/traces`;
  }

  public startSpan(options: StartSpanOptions): TraceSpan {
    const context = parseTraceparent(options.traceparent);
    const startTimeUnixNano = unixNanoseconds();

    return {
      traceparent: `00-${context.traceId}-${context.spanId}-${context.sampled ? "01" : "00"}`,
      end: (endOptions = {}): void => {
        if (this.endpoint === undefined || !context.sampled) {
          return;
        }

        const span: CompletedSpan = {
          attributes: toOtlpAttributes({
            ...options.attributes,
            ...endOptions.attributes,
          }),
          endTimeUnixNano: unixNanoseconds(),
          kind: kindCodes[options.kind],
          name: options.name,
          ...(context.parentSpanId === undefined
            ? {}
            : { parentSpanId: context.parentSpanId }),
          spanId: context.spanId,
          startTimeUnixNano,
          status: { code: statusCodes[endOptions.status ?? "unset"] },
          traceId: context.traceId,
        };
        void this.export(span);
      },
    };
  }

  private async export(span: CompletedSpan): Promise<void> {
    try {
      await fetch(this.endpoint!, {
        body: JSON.stringify({
          resourceSpans: [
            {
              resource: {
                attributes: toOtlpAttributes({
                  "service.name": this.options.serviceName,
                  "service.version": this.options.serviceVersion,
                }),
              },
              scopeSpans: [
                {
                  scope: {
                    name: "@automation-control-plane/observability",
                    version: "0.1.0",
                  },
                  spans: [span],
                },
              ],
            },
          ],
        }),
        headers: { "content-type": "application/json" },
        method: "POST",
        signal: AbortSignal.timeout(2_000),
      });
    } catch {
      return;
    }
  }
}
