# Exemplar deployment review

Code and play-flow review performed September 19, 2026. Release and preparation status reconciled September 21, 2026. This report covers the Exemplar; the separate Lovable review is complete and linked in the remaining-work table.

**Alpha release status:** Published game revision 42cb97b. See the September 20 publication evidence below. No faculty pilot is planned.

Repository: `C:\Users\paged\escape-the-lecture`. Baseline commit: `a9417a9dc2040b8aaf2fb48663402e854c5c3c6b`, plus the working-tree changes from this review.

Public game: https://belovedcoachp.github.io/escape-the-lecture/exemplar/

## Fixed findings

| Priority | Finding and reproduction | Update | Evidence |
|---|---|---|---|
| High | Opening a later room URL awarded all earlier keys and completed challenges. | URLs now select only legitimately reachable rooms. The finale requires all restored rooms. | Fresh-run unit tests reject later-room and finale URLs without changing progress; local browser jump returned to Main Hall with zero keys. |
| High | Clicking Skip to main content was interpreted as a game route and returned to the intro. | Skip now focuses main without changing the route or progress. | Keyboard activation stayed in Wing 1. |
| High | Unfinished answers disappeared on refresh or room navigation. | Drafts persist for sorting, repairs, matching, flags, choices, ordering, numeric answers, and written responses. Completed written responses remain available for review. | Browser reload retained Wing 1 alt text and placement, Wing 3 repairs, and Wing 4 sequence order; storage tests passed. |
| High | Restarting a room left an already-open finale and submitted recommendation intact. Multiple resets could strand the current room. | Reset clears that room's draft, evidence, and key, and invalidates the final verdict. Legitimately visited rooms remain replayable without being marked solved. | Browser reset removed a key and blocked the finale; successive Wing 4/5 resets and reload succeeded. Regression tests cover both cases. |
| High | Detached audio could keep speaking after navigation; voices could overlap. | Narration stops on scene changes and when a lock is solved. Starting another voice stops the first. Blocked autoplay retains the manual Hear button. | Audio lifecycle tests and epilogue playback-control checks passed. |
| Medium | Ordering instructions said to Tab and use arrows, omitting the required grab action. | Instructions now specify Enter/Space to grab, arrows to move, and Enter/Space to drop, plus visible move buttons. | Moved the introduction from fifth to second using keyboard, reloaded, then solved the full sequence. |
| Medium | Wing 4 image-caption text inherited a nearly white color on paper. | Paper captions use dark slate. | Computed color `rgb(51, 65, 85)` and visual review. |
| Medium | Completed summaries overflowed at 320px; stacked references retained a nested height-limited scroll area. | Work column fills the available width, long content wraps, and stacked references use ordinary page scrolling. | Wing 4 at 320px: document width 305px with scrollbar, zero main-content elements extending past the viewport. Tablet check at 768px also passed. |
| Medium | Empty multiple-choice submissions had no visible error beside the button. | Added visible empty/wrong-selection feedback. | Empty selection in Wing 2 displayed the message; final AURA trap remained retryable. |
| Medium | The calculator accepted only the first number, so `4.3:2` could pass as `4.3`. | Parse the full number or ratio; reject ambiguous text and zero denominators. | Tests distinguish `4.3:1` from `4.3:2`, accept decimal commas, and reject ambiguous input. |
| Medium | The sorting control moved the focused button and disabled it. | Keep a focusable selected control with pressed state. | Placement retained focus and survived reload. |
| Medium | AURA's continuous decorative animation had no pause button. | Added Pause/Play and a listener that stops playback if reduced motion becomes enabled. | Pause/Play controls tested. System reduced-motion behavior still needs a device-level check. |
| Medium | A delayed key animation could update a page after the player had left or restarted. | Ignore callbacks belonging to detached cards or replaced runs; prevent duplicate completion. | Code guard and completion-idempotence test. |
| Medium | Corrupted stored progress could prevent the game from loading. | Validate saved-state container shapes and discard invalid saves or draft entries. Storage failures remain nonfatal. | Corrupt, old, and unavailable-storage tests passed. |

## Content and play-flow improvements

The first sorting question now supplies the context that makes the student photo informative. Previously, its feedback referred to a caption the player had not been shown. The chart feedback no longer asserts that all charts are always informative regardless of context. W3C describes the image's purpose and surrounding content as the basis for this distinction: [decorative images guidance](https://www.w3.org/WAI/tutorials/images/decorative/).

