// Builds the archive hall: header, level frame, progress spine, persistent
// AURA panel, and the three views (intro, level, finale). This is the
// text-first build: media items render as their text equivalents, and
// challenges are placeholders until the interactive primitives land.

import {
  markChallengeComplete,
  challengesComplete,
  isLevelRestored,
  openLock,
  bankEvidence,
  getProgress,
  maxUnlockedOrder,
} from "../state.js";
import { announce, moveFocusTo } from "../a11y.js";
import { el } from "./dom.js";
import { renderChoice } from "./challenge.choice.js";
import { renderSort } from "./challenge.sort.js";
import { renderHunt } from "./challenge.hunt.js";
import { renderRepair } from "./challenge.repair.js";

const TYPE_LABELS = {
  choice: "Selection challenge",
  sequence: "Ordering challenge",
  response: "Written response",
  sort: "Sorting challenge",
  hunt: "Inspection challenge",
  repair: "Repair challenge",
};

export function mountShell(rootEl, content) {
  rootEl.innerHTML = "";

  const header = el("header", { className: "vault-header" });
  header.append(
    el("h1", { className: "vault-title", textContent: content.meta.title }),
  );
  if (content.meta.subtitle) {
    header.append(
      el("p", { className: "vault-subtitle", textContent: content.meta.subtitle }),
    );
  }

  const main = el("main", {
    id: "vault-main",
    className: "vault-main",
  });

  const rail = el("aside", {
    className: "vault-rail",
    attrs: { "aria-label": "Companion and vault status" },
  });

  const companion = content.narrative.companion;
  let companionTranscript = null;
  if (companion) {
    companionTranscript = el("p", {
      className: "companion-transcript",
      textContent: "Standing by.",
    });
    const panel = el("section", { className: "panel companion-panel" });
    panel.append(
      el("h2", { className: "panel-label", textContent: "Companion" }),
      el("p", { className: "companion-name", textContent: companion.name }),
    );
    if (companion.portrait && !companion.portrait.decorative) {
      panel.append(
        el("p", { className: "companion-desc", textContent: companion.portrait.alt }),
      );
    }
    panel.append(companionTranscript);
    rail.append(panel);
  }

  const spineSummary = el("p", { className: "spine-summary" });
  const spineList = el("ol", { className: "spine-list" });
  const spinePanel = el("section", { className: "panel" });
  spinePanel.append(
    el("h2", { className: "panel-label", textContent: "Vault status" }),
    spineSummary,
    spineList,
  );
  rail.append(spinePanel);

  const keysSummary = el("p", { className: "spine-summary" });
  const keysList = el("ul", { className: "spine-list key-list" });
  const keysPanel = el("section", { className: "panel" });
  keysPanel.append(
    el("h2", { className: "panel-label", textContent: "Keyring" }),
    keysSummary,
    keysList,
  );
  rail.append(keysPanel);

  const layout = el("div", { className: "vault-layout" });
  layout.append(main, rail);

  const footer = el("footer", { className: "vault-footer" });
  if (content.meta.brandFooter) {
    footer.append(el("p", { textContent: content.meta.brandFooter }));
  }

  rootEl.append(header, layout, footer);
  return { main, companionTranscript, spineSummary, spineList, keysSummary, keysList };
}

/* ---------- Intro ---------- */

export function renderIntro(ctx) {
  const { content, refs } = ctx;
  const n = content.narrative;
  refs.main.innerHTML = "";
  delete refs.main.dataset.level;
  setScene("hall");

  const view = el("section");
  view.append(
    el("p", { className: "view-eyebrow", textContent: "The Archive · Main Hall" }),
    el("h2", { className: "view-title", textContent: n.roleTitle }),
    el("p", { textContent: n.premise }),
  );

  const success = el("div", { className: "callout" });
  success.append(el("p", { textContent: n.successCondition }));
  view.append(success);

  if (n.openingMedia) {
    view.append(renderVideoAsText(n.openingMedia, "Opening transmission"));
  }

  if (content.meta.objective) {
    const obj = el("details");
    obj.append(
      el("summary", { textContent: "Learning objective" }),
      el("p", { textContent: content.meta.objective }),
    );
    view.append(obj);
  }

  const begin = el("button", { textContent: "Enter the vault" });
  begin.addEventListener("click", () => ctx.actions.begin());
  view.append(el("p", {}, begin));

  refs.main.append(view);
  setCompanionTranscript(ctx, "Standing by.");
}

