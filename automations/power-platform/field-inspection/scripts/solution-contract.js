"use strict";

const fs = require("node:fs");
const path = require("node:path");

const packageRoot = path.resolve(__dirname, "..");

const requiredFiles = [
  "HOSTED_VERIFICATION.md",
  "contracts/field-inspection-approval.json",
  "contracts/security-roles.json",
  "deployment/deployment-settings.template.json",
  "solution/Connectors/ste_syntheticoperations.yml",
  "solution/Connectors/ste_syntheticoperations/apiDefinition.swagger.json",
  "solution/Connectors/ste_syntheticoperations/apiProperties.json",
  "solution/EnvironmentVariables/ste_SyntheticOperationsApiUrl.xml",
  "solution/connectionreferences/ste_SyntheticOperations.yml",
  "solution/publishers/SyntheticAutomation/publisher.yml",
  "solution/solutions/FieldInspectionAutomation/missingdependencies.yml",
  "solution/solutions/FieldInspectionAutomation/rootcomponents.yml",
  "solution/solutions/FieldInspectionAutomation/solution.yml",
  "solution/solutions/FieldInspectionAutomation/solutioncomponents.yml",
];

const assertContract = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

const readJson = (relativePath) =>
  JSON.parse(fs.readFileSync(path.join(packageRoot, relativePath), "utf8"));

const readText = (relativePath) =>
  fs.readFileSync(path.join(packageRoot, relativePath), "utf8");

const listFiles = (directory) =>
  fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      return listFiles(fullPath);
    }
    return [fullPath];
  });

const getOperation = (openApi, route, method) => {
  const operation = openApi.paths?.[route]?.[method];
  assertContract(
    operation !== undefined,
    `Missing ${method.toUpperCase()} ${route}.`,
  );
  return operation;
};

const validateOpenApi = (openApi) => {
  assertContract(
    openApi.swagger === "2.0",
    "The connector must use OpenAPI 2.",
  );
  assertContract(
    openApi.host === "synthetic-operations-api.example.test",
    "The connector host must remain a public example placeholder.",
  );
  assertContract(
    JSON.stringify(openApi.schemes) === JSON.stringify(["https"]),
    "The connector must permit HTTPS only.",
  );
  assertContract(
    openApi.securityDefinitions?.apiKey?.type === "apiKey" &&
      openApi.securityDefinitions.apiKey.in === "header" &&
      openApi.securityDefinitions.apiKey.name === "x-synthetic-api-key",
    "The connector must use the synthetic API key header.",
  );

  const create = getOperation(openApi, "/field-inspections", "post");
  const get = getOperation(openApi, "/field-inspections/{inspectionId}", "get");
  const decide = getOperation(
    openApi,
    "/field-inspections/{inspectionId}/decision",
    "post",
  );
  const operations = [create, get, decide];
  assertContract(
    new Set(operations.map((operation) => operation.operationId)).size ===
      operations.length,
    "Connector operation IDs must be unique.",
  );

  for (const operation of [create, decide]) {
    const idempotencyHeader = operation.parameters.find(
      (parameter) =>
        parameter.in === "header" && parameter.name === "x-idempotency-key",
    );
    assertContract(
      idempotencyHeader?.required === true,
      `${operation.operationId} must require an idempotency key.`,
    );
  }

  const requestSchema =
    openApi.definitions?.FieldInspectionRequest?.properties?.outcome;
  assertContract(
    JSON.stringify(requestSchema?.enum) ===
      JSON.stringify(["PASS", "REQUIRES_REMEDIATION"]),
    "Inspection outcomes must match the synthetic API contract.",
  );
  const decision = openApi.definitions?.InspectionDecision?.properties;
  assertContract(
    JSON.stringify(decision?.decision?.enum) ===
      JSON.stringify(["APPROVE", "REJECT"]),
    "Inspection decisions must match the synthetic API contract.",
  );
  assertContract(
    decision?.rationale?.minLength === 10 &&
      decision.rationale.maxLength === 1000,
    "Approval rationale bounds must match the synthetic API contract.",
  );
};

const validateApiProperties = (apiProperties) => {
  const apiKey = apiProperties.properties?.connectionParameters?.api_key;
  assertContract(
    apiKey?.type === "securestring",
    "The connector API key must be a secure string.",
  );
  assertContract(
    apiKey.uiDefinition?.constraints?.clearText === false,
    "The connector API key must not be displayed in clear text.",
  );
  assertContract(
    apiProperties.properties?.policyTemplateInstances?.length === 0,
    "The connector must not inject hard-coded policy values.",
  );
};

const validateRoles = (roleContract) => {
  assertContract(
    roleContract.hostedVerification === "UNVERIFIED",
    "Hosted security-role verification must remain explicit.",
  );
  assertContract(roleContract.roles?.length === 3, "Three roles are required.");
  const roles = new Map(roleContract.roles.map((role) => [role.name, role]));
  const inspector = roles.get("Field Inspector");
  const approver = roles.get("Field Inspection Approver");
  const administrator = roles.get("Field Inspection Administrator");
  assertContract(
    inspector?.permissions.includes("inspection.submit") &&
      inspector.restrictions.includes("inspection.decide"),
    "Inspectors must submit inspections without deciding them.",
  );
  assertContract(
    approver?.permissions.includes("inspection.decide") &&
      approver.restrictions.includes("inspection.decide_own"),
    "Approvers must be unable to self-approve.",
  );
  assertContract(
    administrator?.permissions.includes("solution.configure") &&
      administrator.restrictions.includes("inspection.decide"),
    "Administrators must configure the solution without business approval.",
  );
};

