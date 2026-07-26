// Match primitive: connect column A to column B. Each left item exposes a
// native select of every right-side option (sorted, so position never leaks
// the answer). Nothing is judged until the player verifies.

import { el } from "./dom.js";

export function renderMatch(challenge, done, api) {
  const wrap = el("div", { className: "match-body" });

  if (done) {
    wrap.append(solvedSummary(challenge));
    return wrap;
  }

  const rightOptions = challenge.pairs
    .map((p) => p.right)
    .sort((a, b) => a.localeCompare(b));

  const rows = challenge.pairs.map((pair, i) => {
    const row = el("div", { className: "match-row" });
    const selectId = `${challenge.id}-${pair.id}`;
    const status = el("span", { className: "sort-status" });
    const label = el("label", { attrs: { for: selectId } });
    label.append(el("span", { textContent: pair.left }), status);
    const select = el("select", { id: selectId, className: "match-select" });
    select.append(el("option", { value: "", textContent: "Choose a match" }));
    rightOptions.forEach((r) =>
      select.append(el("option", { value: r, textContent: r })),
    );
    const feedback = el("p", { className: "option-feedback", hidden: true });
    row.append(label, select, feedback);
    wrap.append(row);
    return { pair, select, status, feedback };
  });

  const verify = el("button", { textContent: "Verify matches" });
  verify.addEventListener("click", () => {
    const unset = rows.filter((r) => r.select.value === "");
    if (unset.length) {
      api.announce(
        `${unset.length} item${unset.length === 1 ? " needs" : "s need"} a match before verifying.`,
      );
      return;
    }
    let correct = 0;
    rows.forEach((r) => {
      const ok = r.select.value === r.pair.right;
      r.status.textContent = ok ? " ✓ matched" : " ✗ reconsider this one";
      if (ok) correct += 1;
    });
    if (correct < rows.length) {
      api.announce(
        `${correct} of ${rows.length} matched correctly. Reconsider the marked items; nothing is lost.`,
      );
      return;
    }
    rows.forEach((r) => {
      r.select.disabled = true;
      r.feedback.hidden = false;
      r.feedback.textContent = r.pair.feedback;
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
  challenge.pairs.forEach((p) => {
    div.append(
      el("p", {
        className: "option-feedback",
        textContent: `✓ ${p.left} → ${p.right}. ${p.feedback}`,
      }),
    );
  });
  return div;
}