/* ---------- Level ---------- */

export function renderLevel(level, ctx) {
  const { refs, run } = ctx;
  refs.main.innerHTML = "";
  // Each room carries its own visual identity; CSS keys off this attribute.
  refs.main.dataset.level = level.id;
  setScene(level.id);

  const view = el("section");
  view.append(
    el("p", {
      className: "view-eyebrow",
      textContent: `The Archive · Wing ${level.order} of ${ctx.content.levels.length}`,
    }),
    el("h2", { className: "view-title", textContent: level.title }),
    el("p", { textContent: level.brief }),
  );

  if (level.skillTaught?.length) {
    const skills = el("details");
    skills.append(el("summary", { textContent: "Skills in this room" }));
    const list = el("ul");
    level.skillTaught.forEach((s) => list.append(el("li", { textContent: s })));
    skills.append(list);
    view.append(skills);
  }

  const mediaItems = (level.media ?? [])
    .map((m) => renderMediaAsText(m))
    .filter(Boolean);
  if (mediaItems.length) {
    const collection = el("div", { className: "media-collection" });
    collection.append(...mediaItems);
    view.append(collection);
  }

  (level.companionLines ?? []).forEach((line) => {
    view.append(renderCompanionLine(line, ctx));
  });

  const challenges = level.challenges;
  challenges.forEach((challenge, i) => {
    view.append(
      renderChallengeCard(challenge, i + 1, challenges.length, level, ctx, view),
    );
  });

  refs.main.append(view);

  // End state: the lock is the level's exit. Challenges solved but lock shut
  // shows the lock; lock opened shows the restored card.
  if (isLevelRestored(run, level)) {
    view.append(renderRestoredCard(level, ctx));
  } else if (challengesComplete(run, level)) {
    view.append(renderLockCard(level, ctx, view));
  }

  const firstLine = level.companionLines?.[0];
  if (firstLine) setCompanionTranscript(ctx, firstLine.text);
}

function renderCompanionLine(line, ctx) {
  const card = el("aside", {
    className: "card companion-line",
    attrs: { "aria-label": `${ctx.content.narrative.companion?.name ?? "Companion"} says` },
  });
  const speaker = el("p", {
    className: "speaker",
    textContent: ctx.content.narrative.companion?.name ?? "Companion",
  });
  if (typeof line.confidence === "number") {
    speaker.append(
      el("span", {
        className: "confidence-badge",
        textContent: `Confidence: ${line.confidence.toFixed(1)}%`,
      }),
    );
  }
  card.append(speaker, el("p", { textContent: line.text }));
  return card;
}

function renderChallengeCard(challenge, num, total, level, ctx, viewEl) {
  const { run } = ctx;
  const card = el("section", { className: "card challenge-card" });
  card.append(
    el("p", {
      className: "card-eyebrow",
      textContent: `Challenge ${num} of ${total} · ${TYPE_LABELS[challenge.type] ?? challenge.type}`,
    }),
    el("h3", { textContent: challenge.prompt }),
  );

  (challenge.hints ?? []).forEach((hint, i) => {
    const d = el("details");
    d.append(
      el("summary", { textContent: `Hint ${i + 1} of ${challenge.hints.length}` }),
      el("p", { textContent: hint }),
    );
    card.append(d);
  });

  const done = (run.completed[level.id] ?? []).includes(challenge.id);
  const api = {
    announce,
    complete: () => finishChallenge(challenge, level, ctx, viewEl),
  };

  let body;
  switch (challenge.type) {
    case "choice":
      body = renderChoice(challenge, done, api);
      break;
    case "sort":
      body = renderSort(challenge, done, api);
      break;
    case "hunt":
      body = renderHunt(challenge, done, api);
      break;
    case "repair":
      body = renderRepair(challenge, done, api);
      break;
    default:
      body = renderPlaceholderBody(challenge, done, api);
  }
  card.append(body);
  return card;
}

