# Escape the Lecture: Build Plan

Scoped 2026-07-25 against TECHNICAL-SPEC v1. Decisions confirmed with Page; this document is the working sequence for the build sessions that follow. Nothing below is built yet except the repo scaffold and the validation gate.

## Confirmed decisions

| Decision | Call |
|---|---|
| Hosting | Public GitHub repo `BelovedCoachP/escape-the-lecture`, GitHub Pages, Actions CI. This repo is the faculty takeaway. |
| Exemplar architecture | Vanilla ES modules per TECHNICAL-SPEC section 1. No framework, no build step at runtime. |
| Template architecture | Faculty Template is a Lovable app (form, validate, publish, QR). Same schema, client-side ajv, no accounts, no API key. The repo's `/template` holds the contract and shared validation logic; the Lovable project consumes them. Schema source of truth stays in this repo. |
| Voice | ElevenLabs (Page's account). Key lives in `.env` (gitignored, verified working, scoped to TTS + voices). Cast is chosen and confirmed in the account: AURA = "Lucy - Charming, Upbeat and Kind" (voice_id `Gv42yFG3G6CHLsU5y8g6`), The Archivist = "Om - Calm & Soothing" (voice_id `ePiPWpzcHZrcqRzFrgQg`). All lines already scripted in TECHNICAL-SPEC section 3; Session D generates them via `scripts/generate-voice.mjs`. Engine is built text-first; `audioSrc` is optional in the schema. |
| Levels 2-5 content | Claude drafts full challenge content matching Level 1's quality and the confidence-is-not-correctness thesis; Page reviews and edits before anything is final. Every draft passes the gate. |
| Video | Runway MCP (connected, personal workspace). Cinematics and AURA stingers per section 3. veo-3.1 / gen-4.5 / kling-3-pro available. |
| Images | Teaching images (wavelength chart, contrast samples, document scramble) are code-rendered so the data is exact, because the data IS the puzzle. Atmosphere and character images via Runway image models (nano-banana-pro, gen-4, seedream-5) or the connected custom-style image platform. Ideogram available if authorized. |
| Music | Udio, manual, Page's side. Engine treats scoring as optional play-on-demand audio. |
| Captions | VTT authored directly from the section 3 scripts, sibling to every mp4 and every voiced line. CI check for the sibling convention. |

## Tooling inventory

In hand now: repo + validation gate (husky and GitHub Action, proven blocking), gh CLI authenticated as BelovedCoachP, Runway MCP (video + image), custom-style image MCP, Lovable MCP, browser pane for playtesting, local video editing pipeline, WCAG audit workflow.

**Deployment target (decided 2026-07-25): GitHub Pages only.** The Canvas/LMS iframe constraint is retired for this build. Consequences: localStorage is allowed, so the exemplar persists run progress (save and resume); no embed test milestone; fluid layout stays because it is good practice, not because of an iframe.

Needs connecting later: ElevenLabs (at media production). Optional: Ideogram OAuth.

No connector exists (manual): Udio.

## Build sessions

Each session ends with `npm run validate` green and a vault build-log entry.

### Session A: publish the gate, prove the loop
1. Create public repo, push, enable Actions and Pages. CI runs the validator in the cloud.
2. Exemplar shell: `index.html`, boot, content load, client-side validation (ajv precompiled to a standalone module by a build script so the runtime stays dependency-free), state, router, hash resume, a11y utilities, brand tokens.
3. Text-only playable loop across all five levels plus finale, real Level 1 content, stubs elsewhere.

### Session B: puzzle structure and primitives

Re-scoped 2026-07-25 after the Breakout EDU analysis; the full catalog, accessibility filter, and level mapping live in `docs/PUZZLE-CATALOG.md`. B1 (locks, keyring inventory, meta-lock, spine navigation) shipped the same day. B2 and B3 add the six new primitives; B4 rebuilds Level 1 as the interactive proof. The original Session B items below fold into those.

### Session B (original scope): the three primitives and the thesis mechanics
1. `choice`, `sequence`, `response` renderers against Level 1 real content. Keyboard reorder path first; it is the accessibility demo.
2. Companion system: `speak`, confidence badge, `revealTell`, `auraReact`.
3. Evidence bank and finale replay, accepted positions, closing.
4. Media components (`video.js`, `audio.js`, `cue.js`) against placeholders, graceful when assets are missing.

### Session C: content to full strength
1. Claude drafts Levels 2-5 and finale content in full; Page reviews.
2. Iterate until the gate and Page both pass it.

### Session D: media production
1. Code-render teaching images; generate atmosphere and character set via Runway.
2. Runway cinematics: Lockdown, AURA intro, stingers, The Vault Opens. Protect the flicker.
3. ElevenLabs voice pass for AURA and Archivist lines; author sibling VTTs.
4. Page's Udio scoring pass. Level 1 to full treatment.

### Session E: Template on Lovable
1. Create Lovable project: builder form (title, objective, premise, one level, three challenges), forgiving parser, plain-English schema errors, publish to URL hash plus QR.
2. Verify identical validation behavior against the repo schema.

### Session F: prove it, then freeze
1. Accessibility remediation pass across everything.
2. Responsive pass: fluid down to small widths on the live GitHub Pages deployment.
3. Solo timed Template run under 20 minutes.

## Timeline mapping

Sessions A-B land in W2, C-D in W2-W3 alongside Page's media direction, E in W4, F in W4-W5. Freeze Sep 1. Pilot in September.
