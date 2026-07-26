// Repair primitive: corrupted text fixed in place against known-good
// answers. Gradeable, unlike response. Native text inputs, so the keyboard
// path needs no special instructions. Matching is case-insensitive and
// whitespace-forgiving; attempts are unlimited and nothing is timed.

import { el, normalize } from "./dom.js";

export function renderRepair(challenge, done, api) {
  const wrap = el("div", { className: "repair-body" });

  if (done) {
    wrap.append(solvedSummary(challenge));
    return wrap;
  }

  const segments = challenge.segments.map((segment, i) => {
    const seg = el("div", { className: "repair-seg" });
    if (segment.context) {
      seg.append(el("p", { className: "bin-desc", textContent: segment.context }));
    }
    const inputId = `${challenge.id}-${segment.id}`;
    const status = el("span", { className: "sort-status" });
    const label = el("label", { attrs: { for: inputId } });
    label.append(
      el("span", { textContent: `Repair line ${i + 1}` }),
      status,
    );
    const input = el("input", {
      id: inputId,
      className: "repair-input",
      value: segment.broken,
      attrs: { type: "text", autocomplete: "off", spellcheck: "false" },
    });
    const feedback = el("p", { className: "option-feedback", hidden: true });
    seg.append(label, input, feedback);
    wrap.append(seg);
    return { segment, input, status, feedback };
  });

  const verify = el("button", { textContent: "Verify repairs" });
  verify.addEventListener("click", () => {
    let repaired = 0;
    segments.forEach((s) => {
      const ok = s.segment.accepted.some(
        (a) => normalize(a) === normalize(s.input.value),
      );
      s.status.textContent = ok ? " ✓ repaired" : " ✗ still broken";
      if (ok) repaired += 1;
    });
    if (repaired < segments.length) {
      api.announce(
        `${repaired} of ${segments.length} lines repaired. The broken lines are marked; keep going, nothing is lost.`,
      );
      return;
    }
    segments.forEach((s) => {
      s.input.readOnly = true;
      s.feedback.hidden = false;
      s.feedback.textContent = s.segment.feedback;
    });
    verify.disabled = true;
    verify.textContent = "Challenge complete ✓";
    api.complete();
  });

  wrap.append(el("p", {}, verify));
  return wrap;
}

function solvedSummary(challenge) {
  const div = el("div");
  div.append(el("p", { className: "solved-badge", textContent: "✓ Challenge complete" }));
  challenge.segments.forEach((s) => {
    div.append(
      el("p", { className: "option-feedback", textContent: `✓ ${s.accepted[0]} (${s.feedback})` }),
    );
  });
  return div;
}