// Sequence and response arrive in the next build; until then they keep the
// honest placeholder.
function renderPlaceholderBody(challenge, done, api) {
  const wrap = el("div");
  if (challenge.type === "sequence") {
    const list = el("ol", { className: "option-list" });
    challenge.items.forEach((it) => list.append(el("li", { textContent: it.text })));
    wrap.append(list);
  }
  wrap.append(
    el("p", {
      className: "placeholder-note",
      textContent: "This challenge becomes interactive in the next build.",
    }),
  );
  const btn = el("button", {
    textContent: done ? "Challenge complete ✓" : "Mark challenge complete",
  });
  btn.disabled = done;
  btn.addEventListener("click", () => {
    btn.disabled = true;
    btn.textContent = "Challenge complete ✓";
    api.complete();
  });
  wrap.append(el("p", {}, btn));
  return wrap;
}

function finishChallenge(challenge, level, ctx, viewEl) {
  const { run } = ctx;
  markChallengeComplete(run, level.id, challenge.id);
  if (challengesComplete(run, level)) {
    bankEvidence(run, level.id, level.evidenceFragment);
    if (level.lock) {
      viewEl.append(renderLockCard(level, ctx, viewEl));
      renderSpine(ctx);
      // Focus stays on the solved challenge so its feedback can be read;
      // the announcement carries the news that the lock has appeared below.
      announce(
        "All challenges solved. Evidence logged. A lock appears on the shelf below. Enter the vault key to restore it.",
      );
    } else {
      openLock(run, level);
      viewEl.append(renderRestoredCard(level, ctx));
      renderSpine(ctx);
      announce("Level complete. Evidence logged. Shelf restored.");
    }
  } else {
    announce(`Challenge solved. ${remainingText(run, level)}`);
  }
}

function renderLockCard(level, ctx, viewEl) {
  const { run } = ctx;
  const lock = level.lock;
  const card = el("section", { className: "card lock-card" });
  card.append(
    el("p", { className: "card-eyebrow", textContent: "The lock" }),
    el("h3", { textContent: "The shelf will not return on its own" }),
    el("p", { className: "archivist-voice", textContent: lock.prompt }),
  );

  (lock.hints ?? []).forEach((hint, i) => {
    const d = el("details");
    d.append(
      el("summary", { textContent: `Hint ${i + 1} of ${lock.hints.length}` }),
      el("p", { textContent: hint }),
    );
    card.append(d);
  });

  const inputId = `lock-${level.id}`;
  const label = el("label", {
    textContent: lock.inputLabel ?? "Vault key",
    attrs: { for: inputId },
  });
  const input = el("input", {
    id: inputId,
    className: "lock-input",
    attrs: { type: "text", autocomplete: "off", spellcheck: "false" },
  });
  const feedback = el("p", { className: "lock-feedback" });
  const turn = el("button", { textContent: "Turn the key" });

  const attempt = () => {
    const guess = input.value.trim().toLowerCase().replace(/\s+/g, " ");
    const accepted = lock.acceptedCodes.some(
      (c) => c.trim().toLowerCase().replace(/\s+/g, " ") === guess,
    );
    if (!accepted) {
      const message =
        lock.wrongText ?? "The door does not move. Nothing is lost; try again.";
      feedback.textContent = message;
      announce(message);
      input.select();
      return;
    }
    openLock(run, level);
    const restored = renderRestoredCard(level, ctx);
    card.replaceWith(restored);
    renderSpine(ctx);
    announce(
      `The key turns. ${level.rewardLabel ? level.rewardLabel + " banked to your keyring. " : ""}Shelf restored.`,
    );
    moveFocusTo(restored.querySelector("h3"));
  };

  turn.addEventListener("click", attempt);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      attempt();
    }
  });

  card.append(label, input, feedback, el("p", {}, turn));
  return card;
}

