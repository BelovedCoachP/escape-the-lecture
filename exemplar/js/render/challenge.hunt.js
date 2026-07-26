// Hunt primitive: the inverted hidden-object mechanic. The artifact is real
// readable structure, so a screen reader user and a sighted user inspect the
// same object. Parts are toggle buttons (aria-pressed); flag what cannot be
// true, then confirm. The flagged state always carries text, never color
// alone.

import { el } from "./dom.js";

export function renderHunt(challenge, done, api) {
  const wrap = el("div", { className: "hunt-body" });

  if (done) {
    wrap.append(solvedSummary(challenge));
    return wrap;
  }

  wrap.append(
    el("p", {
      className: "placeholder-note",
      textContent:
        "Select a part to flag it as impossible; select it again to remove the flag. Every flag change is announced. Confirm when you are ready.",
    }),
  );

  const artifact = el("div", {
    className: "artifact",
    attrs: { role: "group", "aria-label": "The artifact under inspection" },
  });

  const parts = challenge.artifact.map((part) => {
    const flagState = el("span", { className: "flag-state", textContent: "" });
    const btn = el("button", {
      className: "flag-btn",
      attrs: { "aria-pressed": "false" },
    });
    btn.append(
      el("span", { className: "flag-label", textContent: part.label ? `${part.label}. ` : "" }),
      el("span", { textContent: part.text }),
      flagState,
    );
    const feedback = el("p", { className: "option-feedback", hidden: true });
    btn.addEventListener("click", () => {
      const pressed = btn.getAttribute("aria-pressed") === "true";
      btn.setAttribute("aria-pressed", String(!pressed));
      flagState.textContent = pressed ? "" : " — flagged";
      const count = parts.filter(
        (p) => p.btn.getAttribute("aria-pressed") === "true",
      ).length;
      api.announce(
        `${part.label ?? "Part"} ${pressed ? "unflagged" : "flagged"}. ${count} flagged in total.`,
      );
    });
    const row = el("div", { className: "artifact-part" });
    row.append(btn, feedback);
    artifact.append(row);
    return { part, btn, feedback, flagState };
  });

  const confirm = el("button", { textContent: "Confirm findings" });
  confirm.addEventListener("click", () => {
    const flagged = parts.filter((p) => p.btn.getAttribute("aria-pressed") === "true");
    if (flagged.length === 0) {
      api.announce("Flag at least one part before confirming.");
      return;
    }
    const solved = parts.every(
      (p) => (p.btn.getAttribute("aria-pressed") === "true") === p.part.flawed,
    );
    if (!solved) {
      api.announce(
        "Your flags do not match the flaws. Either something true is flagged, or something impossible is not. Adjust and confirm again; nothing is lost.",
      );
      return;
    }
    parts.forEach((p) => {
      p.btn.disabled = true;
      p.flagState.textContent = p.part.flawed ? " — ✗ impossible detail" : " — ✓ verified";
      p.feedback.hidden = false;
      p.feedback.textContent = p.part.feedback;
    });
    confirm.disabled = true;
    confirm.textContent = "Challenge complete ✓";
    api.complete();
  });

  wrap.append(artifact, el("p", {}, confirm));
  return wrap;
}

function solvedSummary(challenge) {
  const div = el("div");
  div.append(el("p", { className: "solved-badge", textContent: "✓ Challenge complete" }));
  challenge.artifact.forEach((p) => {
    div.append(
      el("p", {
        className: "option-feedback",
        textContent: `${p.flawed ? "✗ impossible" : "✓ verified"} ${p.label ? p.label + ": " : ""}${p.text}`,
      }),
    );
  });
  return div;
}
