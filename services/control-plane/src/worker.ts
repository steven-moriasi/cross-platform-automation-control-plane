import { Logger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";

import { WorkerRuntimeService } from "./worker-runtime.service.js";
import { WorkerModule } from "./worker.module.js";

const logger = new Logger("ControlPlaneWorker");
const application = await NestFactory.createApplicationContext(WorkerModule, {
  bufferLogs: true,
});
application.useLogger(logger);

const abortController = new AbortController();
const shutdown = (): void => abortController.abort();
process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);

try {
  await application.get(WorkerRuntimeService).run(abortController.signal);
} finally {
  await application.close();
}
