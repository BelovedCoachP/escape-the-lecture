# Lovable attendee template deployment review

Reviewed September 19, 2026. Project: `79ad41af-8c4f-4105-a35c-e0f2c477f7a2`.

**Published as an alpha with Page's explicit approval.** Current published revision: `e47182f3f65911283b370ddf396c78997e4469fb` (hidden presentation page). Gameplay review revision: `c7282dbbf9e73d724dc351a620c2bdc28b39379b`. Page has ruled out a faculty pilot; it is not a release requirement.

- Initial reviewed revision before the final AT fixes: `6d254ec264f759c745a15b31f027193a9a42d5f4`.
- Starting revision: `b6a86aa02ae00ec589d2894d5be6efa20aa7ca2f`.
- Preview: https://id-preview--79ad41af-8c4f-4105-a35c-e0f2c477f7a2.lovable.app
- Public alpha: https://escape-the-lecture-builder.lovable.app
- Editor: https://lovable.dev/projects/79ad41af-8c4f-4105-a35c-e0f2c477f7a2

## Published review changes

| Finding | Correction | Verification |
|---|---|---|
| Editing only a companion name published the original bundled room. | Every edit invalidates the old link; short example links require content equivalence. | Renamed guide appeared from a full-content link in a separate tab. Untouched example retained its short link and QR. |
| Builder draft disappeared on navigation and refresh. | Versioned browser-local saving, restore status, flush before leaving, guarded storage, and JSON backup. | Immediate title edit, Examples, Builder retained the title; reload retained draft. Downloaded JSON passed the canonical template schema. |
| Importing `{}` crashed the form. Parser also damaged valid quoted text. | Shape/contract/answer checks before replacement; string-aware repairs; plain-English errors. | Empty object and six invalid room variants rejected while preserving the existing title. Six punctuation-preservation probes passed. |
| A structurally valid room could have no usable answer. | Check correct answer counts, unique IDs, exact sequence permutations, nonblank required text, and positive response limits. | 92 automated checks include impossible choices, duplicate IDs, broken order and invalid limits. Browser rejected string booleans, extra fields/levels and unsupported properties. |
| Ordering lost keyboard focus and could target the wrong puzzle. | Stable item identities, scoped focus refs, usable end-position controls, accurate instructions, unsolved starting order. | Keyboard playthroughs plus three sequence puzzles in one room; quoted/bracketed IDs retained focus in the third puzzle, including the top position. Imported nonidentity order appeared correctly in the editor. |
| Skip link returned to homepage; room progress could leak across room URLs. | Focus main without changing hash; key player state to room payload. | Skip retained Builder route; successive rooms started at zero during ten-room playthrough. |
| Solved answers remained editable, and partial responses could count. | Lock solved controls; require every response field; edits invalidate self-review and scoring rechecks answers. | Missing Evidence field named visibly; keyboard deletion after submission removed the scoring action and blocked completion. |
| Generic companion assessment falsely claimed to read writing. | Clearly described self-review; only authored companion reactions are shown. | Response preview displayed rubric/exemplar without fabricated AI grading. |
| Authored image and additional guide lines were ignored. | Render image/alt/description/credit and all guide lines; forward Panel labeling attributes. | Custom room displayed a loaded 1920px source image, correct alt, second guide line, two answer fields, placeholders and character limits. |
| Finale required another text submission to reveal the ending. | Immediate room-complete confirmation; final reflection optional. | All ten rooms reached completion with the final reflection blank. |
| Reset was immediate; QR could exceed a narrow card. | In-page cancel/confirm, responsive QR and quiet zone, honest long-link fallback. | Reset cancel retained work, confirmation cleared it. At 320px viewport, content width 305px, no main overflow; QR fit with white margin. |
| Homepage claimed proven WCAG compliance and universal QR publishing. | Wording describes accessibility intent and QR availability for shorter rooms. | Reviewed updated preview copy; conference artwork and supplied session times preserved. |

## Test evidence

Lovable ran `bunx vitest run`: **9 test files, 92 passing tests**, `bunx tsgo --noEmit`: clean, and `bun run build`: successful on the final revision. Reviewed the test code and followed with independent browser checks.

The final preview was played through all three challenges and room completion for Arts, Math, Science, History, English, Spanish, Computer Applications, Cybersecurity, Workforce Development and Health Sciences. Correct answers came from the authored fixtures; this verifies operation, not novice difficulty or subject-matter accuracy. No application warnings/errors appeared during that final ten-room run.

Additional checks covered wrong choice/order feedback, multiple selections, custom imports, separate-tab edited links, response self-review, image loading, keyboard ordering, skip navigation, draft navigation/reload, reset cancel/confirm, and selected phone/desktop layouts. The exported backup at `C:/Users/paged/Downloads/the-locked-listening-booth.json` parsed and validated against `C:/Users/paged/escape-the-lecture/template/template-schema.json`.

The code/UI review used the [Web Interface Guidelines](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md). These checks do not establish WCAG conformance.

## Alpha publication and assistive-technology follow-up

The first reviewed revision was published, then the live keyboard/accessibility-tree pass identified additional issues: successful challenge submissions removed the focused button, opening/cancelling restart lost focus, room titles stayed generic, and the exposed rubric extended past a 320px viewport. These were sent back for remediation and independently retested before publishing the final revision above.

