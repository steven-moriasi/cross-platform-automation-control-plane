"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

const {
  readJson,
  validateApiProperties,
  validateApproval,
  validateDeploymentSettings,
  validateOpenApi,
  validateRoles,
  validateSolution,
  validateSourceSafety,
} = require("../scripts/solution-contract");

test("validates the complete Power Platform source package", () => {
  assert.doesNotThrow(validateSolution);
});

test("requires replay-safe connector mutations", () => {
  const openApi = readJson(
    "solution/Connectors/ste_syntheticoperations/apiDefinition.swagger.json",
  );
  assert.doesNotThrow(() => validateOpenApi(openApi));
  const changed = structuredClone(openApi);
  changed.paths["/field-inspections"].post.parameters = changed.paths[
    "/field-inspections"
  ].post.parameters.filter(
    (parameter) => parameter.name !== "x-idempotency-key",
  );
  assert.throws(
    () => validateOpenApi(changed),
    /must require an idempotency key/u,
  );
});

test("keeps inspection outcomes and decisions aligned with the API", () => {
  const openApi = readJson(
    "solution/Connectors/ste_syntheticoperations/apiDefinition.swagger.json",
  );
  const changed = structuredClone(openApi);
  changed.definitions.InspectionDecision.properties.decision.enum = ["ALLOW"];
  assert.throws(
    () => validateOpenApi(changed),
    /decisions must match the synthetic API contract/u,
  );
});

test("enforces secure connection and deployment placeholders", () => {
  const apiProperties = readJson(
    "solution/Connectors/ste_syntheticoperations/apiProperties.json",
  );
  const settings = readJson("deployment/deployment-settings.template.json");
  assert.doesNotThrow(() => validateApiProperties(apiProperties));
  assert.doesNotThrow(() => validateDeploymentSettings(settings));
  const changed = structuredClone(settings);
  changed.ConnectionReferences[0].ConnectionId =
    "11111111-1111-1111-1111-111111111111";
  assert.throws(
    () => validateDeploymentSettings(changed),
    /must not contain a connection ID/u,
  );
});

test("enforces separation of duties and approval recovery", () => {
  const roles = readJson("contracts/security-roles.json");
  const approval = readJson("contracts/field-inspection-approval.json");
  assert.doesNotThrow(() => validateRoles(roles));
  assert.doesNotThrow(() => validateApproval(approval));
  const changed = structuredClone(approval);
  changed.approval.selfApprovalAllowed = true;
  assert.throws(() => validateApproval(changed), /Approval separation/u);
});

test("keeps deployment source free from tenant bindings", () => {
  assert.doesNotThrow(validateSourceSafety);
});

test("fixtures match the approval contract", () => {
  const approval = readJson("contracts/field-inspection-approval.json");
  const inspection = readJson("fixtures/remediation-inspection.json");
  const approved = readJson("fixtures/approval-decision.json");
  const rejected = readJson("fixtures/rejection-decision.json");
  assert.equal(
    inspection.outcome,
    approval.trigger.approvalRequiredWhen.outcome,
  );
  assert.deepEqual(
    [approved.decision, rejected.decision],
    approval.approval.decisions,
  );
  for (const fixture of [approved, rejected]) {
    assert.ok(
      fixture.rationale.length >= approval.approval.rationale.minimumLength,
    );
    assert.ok(
      fixture.rationale.length <= approval.approval.rationale.maximumLength,
    );
  }
});
