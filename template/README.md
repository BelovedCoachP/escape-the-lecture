# The Faculty Template contract

This folder is the contract between the repo (source of truth) and the
Template builder app (built on Lovable). The builder is the workshop's
deliverable: a faculty member goes from blank page to a playable, shareable,
accessible escape room in under twenty minutes, with no account and no API
key.

## Files

- `template-schema.json` — the Template's content contract, a strict subset
  of `../schema/vault-schema.json` v1.1: one level, exactly three challenges,
  three challenge types (`choice`, `sequence`, `response`), text plus at most
  one image, no locks, no media pipeline, `a11y` block fixed. Anything valid
  here also validates against the full schema, which is the alignment claim
  made on stage: what you played (the Exemplar) and what you just built are
  the same data structure with different production budgets.
- `example-room.json` — a complete worked example (The Lost Lab Notebook,
  intro biology). Passes both schemas; used by the builder's "Load example"
  and as the shape reference in the AI drafting prompt. CI-checked along
  with the subset relationship by `scripts/validate.mjs`.

## The builder app (Lovable)

Two views:

1. **Build** — the small field surface from the spec (title, objective,
   author, premise, role, success condition, optional companion name, one
   level, exactly three challenges), plus a paste box for AI-drafted JSON.
   The paste box runs the forgiving parser, then validation, then either
   populates the form or lists plain-English errors.
2. **Play** — decodes a published room from the URL, re-validates, renders
   it playable: text-first, keyboard-complete, no timers, feedback on every
   option, hints on every challenge.

Publishing encodes the validated JSON with lz-string
(`compressToEncodedURIComponent`) into the play URL and renders a QR code.
No backend, no storage: the URL is the room.

### The forgiving parser

Faculty paste whatever their AI gave them. Before validating, strip in
order: markdown code fences, any prose before the first `{` and after the
last `}`, smart quotes to straight quotes, trailing commas. Then
`JSON.parse`. If parsing still fails, say so in one sentence and show where.

### Injected defaults

The builder injects what faculty never author: `schemaVersion`,
`meta.renderer: "template"`, `meta.brandFooter`, the fixed `a11y` block, a
default `finale` (title "The Door", a reflection prompt tied to their
objective, a two-row generic rubric, closing text) when the pasted JSON has
none, `companion.textAlwaysVisible: true` whenever a companion is present,
and a default `keyboardInstructions` string on any sequence challenge
missing one. Injection happens before validation, so faculty only ever see
errors about content they actually wrote.

### Plain-English errors

Map ajv output to sentences a busy instructor acts on, worded by location
and fix, never by JSON path: "Your second challenge is missing its hints,"
"The third option in challenge 1 has no feedback — every answer needs an
explanation, right or wrong," "Your image needs alt text, or mark it
decorative." Unknown/extra fields: "The Template doesn't use a field called
X; remove it." Always all errors at once, never one at a time.

## The AI drafting prompt (workshop handout seed)

The builder's "Copy the AI prompt" button copies this, with the schema and
example inlined. Faculty paste it into any chatbot, add two sentences about
their course, and paste the JSON that comes back into the builder.

> You are drafting content for an accessible educational escape room. Output
> ONLY a JSON object — no prose, no code fences — that follows the attached
> schema exactly. The room has one level and exactly three challenges: one
> "choice", one "sequence", one "response". Rules that are not negotiable:
> every option carries feedback explaining why it is right or wrong; every
> challenge carries 1–3 escalating hints that narrow the search space but
> never contain the answer; nothing depends on color, sound, timing, or
> dragging; the audience is adults, so make it genuinely challenging. Write
> in second person, present tense. My course and topic: [FACULTY FILLS IN].
> Here is the schema, then a complete valid example to match in shape.

## Updating the contract

The schema here is vendored into the Lovable app. If `template-schema.json`
changes, re-paste it into the app (one Lovable message). The contract
freezes with the rest of the build on the freeze date.
