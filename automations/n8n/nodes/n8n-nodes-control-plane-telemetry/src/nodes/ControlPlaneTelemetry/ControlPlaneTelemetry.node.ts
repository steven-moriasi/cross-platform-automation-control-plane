import { createHash, createHmac } from "node:crypto";

import type {
  IExecuteFunctions,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
} from "n8n-workflow";

type TerminalStatus = "FAILED" | "SUCCEEDED" | "TIMED_OUT";

function deterministicUuid(input: string): string {
  const digest = createHash("sha256").update(input).digest("hex");
  return [
    digest.slice(0, 8),
    digest.slice(8, 12),
    `4${digest.slice(13, 16)}`,
    `8${digest.slice(17, 20)}`,
    digest.slice(20, 32),
  ].join("-");
}

export class ControlPlaneTelemetry implements INodeType {
  public readonly description: INodeTypeDescription = {
    defaults: {
      name: "Control Plane Telemetry",
    },
    description:
      "Emits signed, metadata-only execution telemetry to the automation control plane.",
    displayName: "Control Plane Telemetry",
    group: ["output"],
    icon: "fa:signal",
    inputs: ["main"],
    name: "controlPlaneTelemetry",
    outputs: ["main"],
    properties: [
      {
        default: "http://control-plane-api:4000",
        displayName: "Control Plane URL",
        name: "controlPlaneUrl",
        required: true,
        type: "string",
      },
      {
        default: "claims-intake-n8n",
        displayName: "Automation ID",
        name: "automationId",
        required: true,
        type: "string",
      },
      {
        default: "1.0.0",
        displayName: "Release Version",
        name: "releaseVersion",
        required: true,
        type: "string",
      },
      {
        default: "demo",
        displayName: "Environment",
        name: "environment",
        required: true,
        type: "string",
      },
      {
        default: "={{ $execution.id }}",
        displayName: "Execution ID",
        name: "executionId",
        required: true,
        type: "string",
      },
      {
        default: "SUCCEEDED",
        displayName: "Status",
        name: "status",
        options: [
          { name: "Failed", value: "FAILED" },
          { name: "Succeeded", value: "SUCCEEDED" },
          { name: "Timed Out", value: "TIMED_OUT" },
        ],
        required: true,
        type: "options",
      },
      {
        default: 0,
        displayName: "Duration (ms)",
        name: "durationMilliseconds",
        type: "number",
        typeOptions: {
          minValue: 0,
        },
      },
      {
        default: "",
        displayName: "Error Code",
        name: "errorCode",
        type: "string",
      },
      {
        default: "={{ $json.correlationId }}",
        displayName: "Correlation ID",
        name: "correlationId",
        type: "string",
      },
    ],
    version: 1,
  };

  public async execute(
    this: IExecuteFunctions,
  ): Promise<INodeExecutionData[][]> {
    const secret = process.env.TELEMETRY_SIGNING_SECRET;
    const clientId =
      process.env.TELEMETRY_CLIENT_ID ?? "local-automation-packages";
    if (secret === undefined || secret.length < 32) {
      throw new Error(
        "TELEMETRY_SIGNING_SECRET must contain at least 32 characters.",
      );
    }

    const items = this.getInputData();
    const output: INodeExecutionData[] = [];
    for (let index = 0; index < items.length; index += 1) {
      const status = this.getNodeParameter("status", index) as TerminalStatus;
      const errorCode = this.getNodeParameter("errorCode", index) as string;
      if (status !== "SUCCEEDED" && errorCode.trim().length === 0) {
        throw new Error("Failed and timed-out events require an error code.");
      }

      const executionId =
        (this.getNodeParameter("executionId", index) as string) ||
        this.getExecutionId();
      const event = {
        schema_version: "1.0",
        event_id: deterministicUuid(
          `${executionId}:${this.getNode().id}:${status}`,
        ),
        automation_id: this.getNodeParameter("automationId", index) as string,
        release_version: this.getNodeParameter(
          "releaseVersion",
          index,
        ) as string,
        platform: "n8n",
        environment: this.getNodeParameter("environment", index) as string,
        execution_id: executionId,
        status,
        occurred_at: new Date().toISOString(),
        duration_ms: this.getNodeParameter(
          "durationMilliseconds",
          index,
        ) as number,
        ...(errorCode.trim().length === 0
          ? {}
          : { error_code: errorCode.trim() }),
        correlation_id: this.getNodeParameter("correlationId", index) as string,
      };
      const timestamp = Math.floor(Date.now() / 1_000);
      const signature = createHmac("sha256", secret)
        .update(`${timestamp}.${JSON.stringify(event)}`)
        .digest("hex");
      const controlPlaneUrl = (
        this.getNodeParameter("controlPlaneUrl", index) as string
      ).replace(/\/$/, "");
      const receipt = await this.helpers.httpRequest({
        body: event,
        headers: {
          "x-telemetry-client-id": clientId,
          "x-telemetry-signature": signature,
          "x-telemetry-timestamp": String(timestamp),
        },
        json: true,
        method: "POST",
        url: `${controlPlaneUrl}/api/v1/telemetry/events`,
      });
      const item = items[index];
      if (item === undefined) {
        continue;
      }
      output.push({
        json: {
          ...item.json,
          telemetryReceipt: receipt,
        },
        pairedItem: { item: index },
      });
    }
    return [output];
  }
}
