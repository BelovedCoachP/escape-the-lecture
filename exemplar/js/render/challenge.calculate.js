// Calculate primitive: enter a computed value with tolerance. The player
// runs the numbers the companion did not. Unlimited attempts, nothing timed,
// and the input forgives units and stray characters around the number.

import { el } from "./dom.js";

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
    className: "calc-input",
    attrs: { type: "text", inputmode: "decimal", autocomplete: "off" },
  });
  const unitNote = challenge.unit
    ? el("span", { className: "calc-unit", textContent: challenge.unit })
    : null;
  const feedback = el("p", { className: "option-feedback", hidden: true });
  const verify = el("button", { textContent: "Check the number" });

  const attempt = () => {
    // Take the part before any ":" (ratios), then the first number in it.
    const raw = input.value.split(":")[0].match(/-?\d+(\.\d+)?/);
    const value = raw ? Number(raw[0]) : NaN;
    if (Number.isNaN(value)) {
      api.announce("Enter a number first.");
      return;
    }
    const tolerance = challenge.tolerance ?? 0;
    if (Math.abs(value - challenge.answer) > tolerance) {
      api.announce(
        challenge.wrongText ??
          "That is not the value. Check the working and try again; nothing is lost.",
      );
      input.select();
      return;
    }
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
  wrap.append(label, row, feedback, el("p", {}, verify));
  return wrap;
}
