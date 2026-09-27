"use strict";

const { validateBlueprint } = require("./blueprint-contract");

const { errors, modules } = validateBlueprint();
if (errors.length > 0) {
  for (const error of errors) {
    process.stderr.write(`${error}\n`);
  }
  process.exitCode = 1;
} else {
  process.stdout.write(`Validated ${modules.length} Make modules.\n`);
}
