import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import { Logger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from "@nestjs/platform-fastify";

import { AppModule } from "./app.module.js";
import { readEnvironment } from "./environment.js";

const environment = readEnvironment(process.env);
const app = await NestFactory.create<NestFastifyApplication>(
  AppModule,
  new FastifyAdapter({
    bodyLimit: environment.maxRequestBodyBytes,
    trustProxy: false,
  }),
  { bufferLogs: true },
);

app.useLogger(new Logger("SyntheticOperationsApi"));
app.enableShutdownHooks();
await app.register(helmet, {
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
});
await app.register(cors, {
  methods: ["GET", "POST"],
  origin: environment.webOrigin,
});

await app.listen(environment.port, "0.0.0.0");
