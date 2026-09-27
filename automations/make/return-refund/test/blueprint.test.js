"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const {
  extractConnectionPlaceholders,
  validateBlueprint,
} = require("../scripts/blueprint-contract");

test("blueprint satisfies schema and semantic contracts", () => {
  const { errors } = validateBlueprint();
  assert.deepEqual(errors, []);
});

test("blueprint commits only declared logical connection placeholders", () => {
  const { blueprint } = validateBlueprint();
  assert.deepEqual(extractConnectionPlaceholders(blueprint), [
    "SYNTHETIC_OPERATIONS_API",
    "SYNTHETIC_OPERATIONS_API_KEY",
  ]);
});

test("blueprint separates approval from automatic eligibility", () => {
  const { blueprint } = validateBlueprint();
  const router = blueprint.flow.find((module) => module.id === 4);
  assert.deepEqual(
    router.routes.map((route) => route.name),
    ["Eligible or approved return", "Approval required", "Rejected return"],
  );
  assert.match(JSON.stringify(router.routes[0].filter), /approvalDecision/);
});
