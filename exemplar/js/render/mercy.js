// The mercy rule: three genuinely wrong attempts on any checkable puzzle
// and the Archivist steps in with the answer, plus one button that applies
// it. A conference room has a clock even when the game does not; nobody
// stays stuck past three tries.
//
// Only a changed answer counts. Callers pass a signature of what was
// submitted; resubmitting the same answer, or the untouched starting state,
// is not a new attempt. Incomplete submissions never reach fail() at all.

import { el } from "./dom.js";
import { moveFocusTo } from "../a11y.js";

const ATTEMPTS_BEFORE_MERCY = 3;

export const MERCY_NOTICE =
  "The Archivist steps in: the answer and an Apply button are now on screen, just above.";

export function mercy({ answerLines, onApply, applyLabel, startSignature }) {
  let fails = 0;
  let lastSignature = startSignature;
  let card = null;
  let resolved = false;
  let applying = false;

  return {
    // Call on every genuinely wrong attempt, with a signature of the answer.
    // Returns true when this call opened the card, so the caller can fold
    // MERCY_NOTICE into its own announcement (a second announce() would
    // cancel the first).
    fail(anchor, signature) {
      if (resolved || card) return false;
      if (signature !== undefined) {
        if (signature === lastSignature) return false;
        lastSignature = signature;
      }
      fails += 1;
      if (fails < ATTEMPTS_BEFORE_MERCY) return false;

      card = el("div", { className: "mercy-card" });
      card.append(
        el("p", { className: "mercy-eyebrow", textContent: "The Archivist steps in" }),
        el("p", {
          className: "archivist-voice",
          textContent:
            "‘Three honest attempts is enough. The point was never to stay stuck; here is the answer.’",
        }),
      );
      const list = el("ul", { className: "mercy-answers" });
      answerLines().forEach((line) => list.append(el("li", { textContent: line })));
      card.append(list);

      if (onApply) {
        const apply = el("button", {
          className: "secondary",
          textContent: applyLabel ?? "Apply the answer for me",
        });
        apply.addEventListener("click", () => {
          if (resolved) return;
          applying = true;
          try {
            onApply();
          } finally {
            applying = false;
          }
        });
        card.append(el("p", { className: "mercy-actions" }, apply));
      }

      anchor.before(card);
      card.scrollIntoView({ block: "nearest" });
      return true;
    },

    // Call from every success path. If the player solved it themselves the
    // card is no longer needed; if Apply solved it, the card keeps the answer
    // on screen and takes focus with a plain confirmation.
    resolve() {
      if (resolved) return;
      resolved = true;
      if (!card) return;
      if (!applying) {
        card.remove();
        return;
      }
      card.querySelector(".mercy-actions")?.remove();
      const done = el("p", {
        className: "mercy-done",
        textContent: "✓ Answer applied. The challenge is complete.",
      });
      card.append(done);
      moveFocusTo(done);
    },
  };
}
