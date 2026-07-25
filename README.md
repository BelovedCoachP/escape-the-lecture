# Escape the Lecture

An accessible course escape-room engine: two renderers, one JSON content contract. Built for the QM Connect 2026 session *Escape the Lecture: Build a Browser-Based Course Escape Room With AI in 50 Minutes*.

**The architectural bet:** accessibility lives in the schema, not in a checklist. Captions, keyboard paths, hints, feedback, and the absence of a timer are structural requirements of [the content contract](schema/vault-schema.json). An inaccessible room cannot be expressed as valid content, so it cannot publish. The gate runs three times: as a pre-commit hook, in CI, and client-side in the renderer, which refuses to render invalid content.

## Play

The Exemplar, *The AI Archivist and the Lost Learning Vault*:
**https://belovedcoachp.github.io/escape-the-lecture/exemplar/**

## Structure

```
schema/     the content contract (JSON Schema, draft 2020-12)
content/    room content; everything here is validated on every commit
exemplar/   the showpiece renderer (vanilla ES modules, no framework, no backend)
template/   the faculty template contract (builder app lives on Lovable)
assets/     media
scripts/    validate.mjs (the gate), build-validator.mjs (browser validator bundle)
```

## Develop

```bash
npm install
npm run validate           # validate all content against the schema
npm run build:validator    # regenerate the browser validator after schema changes
npx http-server . -p 8123  # serve locally, then open /exemplar/
```

A pre-commit hook (husky) and a GitHub Action both run the validator. A commit or push with invalid content fails.

---

Built with LearnAIID. AI-assisted, human-driven learning.
