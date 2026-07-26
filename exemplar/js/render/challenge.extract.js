// Extract primitive: derive letters or words from the displayed source to
// form an answer. Purely textual, accessible by nature, and usually the
// step that produces a code for the room's lock.

import { el, normalize } from "./dom.js";

export function renderExtract(challenge, done, api) {
  const wrap = el("div", { className: "extract-body" });

  if (done) {
    wrap.append(
      el("p", { className: "solved-badge", textContent: "✓ Challenge complete" }),
      el("p", { className: "option-feedback", textContent: challenge.feedback }),
    );
    return wrap;
  }

  if (challenge.source) {
    const source = el("div", {
      className: "artifact",
      attrs: { role: "group", "aria-label": "Source material" },
    });
    source.append(el("p", { className: "prewrap", textContent: challenge.source }));
    wrap.append(source);
  }

  const inputId = `${challenge.id}-answer`;
  const label = el("label", {
    textContent: challenge.inputLabel ?? "Your answer",
    attrs: { for: inputId },
  });
  const input = el("input", {
    id: inputId,
    className: "extract-input",
    attrs: { type: "text", autocomplete: "off", spellcheck: "false" },
  });
  const feedback = el("p", { className: "option-feedback", hidden: true });
  const verify = el("button", { textContent: "Confirm answer" });

  const attempt = () => {
    if (input.value.trim() === "") {
      api.announce("Enter your answer first.");
      return;
    }
    const ok = challenge.acceptedAnswers.some(
      (a) => normalize(a) === normalize(input.value),
    );
    if (!ok) {
      api.announce(
        challenge.wrongText ??
          "That is not it. Read the source again; nothing is lost.",
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

  wrap.append(label, input, feedback, el("p", {}, verify));
  return wrap;
}
