import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import { OtlpTraceEmitter } from "@automation-control-plane/observability";
import { Logger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from "@nestjs/platform-fastify";

import { AppModule } from "./app.module.js";
import { readEnvironment } from "./config/environment.js";
import { resolveRequestId } from "./http/request-id.js";
import { MetricsService } from "./observability/metrics.service.js";

const environment = readEnvironment(process.env);
const adapter = new FastifyAdapter({
  bodyLimit: environment.maxRequestBodyBytes,
  trustProxy: false,
});
const app = await NestFactory.create<NestFastifyApplication>(
  AppModule,
  adapter,
  {
    bufferLogs: true,
  },
);

app.useLogger(new Logger("ControlPlaneApi"));
app.enableShutdownHooks();
app.setGlobalPrefix("api/v1", {
  exclude: ["health/live", "health/ready", "metrics"],
});

await app.register(helmet, {
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
});
await app.register(cors, {
  credentials: true,
  methods: ["DELETE", "GET", "PATCH", "POST", "PUT"],
  origin: environment.webOrigin,
});

const metrics = app.get(MetricsService);
const traces = new OtlpTraceEmitter({
  endpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
  serviceName: "control-plane-api",
  serviceVersion: environment.serviceVersion,
});
const requestTimings = new WeakMap<object, number>();
const requestSpans = new WeakMap<object, ReturnType<typeof traces.startSpan>>();
const fastify = app.getHttpAdapter().getInstance();

fastify.addHook("onRequest", (request, reply, done) => {
  const requestIdHeader = request.headers["x-request-id"];
  const requestId = resolveRequestId(
    Array.isArray(requestIdHeader) ? requestIdHeader[0] : requestIdHeader,
  );
  request.id = requestId;
  reply.header("x-request-id", requestId);
  requestTimings.set(request, performance.now());
  const traceparentHeader = request.headers.traceparent;
  const span = traces.startSpan({
    attributes: {
      "http.request.method": request.method,
      "server.address": request.hostname,
    },
    kind: "server",
    name: `HTTP ${request.method}`,
    traceparent: Array.isArray(traceparentHeader)
      ? traceparentHeader[0]
      : traceparentHeader,
  });
  requestSpans.set(request, span);
  reply.header("traceparent", span.traceparent);
  done();
});

fastify.addHook("onResponse", (request, reply, done) => {
  const route = request.routeOptions.url ?? "unmatched";
  const startedAt = requestTimings.get(request) ?? performance.now();
  const durationSeconds = (performance.now() - startedAt) / 1_000;
  metrics.observeRequest(
    request.method,
    route,
    reply.statusCode,
    durationSeconds,
  );
  requestSpans.get(request)?.end({
    attributes: {
      "http.response.status_code": reply.statusCode,
      "http.route": route,
      "request.id": request.id,
    },
    status: reply.statusCode >= 500 ? "error" : "ok",
  });
  done();
});

await app.listen(environment.port, "0.0.0.0");
