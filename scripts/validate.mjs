#!/usr/bin/env node
// Validates every JSON file in /content against /schema/vault-schema.json.
// Exits nonzero on any failure. This is the gate: invalid content cannot commit or publish.

import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import Ajv2020Module from "ajv/dist/2020.js";

const Ajv2020 = Ajv2020Module.default ?? Ajv2020Module;

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const schemaPath = join(root, "schema", "vault-schema.json");
const contentDir = join(root, "content");

const schema = JSON.parse(readFileSync(schemaPath, "utf8"));
const ajv = new Ajv2020({ allErrors: true, strict: false });
const validate = ajv.compile(schema);

const files = readdirSync(contentDir).filter((f) => f.endsWith(".json"));

if (files.length === 0) {
  console.error("No JSON files found in /content. Nothing to validate.");
  process.exit(1);
}

let failed = false;

for (const file of files) {
  const path = join(contentDir, file);
  let data;

  try {
    data = JSON.parse(readFileSync(path, "utf8"));
  } catch (err) {
    failed = true;
    console.error(`FAIL  content/${file}  (not parseable JSON)`);
    console.error(`      ${err.message}`);
    continue;
  }

  if (validate(data)) {
    console.log(`PASS  content/${file}`);
  } else {
    failed = true;
    console.error(`FAIL  content/${file}  (${validate.errors.length} schema error${validate.errors.length === 1 ? "" : "s"})`);
    for (const err of validate.errors) {
      const where = err.instancePath || "(root)";
      console.error(`      ${where}  ${err.message}`);
    }
  }
}

// The Template contract: the example room must satisfy the template subset
// schema AND the full schema. This is the alignment claim made on stage —
// a faculty room and the Exemplar are the same data structure — kept true
// by CI instead of by promise.
const templateSchema = JSON.parse(
  readFileSync(join(root, "template", "template-schema.json"), "utf8"),
);
const validateTemplate = ajv.compile(templateSchema);
const example = JSON.parse(
  readFileSync(join(root, "template", "example-room.json"), "utf8"),
);

if (validateTemplate(example)) {
  console.log("PASS  template/example-room.json  (template schema)");
} else {
  failed = true;
  console.error("FAIL  template/example-room.json  (template schema)");
  for (const err of validateTemplate.errors) {
    console.error(`      ${err.instancePath || "(root)"}  ${err.message}`);
  }
}

if (validate(example)) {
  console.log("PASS  template/example-room.json  (full schema)");
} else {
  failed = true;
  console.error("FAIL  template/example-room.json  (full schema — subset relationship broken)");
  for (const err of validate.errors) {
    console.error(`      ${err.instancePath || "(root)"}  ${err.message}`);
  }
}

// The example gallery: every discipline room ships valid against both
// schemas, same guarantee as the bundled example.
const examplesDir = join(root, "template", "examples");
for (const file of readdirSync(examplesDir).filter((f) => f.endsWith(".json"))) {
  const room = JSON.parse(readFileSync(join(examplesDir, file), "utf8"));
  for (const [label, check] of [["template schema", validateTemplate], ["full schema", validate]]) {
    if (check(room)) {
      console.log(`PASS  template/examples/${file}  (${label})`);
    } else {
      failed = true;
      console.error(`FAIL  template/examples/${file}  (${label})`);
      for (const err of check.errors) {
        console.error(`      ${err.instancePath || "(root)"}  ${err.message}`);
      }
    }
  }
}

if (failed) {
  console.error("\nValidation failed. Invalid content does not publish.");
  process.exit(1);
}

console.log("\nAll content valid.");
