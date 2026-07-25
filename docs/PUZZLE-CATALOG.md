# Puzzle catalog and game structure

Scoping document, 2026-07-25. Written against the Breakout EDU digital puzzle catalog (22 observed mechanics, 4 game structures) and filtered through the one constraint this project cannot bend: every puzzle must be solvable by a person using a screen reader, a keyboard, no color perception, and no clock.

This document decides what the Exemplar builds. The faculty Template is unchanged and still exposes exactly three types: `choice`, `sequence`, `response`.

## 0. Difficulty principle

The audience is adults, mostly faculty. Calibrate every puzzle to challenge an adult, not to guarantee completion.

- **A hint narrows the search space. It never contains the answer.** Not at any tier. Escalating hints move from reframing (what kind of thing is being asked) to focusing (which part of the room's work matters) to strong scaffold (the shape of the answer), and stop there.
- The no-dead-end guarantee comes from structure, not from answer giveaways: unlimited attempts, no timer, nothing lost on a wrong try, and codes that are honestly derivable from work the player has already done.
- If a puzzle cannot be made challenging without becoming unfair, fix the puzzle, not the hints.

---

## 1. The finding that matters most

The puzzle catalog was the wrong place to look first. The game structure was.

Breakout EDU uses four structures:

| Structure | How it works | What we shipped |
|---|---|---|
| Non-sequential | Multiple independent locks, solved in any order | |
| Sequential | Each solution reveals the next puzzle | |
| Carousel | Players move through a sequence of panels | **This one** |
| Breakout+ | Scene-based, inventory, navigation, mini-games | |

Session A shipped a carousel: brief, challenges, next, repeat, five times. A carousel stays a carousel no matter how many puzzle types you pour into it. Adding mechanics without changing structure would have produced a more varied carousel and the same flat feeling.

Three structural changes, in priority order:

1. **Locks.** The room has no lock. Nothing is ever opened by the player producing an answer. `rewardLabel: "Vault key: DESCRIBE"` already sits in the content and nothing consumes it. Each level ends at a lock whose code the player derives from that level's work.
2. **Non-sequential within a level.** A level's three challenges become independently attackable in any order. The lock appears when all three are solved. Player agency arrives without any new puzzle content.
3. **Meta-lock at the Final Vault.** Five vault keys, collected across five rooms, assemble into the last lock. This is the multi-stage collection meta-puzzle, and it is what makes the ending feel earned rather than announced.

---

## 2. Accessibility filter on all 22 mechanics

Every Breakout mechanic, judged honestly against WCAG 2.1 AA and screen reader operation.

### Ships as-is (textual or structural by nature)

| Breakout mechanic | Our primitive | Notes |
|---|---|---|
| Classification challenge | `sort` | Items into named bins. Keyboard: grab, move between bins, drop, position announced. |
| Sorting by size, weight, or value | `sort` | Same renderer, ordered bins. |
| Letter or word extraction | `extract` | Purely textual. Feeds codes into locks. |
| Text reconstruction | `repair` | Scrambled or corrupted text repaired against known-good answers. Gradeable, unlike `response`. |
| Arithmetic target matching | `calculate` | Enter a computed value with tolerance and units. |
| Missing-value calculation | `calculate` | Same renderer, target hidden. |
| Measurement or unit conversion | `calculate` | Contrast ratios are literally this. |
| Tile or pair matching | `match` | The pairing half is fully accessible; the rotation half is not, so we drop rotation. |
| Inventory-based puzzle | inventory system | Extends the existing `evidenceFragment` bank into carried keys. |
| Multi-stage collection meta-puzzle | `lock` (meta) | The five vault keys. |
| Navigation or map puzzle | hall navigation | Named locations as a list, not a visual map. Enables non-sequential structure. |

### Ships after deliberate redesign

| Breakout mechanic | Our primitive | What we changed and why |
|---|---|---|
| Hidden-object collection | `hunt` | **The best idea in this document.** A visual scavenger hunt is unplayable without sight. Invert it: hide the objects *structurally* instead of visually. A document looks finished to a sighted player and is full of holes to a screen reader. The player hunts for elements that look like headings but are not tagged as headings. Sighted players must work to find what screen reader users hear immediately. The accessibility relationship reverses, and that reversal is the lesson. |
| Direction sequence | `sequence` | Orientation carried in text, not in image rotation. |
| Counting code | `hunt` or `calculate` | Accessible only when the things counted are real semantic elements. Count the images missing alt text in a live document, not objects in a picture. |
| Placement or assembly | `sort` / `sequence` | Drag is the pointer affordance, never the only one. Same keyboard contract as the reading-order puzzle. |
| Shape code | dropped or `match` | Only works if shapes are labeled, at which point it is just matching. Low value, not planned. |
| Pipe or pathway construction | `sequence` (tab-order variant) | Rotation is out. But "connect the start of the page to the submit button through the focusable elements in order" is a genuine tab-order puzzle and thematically perfect for Level 4. Optional stretch. |

### Deliberately excluded, and used as content instead

These cannot be made accessible without becoming a different mechanic. That makes them useless as puzzles and extremely valuable as material.

| Breakout mechanic | Why it fails | WCAG |
|---|---|---|
| Color code | Color is the sole carrier of meaning. This is the textbook violation. | 1.4.1 |
| Arcade sorting challenge | Requires timing and hand-eye coordination; punishes motor and cognitive difference. | 2.2.1, 2.5.1 |
| Sequence reproduction from memory | Pure recall test with no alternative path. | 2.2.1, and the spirit of 3.3.8 |
| Hidden-object (visual scanning) | Vision is the mechanic. Replaced by `hunt` above. | 1.1.1 |
| Lever or balance puzzle | Spatial-motor simulation with no text equivalent. | 2.1.1 |
| Cause-and-effect machine | Animation-dependent chain reaction; heavy motion, weak text fallback. | 2.3.3 |

**AURA proposes these.** That is the move. AURA suggests a gorgeous color-coded status system for Level 2. AURA proposes a timed sorting minigame to speed the player up. AURA offers a memory sequence. Each one is confident, specific, well-intentioned, and would lock a real learner out of the room. The player rejects them and says why.

This converts the accessibility constraint from a limitation into the game's best content, and it gives the Jacksonville session a slide that is hard to argue with: here are 22 mechanics from the leading digital breakout platform, here are the ones a screen reader user can actually solve, and here is what we did with the rest.

---

## 3. Proposed Exemplar primitives

Ten types. Three of them already exist.

| Primitive | Status | Mechanic |
|---|---|---|
| `choice` | exists | Select one or many |
| `sequence` | exists | Reorder a list, keyboard operable |
| `response` | exists | Free text, self-scored against rubric |
| `sort` | new | Items into named bins |
| `match` | new | Connect column A to column B |
| `calculate` | new | Enter a computed value with tolerance and units |
| `repair` | new | Fix corrupted text against known-good answers |
| `extract` | new | Derive letters or words from solved work to form a code |
| `hunt` | new | Find structural flaws in a live rendered artifact |
| `lock` | new | Enter a code. Opens a level; the meta version opens the vault. |

Plus two systems: **inventory** (carried keys) and **non-sequential level flow**.

---

## 4. Level mapping

Every level uses a different combination. No mechanic repeats in consecutive rooms.

| Level | Challenges | Lock |
|---|---|---|
| 1. The Invisible Image | `sort` four images into Decorative / Meaningful · `hunt` AURA's invented detail in the diagram · `response` write alt text and long description | DESCRIBE |
| 2. The Color Chamber | `calculate` contrast ratios · `sort` AURA's palettes into Passes AA / Fails · `choice` reject AURA's color-only indicator | DISTINGUISH |
| 3. The Caption Conspiracy | `repair` the garbled captions · `match` each AURA repair to its failure type · `hunt` the two terms AURA silently rewrote | TRANSCRIBE |
| 4. The Document Labyrinth | `sequence` reading order · `hunt` untagged headings · `match` link text to destination | STRUCTURE |
| 5. The Prompt Reactor | `repair` the decayed prompt · `choice` which prompt yields verifiable output · `extract` the key from the repaired constraints | INSTRUCT |
| Final Vault | `lock` (meta) assemble all five keys · `response` the recommendation | opens |

---

## 5. Build order

Schema goes to v1.1, purely additive. Existing Level 1 content stays valid and all nine negative accessibility tests still pass.

**Session B1, structure first.** `lock`, inventory, non-sequential level flow, meta-lock. This is where the "basic" feeling actually dies. Smallest code, largest perceived change.

**Session B2, the high-value primitives.** `sort`, `hunt`, `repair`. These three cover eleven Breakout mechanics between them and carry every level.

**Session B3, the rest.** `match`, `calculate`, `extract`.

**Session B4.** Rebuild Level 1 to full interactivity as the proof, then play it.

Keyboard path is built first for every primitive, before the pointer path, without exception. `sort` and `hunt` are the two hard ones, and that difficulty is the demo.
