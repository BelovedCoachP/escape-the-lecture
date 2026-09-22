// The mercy rule: three genuinely wrong attempts on any checkable puzzle
// and the Archivist steps in with the answer, plus one button that applies
// it. A conference room has a clock even when the game does not; nobody
// stays stuck past three tries. Incomplete submissions (nothing selected,
// empty input, items still unsorted) never count — only real wrong answers.

import { el } from "./dom.js";

const ATTEMPTS_BEFORE_MERCY = 3;

export function mercy({ announce, answerLines, onApply, applyLabel }) {
  let fails = 0;
  let card = null;

  return {
    // Call on every genuinely wrong attempt. `anchor` is the element the
    // mercy card appears above (usually the visible status line).
    fail(anchor) {
      fails += 1;
      if (fails < ATTEMPTS_BEFORE_MERCY || card) return;

      card = el("aside", {
        className: "mercy-card",
        attrs: { "aria-label": "The Archivist steps in" },
      });
      card.append(
        el("p", { className: "mercy-eyebrow", textContent: "The Archivist steps in" }),
        el("p", {
          className: "archivist-voice",
          textContent:
            "'Three honest attempts is enough. The point was never to stay stuck; here is the answer.'",
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
          apply.disabled = true;
          onApply();
        });
        card.append(el("p", {}, apply));
      }

      anchor.before(card);
      announce(
        "After three attempts, the Archivist steps in. The answer is now shown on screen, with a button that applies it for you.",
      );
    },
  };
}