function remainingText(run, level) {
  const doneCount = (run.completed[level.id] ?? []).length;
  const left = level.challenges.length - doneCount;
  return left === 1 ? "1 challenge remains." : `${left} challenges remain.`;
}

function renderRestoredCard(level, ctx) {
  bankEvidence(ctx.run, level.id, level.evidenceFragment);
  const card = el("section", { className: "card level-complete" });
  card.append(
    el("p", { className: "status-line", textContent: "✓ Shelf restored" }),
    el("h3", { textContent: "Evidence logged" }),
    el("blockquote", {
      className: "evidence-quote",
      textContent: level.evidenceFragment,
    }),
    el("p", { textContent: level.unlockText }),
  );
  if (level.rewardLabel) {
    card.append(el("p", {}, el("span", { className: "reward-badge", textContent: level.rewardLabel })));
  }
  const next = el("button", { textContent: "Continue" });
  next.addEventListener("click", () => ctx.actions.advance());
  card.append(el("p", {}, next));
  return card;
}

/* ---------- Interlude ---------- */

export function renderInterlude(level, ctx, onContinue) {
  const { refs } = ctx;
  const interlude = level.interlude;
  refs.main.innerHTML = "";
  delete refs.main.dataset.level;
  setScene("corridor");

  const view = el("section", { className: "interlude" });
  view.append(
    el("p", { className: "view-eyebrow", textContent: "The Archive · The Corridor" }),
    el("h2", { className: "view-title", textContent: "The archive responds" }),
  );

  if (interlude.shelfEvent) {
    view.append(
      el("p", { className: "status-line", textContent: `✓ ${interlude.shelfEvent}` }),
    );
  }

  const text = el("p", { textContent: interlude.text });
  if (interlude.speaker === "archivist") text.className = "archivist-voice";
  view.append(text);

  if (interlude.auraLine) {
    const aside = el("aside", {
      className: "card companion-line",
      attrs: {
        "aria-label": `${ctx.content.narrative.companion?.name ?? "Companion"} says`,
      },
    });
    aside.append(
      el("p", {
        className: "speaker",
        textContent: ctx.content.narrative.companion?.name ?? "Companion",
      }),
      el("p", { textContent: interlude.auraLine }),
    );
    view.append(aside);
    setCompanionTranscript(ctx, interlude.auraLine);
  }

  const cont = el("button", { textContent: "Continue" });
  cont.addEventListener("click", onContinue);
  view.append(el("p", {}, cont));

  refs.main.append(view);
}

/* ---------- Finale ---------- */

export function renderFinale(ctx) {
  const { content, refs, run } = ctx;
  const finale = content.finale;
  refs.main.innerHTML = "";
  delete refs.main.dataset.level;
  setScene("vault");

  const view = el("section");
  view.append(
    el("p", { className: "view-eyebrow", textContent: "The Archive · The Last Door" }),
    el("h2", { className: "view-title", textContent: finale.title }),
  );

  // The meta-lock gates the question. Five keys, five keyways, then it asks.
  if (finale.metaLock && !run.vaultOpened) {
    view.append(renderMetaLock(finale.metaLock, ctx));
    refs.main.append(view);
    return;
  }

  if (finale.setup) view.append(el("p", { textContent: finale.setup }));

  if (finale.replayEvidence !== false && run.evidence.length) {
    const replay = el("section", { className: "card" });
    replay.append(el("h3", { textContent: "The evidence you carry" }));
    const list = el("ol");
    run.evidence.forEach((e) =>
      list.append(el("li", {}, el("p", { className: "evidence-quote", textContent: e.fragment }))),
    );
    replay.append(list);
    view.append(replay);
  }

  if (finale.companionAssessment) {
    view.append(renderCompanionLine(finale.companionAssessment, ctx));
    setCompanionTranscript(ctx, finale.companionAssessment.text);
  }

  const form = el("section", { className: "card" });
  const promptId = "finale-response";
  form.append(
    el("h3", { textContent: "Your recommendation" }),
    el("p", { textContent: finale.prompt }),
    el("label", { textContent: "Write your recommendation", attrs: { for: promptId } }),
  );
  const textarea = el("textarea", { id: promptId });
  const submit = el("button", { textContent: "Submit recommendation" });
  form.append(textarea, el("p", {}, submit));
  view.append(form);

  const revealWrap = el("div");
  view.append(revealWrap);

  submit.addEventListener("click", () => {
    if (run.finaleSubmitted) return;
    run.finaleSubmitted = true;
    textarea.readOnly = true;
    submit.disabled = true;
    revealWrap.append(renderFinaleReveal(finale));
    announce("Recommendation submitted. The vault responds.");
    moveFocusTo(revealWrap.querySelector("h3"));
  });

  if (run.finaleSubmitted) {
    textarea.readOnly = true;
    submit.disabled = true;
    revealWrap.append(renderFinaleReveal(finale));
  }

  refs.main.append(view);
}