The 125-character suggestion is explicitly an exercise target, and the INSTRUCT constraint now says to trim unnecessary words while preserving meaning. It still begins with T, so the acrostic is intact. The short alternative and fuller description retain distinct jobs, consistent with [W3C complex-image guidance](https://www.w3.org/WAI/tutorials/images/complex/).

Wing 5 feedback no longer promises that a text puzzle automatically works for everyone. It identifies the supported interaction methods and the need for learner testing. Raw-URL feedback no longer promises that every screen reader pronounces an address character by character. The final scene no longer incorrectly says this is the Archivist's second and last speech. A leftover use of “discipline” became “skill.” The closing described transcript now matches the fade to black.

The introduction explains the five-wing loop, unlimited retries, local saving, and AURA's scripted role. The intentionally unreliable dialogue, slow exhibit reveals, left reference column, right hints, and choice-based final recommendation remain.

## Verification

- `npm test`: 11 passing tests. The GitHub validation workflow now also runs these tests.
- `npm run validate`: Exemplar content and all ten template examples pass their existing schema checks. This does not validate the live Lovable app.
- `node scripts/generate-voice.mjs --dry-run`: 16 existing voice lines; lock-script drift check passes. No paid generation or changes to spoken dialogue were needed. This is not an auditory timing review.
- `git diff --check`: passes.
- Required content-referenced local assets exist. Optional archive-hall ambience is still absent and its control disappears.
- Normal browser play completed all five wings and their interludes, all room keys, shuffled final keyways, the rejected AURA recommendation, an accepted recommendation, and the opened-vault scene.
- Reload, skip navigation, home/continue, back/forward, wrong/empty input examples, and room reset paths tested. This was a mixed pointer/keyboard run, not an end-to-end screen-reader or keyboard-only certification.
- Layout samples checked at 1280, 768, 390, and 320 CSS pixels. Width checks are not substitutes for a 200-percent browser-zoom test.
- Closing clip played using Space and reached its end at 3.708333 seconds; its caption appeared visually. A native-control automation click crashed one embedded-browser tab. A fresh tab recovered the saved finale, and keyboard playback then completed without a media error. Repeat native pointer playback in the presentation browser.
- No errors or warnings in the final recovered-tab console checks. The earlier optional ambience 404 is known; this is not a claim that every browser route is error-free across devices.

## Workshop recommendation

Keep the existing plan to demonstrate one wing, then move attendees into the builder. The full game has 14 challenges, five word locks, corridor scenes, and a finale. Do not assume the entire game fits alongside a 20-minute build in a 50-minute workshop. Use the complete game as a take-home experience; completion time with new players remains unknown, and no faculty pilot is planned. No countdown or forced skip was added.

The five word locks still require their authored words, not all synonyms. Their tier-three hints provide word-shape clues. Watch these moments during the alpha workshop, particularly DISTINGUISH, rather than increasing puzzle complexity.

## Remaining launch work

| Work | Owner / next step |
|---|---|
| Reviewed game publication | Complete: revision 42cb97b includes the fixes and final narration and is live on GitHub Pages. No publication approval is pending. |
| Assistive-technology pass | Complete keyboard-only and screen-reader runs, 200-percent zoom, reduced-motion checks, and caption timing review on a real device. Schema validation cannot prove these. |
| Browser/device coverage | Check Chrome, Edge, Firefox, and Safari where available; verify native video playback and the workshop laptop/audio setup. |
| Lovable review | Reviewed alpha c7282dbb is published; current revision e47182f3 adds the intentionally hidden presentation page. See lovable-template-review-2026-09-19.md. |
| Timed rehearsal | Page: under-20-minute builder run and full 50-minute rehearsal. Faculty pilot is waived by Page for this alpha. |
| Offline fallback | Guide and text-only outage activity are complete. Page must export the deck, download the guides/JSON, and verify the package offline on the laptop. |
| Optional ambience | Page's Udio track remains optional; its absence does not block play. |

Final five-keyway narration is now integrated and published with its portrait, Hear/Stop controls, on-screen script, and captions. No recording is outstanding. The epilogue still uses the deliberate Step into the vault transition.

Image dimension metadata and a complete copy-deck refresh are deferred polish. The updated JSON is the authoritative copy for this review. No release-ready or WCAG-conformance claim is made.

## Alpha decision, September 19

The current owner preparation list is docs/alpha-owner-items.md. The final-keyway recording requirement is complete. The Lovable accessibility-tree pass does not certify the separate Exemplar screen-reader path.

## Final narration integration, September 20

September 20: Page supplied the final Archivist recording. With explicit approval, Groq transcription verified the exact script and three speech segments. Original MP3 copied unchanged; matching VTT and on-screen prompt added. Final keyways now show the Archivist portrait and Hear/Stop controls, using existing voice cleanup on solve/navigation. Source and compiled browser validators updated to require captions when final-lock audio is present. All 13 tests and content validation pass. An isolated local browser fixture verified manual play, replay, scene departure, and solving the five keyways stops narration. Browser autoplay was blocked in that test, and the manual control remained usable. No claim of an auditory listening pass. These changes were subsequently published with explicit approval; the earlier deployment hold is closed.

## Game publication confirmed, September 20

Published September 20, 2026 with Page's explicit approval: game commit 42cb97be0792e18753da442bc7e6838db8f89a79, including reviewed fixes and supplied final-lock audio. GitHub content validation and Pages deployment both succeeded. Public JSON, renderer, compiled validator, MP3, and VTT all returned HTTP 200 and matched local SHA-256 hashes. URL: https://belovedcoachp.github.io/escape-the-lecture/exemplar/. The existing browser session retained older cached modules; browser UI checks from that session are not claimed as a fresh full playthrough of the deployed revision. Local complete-game and final-audio fixture checks remain documented above.
Earlier deployment holds are superseded by this approval and successful release.

## Current status reconciliation September 21

Fresh HTTP checks returned 200 and matched local SHA-256 hashes for public content/vault-content.json, exemplar/js/render/shell.js, final-keyways.mp3, and final-keyways.vtt. Local HEAD remains 42cb97b. This is an asset-integrity check, not a new full gameplay or screen-reader run. The prior 13-test result remains the last recorded automated game result; no new code was changed or new suite claimed in this documentation refresh.

Deck, 50-minute guide, both native Google Docs participant handouts, prepared Science JSON, and text-only fallback now exist. The owner list no longer assigns these as unbuilt. Remaining work is rehearsal, offline export/download verification, participant permissions, physical-device/media checks, and the explicitly unverified accessibility coverage. Pilot remains waived. No new known code blocker was established in this status refresh; this does not close untested coverage.
