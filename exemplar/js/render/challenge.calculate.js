// Calculate primitive: enter a computed value with tolerance. The player
// runs the numbers the companion did not. Unlimited attempts, nothing timed,
// and the input forgives units and stray characters around the number.

import { el, parseNumericAnswer } from "./dom.js";
import { mercy } from "./mercy.js";

export function renderCalculate(challenge, done, api) {
  const wrap = el("div", { className: "calculate-body" });

  if (done) {
    wrap.append(
      el("p", { className: "solved-badge", textContent: "✓ Challenge complete" }),
      el("p", { className: "option-feedback", textContent: challenge.feedback }),
    );
    return wrap;
  }

  const inputId = `${challenge.id}-value`;
  const label = el("label", {
    textContent: challenge.inputLabel ?? "Your result",
    attrs: { for: inputId },
  });
  const input = el("input", {
    id: inputId,
    value: api.draft.value ?? "",
    className: "calc-input",
    attrs: { type: "text", inputmode: "decimal", autocomplete: "off" },
  });
  const unitNote = challenge.unit
    ? el("span", { className: "calc-unit", textContent: challenge.unit })
    : null;
  input.addEventListener("input", () => api.saveDraft({ value: input.value }));
  const feedback = el("p", { className: "option-feedback", hidden: true });
  // Wrong attempts show on screen, not just in the live region.
  const status = el("p", { className: "attempt-feedback" });
  const relief = mercy({
    announce: api.announce,
    answerLines: () => [
      // A unit like ":1" reads as part of the number; a word gets a space.
      `${challenge.answer}${challenge.unit ? `${/^[a-z]/i.test(challenge.unit) ? " " : ""}${challenge.unit}` : ""}`,
    ],
    onApply: () => {
      input.value = String(challenge.answer);
      api.saveDraft({ value: input.value });
      attempt();
    },
  });
  const verify = el("button", { textContent: "Check the number" });

  const attempt = () => {
    if (verify.disabled) return;
    const value = parseNumericAnswer(input.value);
    if (Number.isNaN(value)) {
      status.textContent = "Enter one number, or a complete ratio such as 7:1.";
      api.announce("Enter one number, or a complete ratio such as 7:1.");
      return;
    }
    const tolerance = challenge.tolerance ?? 0;
    if (Math.abs(value - challenge.answer) > tolerance) {
      const message =
        challenge.wrongText ??
        "That is not the value. Check the working and try again; nothing is lost.";
      status.textContent = `✗ ${message}`;
      api.announce(message);
      relief.fail(status);
      input.select();
      return;
    }
    status.textContent = "";
    input.readOnly = true;
    feedback.hidden = false;
    feedback.textContent = challenge.feedback;
    verify.disabled = true;
    verify.textContent = "Challenge complete ✓";
    api.complete();
  };

  verify.addEventListener("click", attempt);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      attempt();
    }
  });

  const row = el("div", { className: "calc-row" });
  row.append(input);
  if (unitNote) row.append(unitNote);
  wrap.append(label, row, status, feedback, el("p", {}, verify));
  return wrap;
}
