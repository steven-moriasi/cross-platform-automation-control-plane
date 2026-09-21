import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import { Logger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from "@nestjs/platform-fastify";

import { AppModule } from "./app.module.js";
import { readEnvironment } from "./config/environment.js";
import { resolveRequestId } from "./http/request-id.js";

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
  exclude: ["health/live", "health/ready"],
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

app
  .getHttpAdapter()
  .getInstance()
  .addHook("onRequest", (request, reply, done) => {
    const requestIdHeader = request.headers["x-request-id"];
    const requestId = resolveRequestId(
      Array.isArray(requestIdHeader) ? requestIdHeader[0] : requestIdHeader,
    );
    request.id = requestId;
    reply.header("x-request-id", requestId);
    done();
  });

await app.listen(environment.port, "0.0.0.0");
