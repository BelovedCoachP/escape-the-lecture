// Content loading and the runtime half of the accessibility guarantee.
// validate-schema.js is generated from schema/vault-schema.json by
// scripts/build-validator.mjs; the app refuses to render content that fails it.

import validateSchema from "./validate-schema.js";

export async function loadContent(url) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Could not load content (HTTP ${res.status}) from ${url}`);
  }
  return res.json();
}

export function validateContent(content) {
  if (validateSchema(content)) return { ok: true };
  return {
    ok: false,
    errors: (validateSchema.errors ?? []).map((e) => ({
      path: e.instancePath || "(root)",
      message: e.message ?? "invalid",
    })),
  };
}