const validateApproval = (approvalContract) => {
  assertContract(
    approvalContract.hostedVerification === "UNVERIFIED",
    "Hosted approval verification must remain explicit.",
  );
  assertContract(
    approvalContract.trigger?.operationId === "CreateFieldInspection" &&
      approvalContract.trigger.approvalRequiredWhen?.outcome ===
        "REQUIRES_REMEDIATION",
    "Remediation inspections must enter approval.",
  );
  assertContract(
    approvalContract.submission?.uncertainOutcomeRecovery?.operationId ===
      "GetFieldInspection" &&
      approvalContract.submission.uncertainOutcomeRecovery
        .retryMutationOnlyWhenStatus === 404,
    "Uncertain submissions must be reconciled before retry.",
  );
  assertContract(
    approvalContract.approval?.selfApprovalAllowed === false &&
      approvalContract.approval?.rationale?.minimumLength === 10 &&
      approvalContract.approval?.rationale?.maximumLength === 1000,
    "Approval separation and rationale bounds are required.",
  );
  assertContract(
    approvalContract.audit?.metadataOnly === true &&
      approvalContract.audit.forbiddenFields.includes("apiKey") &&
      approvalContract.audit.forbiddenFields.includes("documentContent"),
    "Approval audit events must remain metadata-only.",
  );
};

const validateDeploymentSettings = (settings) => {
  assertContract(
    settings.EnvironmentVariables?.length === 1 &&
      settings.EnvironmentVariables[0].SchemaName ===
        "ste_SyntheticOperationsApiUrl" &&
      settings.EnvironmentVariables[0].Value.endsWith(".example.test"),
    "Deployment settings must retain the example API URL.",
  );
  assertContract(
    settings.ConnectionReferences?.length === 1 &&
      settings.ConnectionReferences[0].LogicalName ===
        "ste_SyntheticOperations" &&
      settings.ConnectionReferences[0].ConnectionId === "",
    "Deployment settings must not contain a connection ID.",
  );
};

const validateSourceSafety = () => {
  const forbiddenNames = [".env", ".pac", ".zapierrc"];
  const files = listFiles(packageRoot).filter(
    (file) =>
      !file.includes(`${path.sep}dist${path.sep}`) &&
      !file.includes(`${path.sep}node_modules${path.sep}`),
  );
  for (const file of files) {
    assertContract(
      !forbiddenNames.includes(path.basename(file)),
      `Platform-local credential file is forbidden: ${file}.`,
    );
  }

  const source = files
    .filter((file) => /\.(json|ya?ml|xml)$/u.test(file))
    .map((file) => fs.readFileSync(file, "utf8"))
    .join("\n");
  assertContract(
    !/https:\/\/[^/\s"]+\.crm\d*\.dynamics\.com/iu.test(source),
    "Tenant-specific Dataverse URLs are forbidden.",
  );
  assertContract(
    !/\/environments\/[a-z0-9-]{16,}/iu.test(source),
    "Power Platform environment IDs are forbidden.",
  );
  assertContract(
    !/"ConnectionId"\s*:\s*"[^"]+"/u.test(source),
    "Committed connection IDs are forbidden.",
  );
};

const validateSolution = () => {
  for (const relativePath of requiredFiles) {
    assertContract(
      fs.existsSync(path.join(packageRoot, relativePath)),
      `Missing required source file: ${relativePath}.`,
    );
  }
  const solution = readText(
    "solution/solutions/FieldInspectionAutomation/solution.yml",
  );
  assertContract(
    solution.includes("UniqueName: FieldInspectionAutomation") &&
      solution.includes("Version: 1.0.0.0") &&
      solution.includes("UniqueName: SyntheticAutomation"),
    "Solution identity and publisher metadata are required.",
  );
  const rootComponents = readText(
    "solution/solutions/FieldInspectionAutomation/rootcomponents.yml",
  ).trim();
  assertContract(
    rootComponents === "RootComponents:",
    "Locally invented hosted components must not be declared as roots.",
  );
  const components = readText(
    "solution/solutions/FieldInspectionAutomation/solutioncomponents.yml",
  );
  for (const componentPath of [
    "/Connectors",
    "/EnvironmentVariables",
    "/connectionreferences",
  ]) {
    assertContract(
      components.includes(componentPath),
      `Solution source must include ${componentPath}.`,
    );
  }

  validateOpenApi(
    readJson(
      "solution/Connectors/ste_syntheticoperations/apiDefinition.swagger.json",
    ),
  );
  validateApiProperties(
    readJson("solution/Connectors/ste_syntheticoperations/apiProperties.json"),
  );
  validateRoles(readJson("contracts/security-roles.json"));
  validateApproval(readJson("contracts/field-inspection-approval.json"));
  validateDeploymentSettings(
    readJson("deployment/deployment-settings.template.json"),
  );
  validateSourceSafety();
};

module.exports = {
  packageRoot,
  readJson,
  validateApiProperties,
  validateApproval,
  validateDeploymentSettings,
  validateOpenApi,
  validateRoles,
  validateSolution,
  validateSourceSafety,
};
