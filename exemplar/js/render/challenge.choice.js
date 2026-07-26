// Choice primitive: radio or checkbox group per selectMultiple, fully
// labeled. Feedback exists on every option, right and wrong, and a wrong
// answer never traps the learner: read the feedback on what you chose,
// change your mind, try again. Unlimited, untimed.

import { el } from "./dom.js";

export function renderChoice(challenge, done, api) {
  const multi = challenge.selectMultiple === true;
  const wrap = el("div", { className: "choice-body" });

  if (done) {
    wrap.append(solvedSummary(challenge));
    return wrap;
  }

  const fs = el("fieldset", { className: "choice-options" });
  fs.append(
    el("legend", {
      className: "sr-only",
      textContent: multi ? "Select all that apply" : "Select one",
    }),
  );

  const rows = challenge.options.map((option) => {
    const inputId = `${challenge.id}-${option.id}`;
    const input = el("input", {
      attrs: {
        type: multi ? "checkbox" : "radio",
        name: challenge.id,
        id: inputId,
        value: option.id,
      },
    });
    const label = el("label", { textContent: option.text, attrs: { for: inputId } });
    const feedback = el("p", { className: "option-feedback", hidden: true });
    const row = el("div", { className: "choice-row" });
    row.append(input, label, feedback);
    fs.append(row);
    return { option, input, feedback };
  });

  const submit = el("button", { textContent: "Confirm selection" });
  submit.addEventListener("click", () => {
    const chosen = rows.filter((r) => r.input.checked);
    if (chosen.length === 0) {
      api.announce("Select at least one option first.");
      return;
    }
    const correctSet = challenge.options.filter((o) => o.correct).map((o) => o.id);
    const chosenIds = chosen.map((r) => r.option.id);
    const solved =
      chosenIds.length === correctSet.length &&
      chosenIds.every((id) => correctSet.includes(id));

    if (!solved) {
      rows.forEach((r) => {
        if (r.input.checked) {
          r.feedback.hidden = false;
          r.feedback.textContent = `${r.option.correct ? "✓" : "✗"} ${r.option.feedback}`;
        } else {
          r.feedback.hidden = true;
        }
      });
      api.announce(
        "Not yet. Read the feedback on what you selected, adjust, and confirm again. Nothing is lost.",
      );
      return;
    }

    rows.forEach((r) => {
      r.input.disabled = true;
      r.feedback.hidden = false;
      r.feedback.textContent = `${r.option.correct ? "✓" : "·"} ${r.option.feedback}`;
    });
    submit.disabled = true;
    submit.textContent = "Challenge complete ✓";
    api.complete();
  });

  wrap.append(fs, el("p", {}, submit));
  return wrap;
}

function solvedSummary(challenge) {
  const div = el("div");
  div.append(el("p", { className: "solved-badge", textContent: "✓ Challenge complete" }));
  challenge.options.forEach((o) => {
    div.append(
      el("p", {
        className: "option-feedback",
        textContent: `${o.correct ? "✓" : "·"} ${o.text}: ${o.feedback}`,
      }),
    );
  });
  return div;
}
