import { describe, expect, it } from "vitest";

import { OtlpTraceEmitter, parseTraceparent } from "./tracing.js";

describe("trace context", () => {
  it("continues a valid sampled W3C trace", () => {
    const context = parseTraceparent(
      "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01",
    );

    expect(context).toMatchObject({
      parentSpanId: "00f067aa0ba902b7",
      sampled: true,
      traceId: "4bf92f3577b34da6a3ce929d0e0e4736",
    });
    expect(context.spanId).toMatch(/^[a-f0-9]{16}$/u);
  });

  it("creates a new trace for an invalid header", () => {
    const context = parseTraceparent("not-a-traceparent");

    expect(context.parentSpanId).toBeUndefined();
    expect(context.sampled).toBe(true);
    expect(context.traceId).toMatch(/^[a-f0-9]{32}$/u);
    expect(context.spanId).toMatch(/^[a-f0-9]{16}$/u);
  });

  it("does not export when no collector endpoint is configured", () => {
    const emitter = new OtlpTraceEmitter({
      serviceName: "test-service",
      serviceVersion: "1.0.0",
    });
    const span = emitter.startSpan({
      kind: "internal",
      name: "test span",
    });

    expect(span.traceparent).toMatch(/^00-[a-f0-9]{32}-[a-f0-9]{16}-01$/u);
    expect(() => span.end({ status: "ok" })).not.toThrow();
  });
});
