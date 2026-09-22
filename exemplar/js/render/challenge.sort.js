// Sort primitive: items into named bins. The keyboard path IS the design:
// every item exposes one button per bin, every placement is announced, and
// items can be moved again freely. Nothing is judged until Verify.

import { el } from "./dom.js";
import { mercy } from "./mercy.js";

export function renderSort(challenge, done, api) {
  const wrap = el("div", { className: "sort-body" });

  if (done) {
    wrap.append(solvedSummary(challenge));
    return wrap;
  }

  wrap.append(
    el("p", { className: "placeholder-note", textContent: challenge.keyboardInstructions }),
  );

  // placement state: itemId -> binId (or undefined while in the tray)
  const placement = { ...api.draft };

  const trayList = el("ul", { className: "sort-list" });
  const tray = el("section", { className: "sort-tray" });
  tray.append(el("h4", { textContent: "Unsorted" }), trayList);

  const binLists = {};
  const binsWrap = el("div", { className: "sort-bins" });
  challenge.bins.forEach((bin) => {
    const list = el("ul", { className: "sort-list" });
    binLists[bin.id] = list;
    const section = el("section", { className: "sort-bin" });
    section.append(el("h4", { textContent: bin.label }));
    if (bin.description) {
      section.append(el("p", { className: "bin-desc", textContent: bin.description }));
    }
    section.append(list);
    binsWrap.append(section);
  });

  const itemEls = {};
  challenge.items.forEach((item) => {
    const li = el("li", { className: "sort-item" });
    const statusSpan = el("span", { className: "sort-status" });
    const actions = el("div", { className: "sort-actions" });
    challenge.bins.forEach((bin) => {
      const btn = el("button", {
        className: "secondary sort-place",
        textContent: bin.label,
        attrs: { "aria-label": `Place "${item.text}" in ${bin.label}` },
      });
      btn.addEventListener("click", () => {
        placement[item.id] = bin.id;
        api.saveDraft(placement);
        binLists[bin.id].append(li);
        actions.querySelectorAll("button").forEach((b) => (b.disabled = false));
        btn.setAttribute("aria-pressed", "true");
        actions.querySelectorAll("button").forEach(b => b.setAttribute("aria-pressed", String(b === btn)));
        btn.focus();
        statusSpan.textContent = "";
        li.classList.remove("is-wrong");
        const unsorted = challenge.items.length - Object.keys(placement).length;
        api.announce(
          `Placed in ${bin.label}. ${unsorted === 0 ? "All items placed." : `${unsorted} unsorted.`}`,
        );
      });
      actions.append(btn);
    });
    li.append(
      el("span", { className: "sort-text", textContent: item.text }),
      statusSpan,
      actions,
    );
    (binLists[placement[item.id]] ?? trayList).append(li);
    [...actions.children].forEach((button, index) => button.setAttribute("aria-pressed", String(challenge.bins[index].id === placement[item.id])));
    itemEls[item.id] = { li, statusSpan, actions };
  });

  // The verdict lands where the eyes are: a visible status line beside the
  // button that was just pressed, plus marks and borders on the items.
  const status = el("p", { className: "attempt-feedback" });
  const relief = mercy({
    announce: api.announce,
    answerLines: () =>
      challenge.items.map((i) => {
        const bin = challenge.bins.find((b) => b.id === i.correctBin);
        return `${i.text} → ${bin?.label ?? i.correctBin}`;
      }),
    onApply: () => {
      challenge.items.forEach((i) => {
        placement[i.id] = i.correctBin;
        const refs = itemEls[i.id];
        binLists[i.correctBin].append(refs.li);
        refs.li.classList.remove("is-wrong");
        refs.statusSpan.textContent = "";
        [...refs.actions.children].forEach((button, index) =>
          button.setAttribute(
            "aria-pressed",
            String(challenge.bins[index].id === i.correctBin),
          ),
        );
      });
      api.saveDraft(placement);
      verify.click();
    },
  });
  const verify = el("button", { textContent: "Verify sorting" });
  verify.addEventListener("click", () => {
    const unplaced = challenge.items.filter((i) => !placement[i.id]);
    if (unplaced.length) {
      const message = `✗ ${unplaced.length} item${unplaced.length === 1 ? " is" : "s are"} still unsorted. Everything needs a shelf before verifying.`;
      status.textContent = message;
      api.announce(message);
      return;
    }
    const wrong = challenge.items.filter((i) => placement[i.id] !== i.correctBin);
    if (wrong.length) {
      challenge.items.forEach((i) => {
        const ok = placement[i.id] === i.correctBin;
        itemEls[i.id].statusSpan.textContent = ok ? " ✓ placed well" : " ✗ reconsider this one";
        itemEls[i.id].li.classList.toggle("is-wrong", !ok);
      });
      const message = `✗ ${challenge.items.length - wrong.length} of ${challenge.items.length} placed correctly. The marked items need another look; nothing is lost.`;
      status.textContent = message;
      api.announce(message);
      relief.fail(status);
      return;
    }
    status.textContent = "";
    challenge.items.forEach((i) => {
      const refs = itemEls[i.id];
      refs.statusSpan.textContent = " ✓";
      refs.li.classList.remove("is-wrong");
      refs.actions.remove();
      refs.li.append(el("p", { className: "option-feedback", textContent: i.feedback }));
    });
    verify.disabled = true;
    verify.textContent = "Challenge complete ✓";
    api.complete();
  });

  wrap.append(tray, binsWrap, status, el("p", {}, verify));
  return wrap;
}

function solvedSummary(challenge) {
  const div = el("div");
  div.append(el("p", { className: "solved-badge", textContent: "✓ Challenge complete" }));
  challenge.bins.forEach((bin) => {
    const list = el("ul");
    challenge.items
      .filter((i) => i.correctBin === bin.id)
      .forEach((i) => list.append(el("li", { textContent: i.text })));
    div.append(el("p", { className: "bin-desc", textContent: bin.label }), list);
  });
  return div;
}