The initial 92 automated checks were followed by 103 passing checks on the final accessibility revision, with typecheck and production build passing. Exact browser observations are recorded below.

### Independently observed browser evidence

Final Lovable revision: `c7282dbbf9e73d724dc351a620c2bdc28b39379b`. Published and checked September 19, 2026 in Codex's Chromium-based in-app browser.

| Check | Observation |
|---|---|
| Keyboard completion | Space selects a radio; Enter checks it; focus moves to the challenge-complete note. After the last challenge, focus moves to the room-complete H2. |
| Ordering | Wrong order exposes text feedback. ArrowUp moves an item and leaves focus on an enabled control belonging to that item. |
| Empty response | Submit focuses the first empty textarea. It has aria-invalid=true and aria-describedby pointing to its visible error. |
| Self-review | Successful Submit focuses the new Self-review H3. No text in the optional final reflection is required to finish. |
| Restart | Opening focuses Cancel inside the labelled confirmation group. Cancel restores the trigger; confirming restart focuses the room H1. |
| Route titles | Player title includes the room name. Examples and Builder have distinct document titles; route navigation focuses main. |
| Skip and labels | Enter on Skip retains the current hash route and focuses main. Tab reaches the first main control with a visible outline. Builder input/textarea/select scan found no unlabelled controls. Required builder inputs expose the required property. |
| Import errors | Invalid pasted JSON preserves the existing room and focuses the visible result explaining why it was rejected. |
| Live status | Completion and progress appear together in the role=status region, rather than one overwriting the other. Repeated speech delivery was not audible/testable here. |
| Landmarks and structure | Browser AX output exposes navigation, main, ordered challenge headings, labelled controls, error summary, and footer. Rubric has a caption, column headers, and row headers. |
| Narrow rubric | At 320px viewport, content width and document scroll width are both 305px. The table sits in a labelled, focusable horizontal scroll region; the rest of the page does not overflow. |
| Final public regression | All ten public rooms completed all three challenges and reached the ending using authored fixture answers. Final reflection left blank. No application warnings/errors appeared in the final ten-room run. This is mixed pointer/keyboard operation, not a novice difficulty or subject-matter validation. |
| Public draft and sharing | Companion-only edit survived immediate route navigation and reload. A separate tab opened the full-content link and displayed the changed guide name. The untouched example retained a short link and visible QR. Test draft was cleared through the in-page confirmation, which restored focus to Start over. |

Relevant review areas: WCAG 1.3.1 (structure), 1.4.10 (reflow), 2.1.1 (keyboard), 2.4.1/2.4.2/2.4.3/2.4.7 (skip, titles, focus order and visibility), 3.3.1/3.3.2 (errors and labels), and 4.1.2/4.1.3 (names/states/status). This table records tested paths and fixes, not a conformance result for every criterion.


## Remaining scope and ownership

- **No faculty pilot:** Page's explicit alpha decision replaces the earlier pilot gate. Do not list a pilot as blocked or completed.
- **Screen-reader speech:** NVDA, JAWS, and VoiceOver speech output were not available through the connected controls. Accessibility-tree inspection and keyboard checks are documented evidence, not a spoken screen-reader test or WCAG certification. Actual browser zoom, other browser engines, physical QR scanning, and presentation-equipment checks remain device-level limits.
- **Page:** see [current alpha preparation list](alpha-owner-items.md). Recording, deck, run-of-show, participant Docs, and text-only fallback are complete. Remaining work includes rehearsal, offline exports/download checks, attendee view access, equipment and device checks, and the deliberate presentation-release decision.
- **Sharing:** longer edited rooms may exceed QR capacity; copied links and JSON backup remain available. Builder drafts stay in the current browser/device; player answers and reflection do not persist on reload.
- **Showcase game:** Revision 42cb97b is published with final narration. There is no outstanding publication hold.

## Game publication confirmed, September 20

Published September 20, 2026 with Page's explicit approval: game commit 42cb97be0792e18753da442bc7e6838db8f89a79, including reviewed fixes and supplied final-lock audio. GitHub content validation and Pages deployment both succeeded. Public JSON, renderer, compiled validator, MP3, and VTT all returned HTTP 200 and matched local SHA-256 hashes. URL: https://belovedcoachp.github.io/escape-the-lecture/exemplar/. The existing browser session retained older cached modules; browser UI checks from that session are not claimed as a fresh full playthrough of the deployed revision. Local complete-game and final-audio fixture checks remain documented above.
Earlier deployment holds are superseded by this approval and successful release.

## Current release check September 21

Lovable connector reports the project ready, published, and at e47182f3f65911283b370ddf396c78997e4469fb. This extends the reviewed gameplay revision with the presentation route. Prior presentation-change verification recorded 109 passing tests plus typecheck/build; that is Lovable-reported evidence, not a new suite run today.

A fresh in-app browser visit to /#/presentation showed Presentation not yet available, the unreleased explanation, Home, Examples and Builder navigation, and no Gamma iframe. This matches Page's release hold. A command-line homepage fetch encountered a Cloudflare challenge, while the browser route loaded successfully; that fetch was not counted as a successful page check. No new full ten-room playthrough or spoken screen-reader test was performed in this documentation refresh.

Selected deck: d0wj9v9uw7hxdma, the original with the repaired cover. Both participant handouts are now native Google Docs in the workshop Drive folder. See the owner preparation list for remaining workshop checks. No faculty pilot has been reinstated.
