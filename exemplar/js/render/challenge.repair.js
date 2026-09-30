// Repair primitive: corrupted text fixed in place against known-good
// answers. Gradeable, unlike response. Native text inputs, so the keyboard
// path needs no special instructions. Matching is case-insensitive and
// whitespace-forgiving; attempts are unlimited and nothing is timed.

import { el, normalize, answerMatches } from "./dom.js";
import { mercy, MERCY_NOTICE } from "./mercy.js";

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
    // The corrupted original stays on screen while the player works, so
    // erasing the input never erases the evidence of what needs fixing.
    const original = el("p", { className: "repair-original" });
    original.append(
      el("span", { className: "repair-original-label", textContent: "As captured: " }),
      el("span", { textContent: segment.broken }),
    );
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
      value: api.draft[segment.id] ?? segment.broken,
      attrs: { type: "text", autocomplete: "off", spellcheck: "false" },
    });
    const feedback = el("p", { className: "option-feedback", hidden: true });
    input.addEventListener("input", () => {
      api.draft[segment.id] = input.value;
      api.saveDraft(api.draft);
      status.textContent = "";
    });
    seg.append(original, label, input, feedback);
    wrap.append(seg);
    return { segment, input, status, feedback };
  });

  const status = el("p", { className: "attempt-feedback" });
  const isRepaired = (s) => answerMatches(s.segment.accepted, s.input.value);
  const signature = () => segments.map((s) => normalize(s.input.value)).join("\n");
  const relief = mercy({
    // Submitting the corrupted lines untouched is not an attempt.
    startSignature: challenge.segments.map((s) => normalize(s.broken)).join("\n"),
    answerLines: () =>
      challenge.segments.map((s, i) => `Line ${i + 1}: ${s.accepted[0]}`),
    onApply: () => {
      // Lines the player already repaired keep the player's own wording.
      segments.forEach((s) => {
        if (isRepaired(s)) return;
        s.input.value = s.segment.accepted[0];
        api.draft[s.segment.id] = s.input.value;
      });
      api.saveDraft(api.draft);
      verify.click();
    },
  });
  const verify = el("button", { textContent: "Verify repairs" });
  verify.addEventListener("click", () => {
    let repaired = 0;
    segments.forEach((s) => {
      const ok = isRepaired(s);
      s.status.textContent = ok ? " ✓ repaired" : " ✗ still broken";
      if (ok) repaired += 1;
    });
    if (repaired < segments.length) {
      const message = `✗ ${repaired} of ${segments.length} lines repaired. The broken lines are marked; keep going, nothing is lost.`;
      status.textContent = message;
      const opened = relief.fail(status, signature());
      api.announce(opened ? `${message} ${MERCY_NOTICE}` : message);
      return;
    }
    relief.resolve();
    status.textContent = "";
    segments.forEach((s) => {
      s.input.readOnly = true;
      s.feedback.hidden = false;
      s.feedback.textContent = s.segment.feedback;
    });
    verify.disabled = true;
    verify.textContent = "Challenge complete ✓";
    api.complete();
  });

  wrap.append(status, el("p", {}, verify));
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