function renderMetaLock(metaLock, ctx) {
  const { run } = ctx;
  const card = el("section", { className: "card lock-card" });
  card.append(
    el("p", { className: "card-eyebrow", textContent: "The last door" }),
    el("h3", { textContent: "Five keyways" }),
    el("p", { className: "archivist-voice", textContent: metaLock.prompt }),
  );

  (metaLock.hints ?? []).forEach((hint, i) => {
    const d = el("details");
    d.append(
      el("summary", { textContent: `Hint ${i + 1} of ${metaLock.hints.length}` }),
      el("p", { textContent: hint }),
    );
    card.append(d);
  });

  const selects = [];
  metaLock.slots.forEach((slot, i) => {
    const selectId = `keyway-${i}`;
    const wrap = el("p");
    wrap.append(
      el("label", { textContent: `Keyway: ${slot.label}`, attrs: { for: selectId } }),
    );
    const select = el("select", { id: selectId, className: "lock-input" });
    select.append(el("option", { value: "", textContent: "Choose a key" }));
    run.keys.forEach((key) => {
      select.append(el("option", { value: key.label, textContent: key.label }));
    });
    selects.push({ select, slot });
    wrap.append(select);
    card.append(wrap);
  });

  const feedback = el("p", { className: "lock-feedback" });
  const open = el("button", { textContent: "Open the vault" });
  open.addEventListener("click", () => {
    const allPlaced = selects.every(({ select }) => select.value !== "");
    if (!allPlaced) {
      const message = "Every keyway needs a key before the door will move.";
      feedback.textContent = message;
      announce(message);
      return;
    }
    const correct = selects.every(
      ({ select, slot }) => select.value === slot.keyLabel,
    );
    if (!correct) {
      const message =
        metaLock.wrongText ?? "One or more keys sit in the wrong door.";
      feedback.textContent = message;
      announce(message);
      return;
    }
    ctx.run.vaultOpened = true;
    announce("Every key turns at once. The final door opens.");
    renderFinale(ctx);
    renderSpine(ctx);
    moveFocusTo(ctx.refs.main.querySelector("h2"));
  });

  card.append(feedback, el("p", {}, open));
  return card;
}

function renderFinaleReveal(finale) {
  const wrap = el("div");

  if (finale.acceptedPositions?.length) {
    const positions = el("section", { className: "card" });
    positions.append(
      el("h3", { textContent: "Four defensible positions" }),
      el("p", {
        textContent:
          "There is no single correct answer. Compare your recommendation against these.",
      }),
    );
    finale.acceptedPositions.forEach((p) => {
      const d = el("details");
      d.append(
        el("summary", { textContent: p.label }),
        el("p", { textContent: p.summary }),
      );
      positions.append(d);
    });
    wrap.append(positions);
  }

  const closing = el("section", { className: "card level-complete" });
  closing.append(
    el("p", { className: "status-line", textContent: "✓ The vault opens" }),
    el("p", { textContent: finale.closingText }),
  );
  if (finale.closingMedia) {
    closing.append(renderVideoAsText(finale.closingMedia, "Closing transmission"));
  }
  wrap.append(closing);
  return wrap;
}

/* ---------- Progress spine ---------- */

export function renderProgressSpine(ctx) {
  renderSpine(ctx);
}

