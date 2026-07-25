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

if (failed) {
  console.error("\nValidation failed. Invalid content does not publish.");
  process.exit(1);
}

console.log("\nAll content valid.");
