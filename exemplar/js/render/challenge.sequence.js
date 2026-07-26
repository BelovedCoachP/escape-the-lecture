// Sequence primitive: the reading-order puzzle. Drag is the pointer
// affordance and never the only one; this build ships the keyboard path
// first, exactly as authored in the content's keyboardInstructions:
// grab an element, move it with the arrow keys, drop it with Enter.
// Position is announced after every move. Per-item move buttons give
// pointer users (and a second keyboard path) the same power.

import { el } from "./dom.js";

export function renderSequence(challenge, done, api) {
  const wrap = el("div", { className: "sequence-body" });

  if (done) {
    wrap.append(solvedSummary(challenge));
    return wrap;
  }

  wrap.append(
    el("p", { className: "placeholder-note", textContent: challenge.keyboardInstructions }),
  );

  const list = el("ol", {
    className: "sequence-list",
    attrs: { "aria-label": "Elements to reorder" },
  });

  // Never present the solution: if the authored order already matches
  // correctOrder, display it reversed.
  let items = [...challenge.items];
  if (items.map((i) => i.id).join() === challenge.correctOrder.join()) {
    items = items.reverse();
  }

  const rows = items.map((item) => {
    const li = el("li", { className: "seq-item" });
    const posSpan = el("span", { className: "seq-pos" });
    const stateSpan = el("span", { className: "seq-state" });
    const grab = el("button", {
      className: "seq-grab",
      attrs: { "aria-pressed": "false" },
    });
    grab.append(posSpan, el("span", { textContent: item.text }), stateSpan);
    const up = el("button", {
      className: "secondary seq-move",
      textContent: "↑",
      attrs: { "aria-label": `Move "${item.text}" up one position` },
    });
    const down = el("button", {
      className: "secondary seq-move",
      textContent: "↓",
      attrs: { "aria-label": `Move "${item.text}" down one position` },
    });
    li.append(grab, up, down);
    list.append(li);
    return { item, li, grab, posSpan, stateSpan, up, down };
  });

  const positionOf = (li) => [...list.children].indexOf(li) + 1;

  const refreshPositions = () => {
    rows.forEach((r) => {
      r.posSpan.textContent = `${positionOf(r.li)}. `;
    });
  };
  refreshPositions();

  const move = (row, delta, viaGrab) => {
    const children = [...list.children];
    const index = children.indexOf(row.li);
    const target = index + delta;
    if (target < 0 || target >= children.length) {
      api.announce(
        `Cannot move ${delta < 0 ? "up" : "down"}. Position ${index + 1} of ${children.length}.`,
      );
      return;
    }
    if (delta < 0) list.insertBefore(row.li, children[target]);
    else list.insertBefore(children[target], row.li);
    refreshPositions();
    (viaGrab ? row.grab : delta < 0 ? row.up : row.down).focus();
    api.announce(`Moved. Position ${positionOf(row.li)} of ${rows.length}.`);
  };

  rows.forEach((row) => {
    row.grab.addEventListener("click", () => {
      const grabbed = row.grab.getAttribute("aria-pressed") === "true";
      // Only one element grabbed at a time
      rows.forEach((r) => {
        r.grab.setAttribute("aria-pressed", "false");
        r.stateSpan.textContent = "";
      });
      if (!grabbed) {
        row.grab.setAttribute("aria-pressed", "true");
        row.stateSpan.textContent = " (grabbed)";
        api.announce(
          `Grabbed. Position ${positionOf(row.li)} of ${rows.length}. Use the up and down arrow keys to move it, then press Enter to drop it.`,
        );
      } else {
        api.announce(`Dropped at position ${positionOf(row.li)} of ${rows.length}.`);
      }
    });
    row.grab.addEventListener("keydown", (e) => {
      if (row.grab.getAttribute("aria-pressed") !== "true") return;
      if (e.key === "ArrowUp") {
        e.preventDefault();
        move(row, -1, true);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        move(row, 1, true);
      }
    });
    row.up.addEventListener("click", () => move(row, -1, false));
    row.down.addEventListener("click", () => move(row, 1, false));
  });

  const verify = el("button", { textContent: "Verify order" });
  verify.addEventListener("click", () => {
    const currentOrder = rows
      .slice()
      .sort((a, b) => positionOf(a.li) - positionOf(b.li))
      .map((r) => r.item.id);
    const inPlace = currentOrder.filter(
      (id, i) => id === challenge.correctOrder[i],
    ).length;
    if (inPlace < challenge.correctOrder.length) {
      api.announce(
        `The order is not right yet. ${inPlace} of ${challenge.correctOrder.length} elements sit in their correct positions. Nothing is lost; keep working.`,
      );
      return;
    }
    rows.forEach((r) => {
      r.grab.disabled = true;
      r.up.disabled = true;
      r.down.disabled = true;
      r.stateSpan.textContent = " ✓";
    });
    if (challenge.explanation) {
      wrap.append(
        el("p", { className: "option-feedback", textContent: challenge.explanation }),
      );
    }
    verify.disabled = true;
    verify.textContent = "Challenge complete ✓";
    api.complete();
  });

  wrap.append(list, el("p", {}, verify));
  return wrap;
}

function solvedSummary(challenge) {
  const div = el("div");
  div.append(el("p", { className: "solved-badge", textContent: "✓ Challenge complete" }));
  const list = el("ol");
  challenge.correctOrder.forEach((id) => {
    const item = challenge.items.find((i) => i.id === id);
    if (item) list.append(el("li", { textContent: item.text }));
  });
  div.append(list);
  if (challenge.explanation) {
    div.append(el("p", { className: "option-feedback", textContent: challenge.explanation }));
  }
  return div;
}