function renderSpine(ctx) {
  const { content, run, refs } = ctx;
  const { done, total } = getProgress(run, content);
  const maxOrder = maxUnlockedOrder(run, content);
  refs.spineSummary.textContent = `Shelves restored: ${done} of ${total}`;
  refs.spineList.innerHTML = "";
  [...content.levels]
    .sort((a, b) => a.order - b.order)
    .forEach((level) => {
      const restored = isLevelRestored(run, level);
      const reachable = level.order <= maxOrder;
      const item = el("li", {
        className: `spine-item${restored ? " is-restored" : ""}`,
      });
      if (run.view === "level" && run.currentLevelOrder === level.order) {
        item.setAttribute("aria-current", "step");
      }
      item.append(
        el("span", {
          className: "spine-marker",
          textContent: restored ? "✓" : "○",
          attrs: { "aria-hidden": "true" },
        }),
      );
      const text = `${level.title} (${restored ? "restored" : "sealed"})`;
      if (reachable) {
        const link = el("button", {
          className: "spine-link",
          textContent: text,
        });
        link.addEventListener("click", () => ctx.actions.goTo(level.order));
        item.append(link);
      } else {
        item.append(el("span", { textContent: text }));
      }
      refs.spineList.append(item);
    });

  // Keyring. Alphabetical, never earn order: earn order next to the spine's
  // room order would hand the meta-lock's answer to anyone who can read the
  // rail. At the sealed vault the list disappears entirely for the same
  // reason; the puzzle is remembering which discipline belonged to which room.
  refs.keysSummary.textContent = `Keys banked: ${run.keys.length} of ${total}`;
  refs.keysList.innerHTML = "";
  const atSealedVault =
    run.view === "finale" && content.finale.metaLock && !run.vaultOpened;
  if (atSealedVault) {
    refs.keysList.append(
      el("li", {
        className: "spine-item",
        textContent: `${run.keys.length} keys, in hand. They belong to the door now.`,
      }),
    );
    return;
  }
  if (run.keys.length === 0) {
    refs.keysList.append(
      el("li", { className: "spine-item", textContent: "No keys yet." }),
    );
  }
  [...run.keys]
    .sort((a, b) => a.label.localeCompare(b.label))
    .forEach((key) => {
      const item = el("li", { className: "spine-item is-restored" });
      item.append(
        el("span", {
          className: "spine-marker",
          textContent: "⚿",
          attrs: { "aria-hidden": "true" },
        }),
        el("span", { textContent: key.label }),
      );
      refs.keysList.append(item);
    });
}

/* ---------- Shared helpers ---------- */

function renderMediaAsText(media) {
  // A decorative image is skipped entirely, exactly as a screen reader would.
  if (media.kind === "image") {
    if (media.decorative) return null;
    const item = el("figure", { className: "media-item card" });
    item.append(
      el("p", { className: "media-kind", textContent: "Image" }),
      el("p", { textContent: media.alt }),
    );
    if (media.longDescription) {
      const d = el("details");
      d.append(
        el("summary", { textContent: "Long description" }),
        el("p", { textContent: media.longDescription }),
      );
      item.append(d);
    }
    return item;
  }
  if (media.kind === "video") {
    return renderVideoAsText(media, "Video");
  }
  return null;
}

function renderVideoAsText(video, label) {
  const d = el("details", { className: "media-item" });
  d.append(el("summary", { textContent: `${label} (transcript)` }));
  d.append(el("p", { textContent: video.transcript }));
  if (video.describedTranscript) {
    const dd = el("details");
    dd.append(
      el("summary", { textContent: "Described version" }),
      el("p", { textContent: video.describedTranscript }),
    );
    d.append(dd);
  }
  return d;
}

function setCompanionTranscript(ctx, text) {
  if (ctx.refs.companionTranscript) {
    ctx.refs.companionTranscript.textContent = text;
  }
}

// The environment layer. CSS paints the room's backdrop (with a contrast
// scrim) off this attribute, so the screen looks like the place the player
// is standing: the hall, each wing, the corridor between them, the door.
function setScene(scene) {
  document.body.dataset.scene = scene;
}

