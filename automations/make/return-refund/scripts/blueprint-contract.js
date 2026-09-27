"use strict";

const fs = require("node:fs");
const path = require("node:path");
const Ajv = require("ajv/dist/2020");

const directory = path.resolve(__dirname, "..");

const loadJson = (filename) =>
  JSON.parse(fs.readFileSync(path.join(directory, filename), "utf8"));

const flattenModules = (modules) =>
  modules.flatMap((module) => [
    module,
    ...flattenModules(module.onerror ?? []),
    ...(module.routes ?? []).flatMap((route) => flattenModules(route.flow)),
  ]);

const extractConnectionPlaceholders = (value) => {
  const matches = JSON.stringify(value).matchAll(/\{\{([A-Z][A-Z0-9_]+)\}\}/g);
  return [...new Set([...matches].map((match) => match[1]))].sort();
};

const validateBlueprint = () => {
  const blueprint = loadJson("blueprint.json");
  const schema = loadJson("blueprint.schema.json");
  const ajv = new Ajv({ allErrors: true, strict: true });
  const validate = ajv.compile(schema);
  const errors = [];

  if (!validate(blueprint)) {
    errors.push(...(validate.errors ?? []).map((error) => error.message));
  }

  const modules = flattenModules(blueprint.flow);
  const ids = modules.map((module) => module.id);
  if (new Set(ids).size !== ids.length) {
    errors.push("Module identifiers must be unique across all routes.");
  }

  const sideEffects = modules.filter(
    (module) =>
      module.module === "http:ActionSendData" &&
      module.mapper?.method === "POST",
  );
  for (const module of sideEffects) {
    const headers = module.mapper.headers ?? [];
    if (!headers.some((header) => header.name === "x-idempotency-key")) {
      errors.push(`Module ${module.id} is missing an idempotency key.`);
    }
    if ((module.onerror ?? []).length === 0) {
      errors.push(`Module ${module.id} is missing an error route.`);
    }
  }

  const declared = [...blueprint.metadata.connectionPlaceholders].sort();
  const referenced = extractConnectionPlaceholders(blueprint);
  if (JSON.stringify(declared) !== JSON.stringify(referenced)) {
    errors.push(
      `Declared placeholders ${declared.join(", ")} do not match referenced placeholders ${referenced.join(", ")}.`,
    );
  }

  const modulesById = new Map(modules.map((module) => [module.id, module]));
  if (modulesById.get(6)?.mapper?.body.includes("refundAmount") !== true) {
    errors.push("Refund creation must map the eligible return amount.");
  }
  if (modulesById.get(601)?.mapper?.method !== "GET") {
    errors.push("Uncertain refund outcomes must be reconciled with a GET.");
  }

  return { blueprint, errors, modules };
};

module.exports = {
  extractConnectionPlaceholders,
  flattenModules,
  validateBlueprint,
};
