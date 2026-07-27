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
  isLevelReachable,
  saveRun,
} from "../state.js";
import { announce, moveFocusTo, prefersReducedMotion } from "../a11y.js";
import { el } from "./dom.js";
import { renderContrastChecker } from "./tool.contrast.js";
import { voiceControl } from "./voice.js";
import { renderChoice } from "./challenge.choice.js";
import { renderSort } from "./challenge.sort.js";
import { renderHunt } from "./challenge.hunt.js";
import { renderRepair } from "./challenge.repair.js";
import { renderSequence } from "./challenge.sequence.js";
import { renderResponse, renderTellCard } from "./challenge.response.js";
import { renderMatch } from "./challenge.match.js";
import { renderCalculate } from "./challenge.calculate.js";
import { renderExtract } from "./challenge.extract.js";

const TYPE_LABELS = {
  choice: "Selection challenge",
  sequence: "Ordering challenge",
  response: "Written response",
  sort: "Sorting challenge",
  hunt: "Inspection challenge",
  repair: "Repair challenge",
  match: "Matching challenge",
  calculate: "Calculation challenge",
  extract: "Extraction challenge",
};

export function mountShell(rootEl, content) {
  rootEl.innerHTML = "";

  const header = el("header", { className: "vault-header" });
  const headerText = el("div");
  headerText.append(
    el("h1", { className: "vault-title", textContent: content.meta.title }),
  );
  if (content.meta.subtitle) {
    headerText.append(
      el("p", { className: "vault-subtitle", textContent: content.meta.subtitle }),
    );
  }
  const homeBtn = el("button", {
    className: "secondary home-btn",
    attrs: { "aria-label": "Return to the Main Hall", title: "Main Hall" },
  });
  // Icon-only home control; the accessible name carries the meaning.
  homeBtn.innerHTML =
    '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M10 21v-6h4v6"/></svg>';
  header.append(headerText, homeBtn);

  const main = el("main", {
    id: "vault-main",
    className: "vault-main",
  });

  const rail = el("aside", {
    className: "vault-rail",
    attrs: { "aria-label": "Companion and vault status" },
  });

  // The companion panel is presence only: portrait and name. Every line
  // AURA speaks renders in the room beside the work it refers to, so
  // mirroring the text here would just say everything twice.
  const companion = content.narrative.companion;
  if (companion) {
    const panel = el("section", { className: "panel companion-panel" });
    panel.append(
      el("h2", { className: "panel-label", textContent: "Companion" }),
      el("p", { className: "companion-name", textContent: companion.name }),
    );
    if (companion.idleVideoSrc && !prefersReducedMotion()) {
      // The living presence: silent, looping, decorative motion. The
      // portrait's alt text stays as the accessible name; reduced motion
      // gets the still image below instead.
      const idle = el("video", {
        className: "companion-portrait",
        muted: true,
        loop: true,
        autoplay: true,
        attrs: { playsinline: "", "aria-label": companion.portrait?.alt ?? companion.name, role: "img" },
      });
      idle.append(el("source", { src: companion.idleVideoSrc }));
      if (companion.portrait) idle.poster = companion.portrait.src;
      panel.append(idle);
    } else if (companion.portrait) {
      panel.append(
        el("img", {
          className: "companion-portrait",
          src: companion.portrait.src,
          alt: companion.portrait.decorative ? "" : companion.portrait.alt,
          attrs: companion.portrait.decorative
            ? { "aria-hidden": "true", decoding: "async" }
            : { decoding: "async" },
        }),
      );
    }
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
  return { main, spineSummary, spineList, keysSummary, keysList, homeBtn };
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
    view.append(renderVideo(n.openingMedia, "Opening transmission"));
  }

  if (content.meta.objective) {
    const obj = el("details");
    obj.append(
      el("summary", { textContent: "Learning objective" }),
      el("p", { textContent: content.meta.objective }),
    );
    view.append(obj);
  }

  const buttons = el("p", { className: "button-row" });
  if (ctx.hasSavedRun) {
    const cont = el("button", { textContent: "Continue your run" });
    cont.addEventListener("click", () => ctx.actions.continueRun());
    const restart = el("button", {
      className: "secondary",
      textContent: "Start over",
    });
    // Two-step, same as the room restart: erasing a whole run should never
    // be one stray click.
    restart.addEventListener("click", () => {
      buttons.innerHTML = "";
      const question = el("span", {
        className: "restart-question",
        textContent: "Erase this run and start fresh? ",
      });
      const yes = el("button", { textContent: "Yes, start over" });
      const no = el("button", { className: "secondary", textContent: "Keep my run" });
      yes.addEventListener("click", () => ctx.actions.startOver());
      no.addEventListener("click", () => {
        buttons.innerHTML = "";
        buttons.append(cont, restart);
        restart.focus();
      });
      buttons.append(question, yes, no);
      announce("Erase this run and start fresh? Choose yes or keep my run.");
      yes.focus();
    });
    buttons.append(cont, restart);
  } else {
    const begin = el("button", { textContent: "Enter the vault" });
    begin.addEventListener("click", () => ctx.actions.begin());
    buttons.append(begin);
  }
  view.append(buttons);

  refs.main.append(view);
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

  if (level.ambientAudio) {
    view.append(renderAmbientAudio(level.ambientAudio));
  }

  const mediaItems = (level.media ?? [])
    .map((m) => renderMediaAsText(m))
    .filter(Boolean);
  if (mediaItems.length) {
    const collection = el("div", { className: "media-collection" });
    collection.append(...mediaItems);
    view.append(collection);
  }

  // A room with a field tool splits below the media: the tool rides in a
  // sticky left column so it stays in reach while the player works through
  // the challenges beside it. `flow` is wherever room content lands.
  let flow = view;
  if (level.tools?.includes("contrast-checker")) {
    const split = el("div", { className: "level-tool-layout" });
    const toolCol = el("div", { className: "tool-col" });
    toolCol.append(renderContrastChecker());
    flow = el("div", { className: "level-work-flow" });
    split.append(toolCol, flow);
    view.append(split);
  }

  (level.companionLines ?? []).forEach((line) => {
    flow.append(renderCompanionLine(line, ctx));
  });

  const challenges = level.challenges;
  challenges.forEach((challenge, i) => {
    flow.append(
      renderChallengeCard(challenge, i + 1, challenges.length, level, ctx, flow),
    );
  });

  // End state: the lock is the level's exit. Challenges solved but lock shut
  // shows the lock; lock opened shows the restored card.
  if (isLevelRestored(run, level)) {
    flow.append(renderRestoredCard(level, ctx));
  } else if (challengesComplete(run, level)) {
    flow.append(renderLockCard(level, ctx, flow));
  }

  // Room controls close the page; a lock that appears mid-run slots in above.
  flow.append(renderRestartControl(level, ctx));

  refs.main.append(view);
}

// A small, deliberate reset for one room. Two-step: the first press asks,
// so a stray click never wipes progress.
function renderRestartControl(level, ctx) {
  const wrap = el("p", { className: "room-controls" });
  const restart = el("button", {
    className: "secondary",
    textContent: "Start this room over",
  });
  restart.addEventListener("click", () => {
    wrap.innerHTML = "";
    const question = el("span", {
      className: "restart-question",
      textContent: "Restart this room and clear its progress? ",
    });
    const yes = el("button", { textContent: "Yes, start over" });
    const no = el("button", { className: "secondary", textContent: "Keep going" });
    yes.addEventListener("click", () => ctx.actions.restartLevel(level));
    no.addEventListener("click", () => {
      wrap.innerHTML = "";
      wrap.append(restart);
      restart.focus();
    });
    wrap.append(question, yes, no);
    announce("Restart this room and clear its progress? Choose yes or keep going.");
    yes.focus();
  });
  wrap.append(restart);
  return wrap;
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
  if (line.audioSrc) {
    card.append(voiceControl(line.audioSrc, ctx.content.narrative.companion?.name ?? "the companion").node);
  }
  return card;
}

// Hints live in a rail beside the work instead of a stack above it, so the
// challenge starts at the top of the card and wide screens carry no dead run
// of collapsed accordions.
function renderHintRail(hints) {
  if (!hints?.length) return null;
  const rail = el("div", { className: "hint-rail" });
  hints.forEach((hint, i) => {
    const d = el("details");
    d.append(
      el("summary", { textContent: `Hint ${i + 1} of ${hints.length}` }),
      el("p", { textContent: hint }),
    );
    rail.append(d);
  });
  return rail;
}

function renderChallengeCard(challenge, num, total, level, ctx, viewEl) {
  const { run } = ctx;
  const card = el("section", { className: "card challenge-card" });
  card.append(
    el("p", {
      className: "card-eyebrow",
      textContent: `Challenge ${num} of ${total} · ${TYPE_LABELS[challenge.type] ?? challenge.type}`,
    }),
  );
  const workCol = el("div", { className: "challenge-work" });
  workCol.append(el("h3", { textContent: challenge.prompt }));

  const done = (run.completed[level.id] ?? []).includes(challenge.id);
  const api = {
    announce,
    complete: () => finishChallenge(challenge, level, ctx, viewEl),
    companionName: ctx.content.narrative.companion?.name ?? "Companion",
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
    case "sequence":
      body = renderSequence(challenge, done, api);
      break;
    case "response":
      body = renderResponse(challenge, done, api);
      break;
    case "match":
      body = renderMatch(challenge, done, api);
      break;
    case "calculate":
      body = renderCalculate(challenge, done, api);
      break;
    case "extract":
      body = renderExtract(challenge, done, api);
      break;
    default:
      body = renderPlaceholderBody(challenge, done, api);
  }
  workCol.append(body);
  card.append(workCol);
  const hintRail = renderHintRail(challenge.hints);
  if (hintRail) card.append(hintRail);
  return card;
}

// Safety net for any future challenge type the renderer does not know yet.
function renderPlaceholderBody(challenge, done, api) {
  const wrap = el("div");
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
      const controls = viewEl.querySelector(".room-controls");
      const lockCard = renderLockCard(level, ctx, viewEl);
      if (controls) viewEl.insertBefore(lockCard, controls);
      else viewEl.append(lockCard);
      renderSpine(ctx);
      // Focus stays on the solved challenge so its feedback can be read;
      // the announcement carries the news that the lock has appeared below.
      announce(
        "All challenges solved. Evidence logged. A lock appears on the shelf below. Enter the vault key to restore it.",
      );
    } else {
      openLock(run, level);
      const controls = viewEl.querySelector(".room-controls");
      const restored = renderRestoredCard(level, ctx);
      if (controls) viewEl.insertBefore(restored, controls);
      else viewEl.append(restored);
      renderSpine(ctx);
      announce("Level complete. Evidence logged. Shelf restored.");
    }
  } else {
    announce(`Challenge solved. ${remainingText(run, level)}`);
  }
  saveRun(run, ctx.content.meta.id);
}

function renderLockCard(level, ctx, viewEl) {
  const { run } = ctx;
  const lock = level.lock;
  const card = el("section", { className: "card lock-card" });
  card.append(
    el("p", { className: "card-eyebrow", textContent: "The lock" }),
  );
  const workCol = el("div", { className: "challenge-work" });
  workCol.append(el("h3", { textContent: "The shelf will not return on its own" }));

  // The Archivist speaks at every door. The portrait gives the voice a face;
  // the spoken line (produced in the media session) plays when the lock
  // appears, always duplicated by the on-screen text below.
  const archivist = ctx.content.narrative.archivist;
  if (archivist) {
    const speakerRow = el("div", { className: "archivist-row" });
    if (archivist.portrait) {
      speakerRow.append(
        el("img", {
          className: "archivist-portrait",
          src: archivist.portrait.src,
          alt: archivist.portrait.decorative ? "" : archivist.portrait.alt,
          attrs: archivist.portrait.decorative
            ? { "aria-hidden": "true", decoding: "async" }
            : { decoding: "async" },
        }),
      );
    }
    speakerRow.append(
      el("p", { className: "archivist-name", textContent: archivist.name }),
    );
    workCol.append(speakerRow);
  }
  workCol.append(el("p", { className: "archivist-voice", textContent: lock.prompt }));

  if (lock.source) {
    workCol.append(
      el("blockquote", { className: "lock-source prewrap", textContent: lock.source }),
    );
  }

  if (lock.audioSrc) {
    const voice = voiceControl(lock.audioSrc, archivist?.name ?? "the Archivist");
    workCol.append(voice.node);
    // The lock only ever appears as the direct result of the player's last
    // solve, so speaking the line now is that gesture completing, not
    // autoplay; the full text is on screen above and Stop is one press away.
    voice.play();
  }

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
    saveRun(run, ctx.content.meta.id);
    announce(
      `The key turns. ${level.rewardLabel ? level.rewardLabel + " banked to your keyring. " : ""}Shelf restored.`,
    );
    const finish = () => {
      const restored = renderRestoredCard(level, ctx);
      card.replaceWith(restored);
      renderSpine(ctx);
      moveFocusTo(restored.querySelector("h3"));
    };
    // The reward beat: the key turns in the lock before the shelf returns.
    // Reduced motion skips straight to the restored card.
    if (prefersReducedMotion()) {
      finish();
      return;
    }
    turn.disabled = true;
    input.disabled = true;
    const keyFx = el("div", { className: "key-turn", attrs: { "aria-hidden": "true" } });
    keyFx.innerHTML =
      '<svg viewBox="0 0 64 64" width="72" height="72" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="22" cy="32" r="10"/><path d="M32 32h24"/><path d="M48 32v8"/><path d="M56 32v6"/></svg>';
    card.append(keyFx);
    setTimeout(finish, 1500);
  };

  turn.addEventListener("click", attempt);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      attempt();
    }
  });

  workCol.append(label, input, feedback, el("p", {}, turn));
  card.append(workCol);
  const hintRail = renderHintRail(lock.hints);
  if (hintRail) card.append(hintRail);
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
  }

  const cont = el("button", { textContent: "Continue" });
  cont.addEventListener("click", onContinue);
  view.append(el("p", {}, cont));

  refs.main.append(view);
}

/* ---------- Finale ---------- */

export function renderFinale(ctx, opts = {}) {
  const { content, refs, run } = ctx;
  const finale = content.finale;
  refs.main.innerHTML = "";
  delete refs.main.dataset.level;
  setScene("vault");

  const view = el("section");
  // The one moment that gets a longer entrance: the last door opening.
  if (opts.vaultJustOpened) view.classList.add("vault-opening");
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
  }

  // The recommendation is a stand, not an essay. Four defensible stances and
  // AURA's own answer share one shuffled list; the player chooses the one
  // they would defend on Monday. Taking AURA's costs nothing but a retry:
  // the Archivist hands it back with AURA's record attached.
  const companionName = ctx.content.narrative.companion?.name ?? "Companion";
  const form = el("section", { className: "card" });
  form.append(
    el("h3", { textContent: "Your recommendation" }),
    el("p", { textContent: finale.prompt }),
  );

  const stances = (finale.acceptedPositions ?? []).map((p) => ({
    label: p.label,
    summary: p.summary,
    trap: false,
  }));
  if (finale.companionAssessment) {
    stances.push({
      label: `${companionName}'s recommendation: yes, trust it`,
      summary: finale.companionAssessment.text,
      trap: true,
    });
  }
  for (let i = stances.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [stances[i], stances[j]] = [stances[j], stances[i]];
  }

  const groupName = "finale-stance";
  const stanceList = el("div", {
    className: "stance-list",
    attrs: { role: "radiogroup", "aria-label": "Choose your recommendation" },
  });
  const inputs = [];
  stances.forEach((stance, i) => {
    const id = `stance-${i}`;
    const row = el("div", { className: "stance-row" });
    const input = el("input", {
      id,
      attrs: { type: "radio", name: groupName, value: stance.label },
    });
    const label = el("label", { attrs: { for: id } });
    label.append(
      el("strong", { textContent: stance.label }),
      el("span", { className: "stance-summary", textContent: ` ${stance.summary}` }),
    );
    inputs.push({ input, stance });
    row.append(input, label);
    stanceList.append(row);
  });
  const feedback = el("p", { className: "lock-feedback" });
  const submit = el("button", { textContent: "Stand behind this recommendation" });
  form.append(stanceList, feedback, el("p", {}, submit));
  view.append(form);

  const revealWrap = el("div");
  view.append(revealWrap);

  const finish = (chosenLabel) => {
    run.finaleSubmitted = true;
    run.finaleChoice = chosenLabel;
    saveRun(run, ctx.content.meta.id);
    inputs.forEach(({ input }) => (input.disabled = true));
    submit.disabled = true;
    revealWrap.append(renderFinaleReveal(finale, ctx, chosenLabel));
    announce("Recommendation made. The vault responds.");
    moveFocusTo(revealWrap.querySelector("h3"));
  };

  submit.addEventListener("click", () => {
    if (run.finaleSubmitted) return;
    const chosen = inputs.find(({ input }) => input.checked);
    if (!chosen) {
      const message = "Choose the recommendation you will stand behind.";
      feedback.textContent = message;
      announce(message);
      return;
    }
    if (chosen.stance.trap) {
      const message = `The Archivist does not take it. 'That is ${companionName}'s answer. It has been wrong in front of you five times tonight, and it will not be the one standing in front of your colleagues on Monday. I asked for yours.' Nothing is lost. Choose again.`;
      feedback.textContent = message;
      announce(message);
      return;
    }
    feedback.textContent = "";
    finish(chosen.stance.label);
  });

  if (run.finaleSubmitted) {
    inputs.forEach(({ input }) => {
      input.disabled = true;
      if (input.value === run.finaleChoice) input.checked = true;
    });
    submit.disabled = true;
    revealWrap.append(renderFinaleReveal(finale, ctx, run.finaleChoice));
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
    // Each keyway shuffles its own option order. Keys were earned in room
    // order, and offering them that way would answer the puzzle by position.
    const shuffled = [...run.keys];
    for (let j = shuffled.length - 1; j > 0; j--) {
      const k = Math.floor(Math.random() * (j + 1));
      [shuffled[j], shuffled[k]] = [shuffled[k], shuffled[j]];
    }
    shuffled.forEach((key) => {
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
    saveRun(ctx.run, ctx.content.meta.id);
    announce("Every key turns at once. The final door opens.");
    renderFinale(ctx, { vaultJustOpened: true });
    renderSpine(ctx);
    moveFocusTo(ctx.refs.main.querySelector("h2"));
  });

  card.append(feedback, el("p", {}, open));
  return card;
}

function renderFinaleReveal(finale, ctx, chosenLabel) {
  const wrap = el("div");
  const companionName = ctx.content.narrative.companion?.name ?? "Companion";

  if (chosenLabel) {
    const chosen = el("section", { className: "card" });
    chosen.append(
      el("h3", { textContent: "The Archivist accepts it" }),
      el("p", {
        className: "archivist-voice",
        textContent: `'${chosenLabel}.' The Archivist repeats it once, the way you file something you intend to keep. 'Defensible. Argued from what you saw, not from what you were told. That is the whole discipline.'`,
      }),
    );
    wrap.append(chosen);
  }

  if (finale.rubric?.length) {
    const rubricCard = el("section", { className: "card" });
    rubricCard.append(el("h3", { textContent: "What a strong recommendation accounts for" }));
    const list = el("ul", { className: "rubric-list" });
    finale.rubric.forEach((r) => {
      const item = el("li", { className: "rubric-item" });
      item.append(el("p", {}, el("strong", { textContent: r.criterion })));
      item.append(el("p", { className: "rubric-note", textContent: `Look for: ${r.lookFor}` }));
      if (r.commonMiss) {
        item.append(el("p", { className: "rubric-note", textContent: `Common miss: ${r.commonMiss}` }));
      }
      list.append(item);
    });
    rubricCard.append(list);
    wrap.append(rubricCard);
  }

  const assessment = finale.companionAssessment;
  if (assessment && assessment.accurate === false && assessment.tell) {
    wrap.append(renderTellCard(assessment.tell, companionName));
  }

  if (finale.acceptedPositions?.length) {
    const positions = el("section", { className: "card" });
    positions.append(
      el("h3", { textContent: "The defensible positions" }),
      el("p", {
        textContent:
          "There was no correct answer. There were answers you could defend, and one you could not.",
      }),
    );
    finale.acceptedPositions.forEach((p) => {
      const d = el("details");
      const isChosen = chosenLabel && p.label === chosenLabel;
      d.append(
        el("summary", { textContent: isChosen ? `${p.label} — your stand ✓` : p.label }),
        el("p", { textContent: p.summary }),
      );
      if (isChosen) d.open = true;
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
    closing.append(renderVideo(finale.closingMedia, "Closing transmission"));
  }
  if (finale.epilogue) {
    const enter = el("button", { textContent: "Step into the vault" });
    enter.addEventListener("click", () => renderEpilogue(ctx));
    closing.append(el("p", {}, enter));
  } else {
    const again = el("button", { textContent: "Play again" });
    again.addEventListener("click", () => ctx.actions.playAgain());
    closing.append(el("p", {}, again));
  }
  wrap.append(closing);
  return wrap;
}

/* ---------- Epilogue: inside the opened vault ---------- */

// The teleport. The door has opened on screen; this scene is the other side
// of it: the lit archive, the last exchange, and AURA's one uncertain
// moment. Not persisted as its own view on purpose — a reload lands back on
// the finale reveal, where Step into the vault waits again.
function renderEpilogue(ctx) {
  const { refs, content } = ctx;
  const ep = content.finale.epilogue;
  refs.main.innerHTML = "";
  delete refs.main.dataset.level;
  setScene("vault-open");

  const view = el("section", { className: "vault-opening" });
  view.append(
    el("p", { className: "view-eyebrow", textContent: "The Archive · Inside the Vault" }),
    el("h2", { className: "view-title", textContent: ep.title }),
  );

  const archivistName = content.narrative.archivist?.name ?? "The Archivist";
  const companionName = content.narrative.companion?.name ?? "Companion";
  ep.beats.forEach((beat) => {
    if (beat.speaker === "archivist") {
      const card = el("section", { className: "card" });
      card.append(
        el("p", { className: "archivist-name", textContent: archivistName }),
        el("p", { className: "archivist-voice", textContent: beat.text }),
      );
      if (beat.audioSrc) card.append(voiceControl(beat.audioSrc, archivistName).node);
      view.append(card);
    } else if (beat.speaker === "aura") {
      // Her uncertain moment: no confidence badge, cyan fallen toward navy,
      // and the flicker (motion-gated). Protect it.
      const card = el("aside", {
        className: "card companion-line aura-uncertain aura-flicker",
        attrs: { "aria-label": `${companionName} says` },
      });
      card.append(
        el("p", { className: "speaker", textContent: companionName }),
        el("p", { textContent: beat.text }),
      );
      if (beat.audioSrc) card.append(voiceControl(beat.audioSrc, companionName).node);
      view.append(card);
    } else {
      view.append(el("p", { textContent: beat.text }));
    }
  });

  const buttons = el("p", { className: "button-row" });
  const again = el("button", { textContent: "Play again" });
  again.addEventListener("click", () => ctx.actions.playAgain());
  const hall = el("button", { className: "secondary", textContent: "Return to the Main Hall" });
  hall.addEventListener("click", () => ctx.actions.goHome());
  buttons.append(again, hall);
  view.append(buttons);

  refs.main.append(view);
  announce("The vault is open. You step inside.");
  moveFocusTo(view.querySelector("h2"));
}

/* ---------- Progress spine ---------- */

export function renderProgressSpine(ctx) {
  renderSpine(ctx);
}

function renderSpine(ctx) {
  const { content, run, refs } = ctx;
  const { done, total } = getProgress(run, content);
  refs.spineSummary.textContent = `Shelves restored: ${done} of ${total}`;
  refs.spineList.innerHTML = "";
  // The spine re-renders wholesale, so enter/pulse animations must attach
  // only to what changed since the last render, or every state change would
  // replay them all.
  const prevRestored = ctx._spineRestored ?? new Set();
  const nextRestored = new Set();
  [...content.levels]
    .sort((a, b) => a.order - b.order)
    .forEach((level) => {
      const restored = isLevelRestored(run, level);
      const reachable = isLevelReachable(run, content, level);
      if (restored) nextRestored.add(level.id);
      const item = el("li", {
        className: `spine-item${restored ? " is-restored" : ""}`,
      });
      if (run.view === "level" && run.currentLevelOrder === level.order) {
        item.setAttribute("aria-current", "step");
      }
      const justRestored = restored && !prevRestored.has(level.id);
      item.append(
        el("span", {
          className: `spine-marker${justRestored ? " marker-pulse" : ""}`,
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
  ctx._spineRestored = nextRestored;

  // Keyring. Alphabetical, never earn order: earn order next to the spine's
  // room order would hand the meta-lock's answer to anyone who can read the
  // rail. At the sealed vault the list disappears entirely for the same
  // reason; the puzzle is remembering which discipline belonged to which room.
  refs.keysSummary.textContent = `Keys banked: ${run.keys.length} of ${total}`;
  refs.keysList.innerHTML = "";
  const prevKeys = ctx._spineKeys ?? new Set();
  const atSealedVault =
    run.view === "finale" && content.finale.metaLock && !run.vaultOpened;
  if (atSealedVault) {
    ctx._spineKeys = new Set();
    refs.keysList.append(
      el("li", {
        className: "spine-item",
        textContent: `${run.keys.length} keys, in hand. They belong to the door now.`,
      }),
    );
    return;
  }
  ctx._spineKeys = new Set(run.keys.map((k) => k.label));
  if (run.keys.length === 0) {
    refs.keysList.append(
      el("li", { className: "spine-item", textContent: "No keys yet." }),
    );
  }
  [...run.keys]
    .sort((a, b) => a.label.localeCompare(b.label))
    .forEach((key) => {
      const isNew = !prevKeys.has(key.label);
      const item = el("li", {
        className: `spine-item is-restored${isNew ? " key-enter" : ""}`,
      });
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
  if (media.kind === "image") {
    // Decorative images render, but with empty alt and aria-hidden, so a
    // screen reader passes over them in silence. That is the lesson the
    // player is being taught, enforced in the renderer itself.
    if (media.decorative) {
      const fig = el("div", { className: "media-item media-decorative" });
      fig.append(
        el("img", {
          className: "media-image",
          src: media.src,
          alt: "",
          attrs: { "aria-hidden": "true", decoding: "async" },
        }),
      );
      return fig;
    }
    const item = el("figure", { className: "media-item card" });
    item.append(
      el("img", {
        className: "media-image",
        src: media.src,
        alt: media.alt,
        // No lazy loading: the whole image set is small enough that deferring
        // it buys nothing, and eager loading avoids blank frames on a page
        // that is not currently compositing.
        attrs: { decoding: "async" },
      }),
    );
    const caption = el("figcaption");
    caption.append(
      el("p", { className: "media-kind", textContent: "Image" }),
      el("p", { className: "media-alt", textContent: `Alt text: ${media.alt}` }),
    );
    if (media.longDescription) {
      const d = el("details");
      d.append(
        el("summary", { textContent: "Long description" }),
        el("p", { textContent: media.longDescription }),
      );
      caption.append(d);
    }
    item.append(caption);
    return item;
  }
  if (media.kind === "video") {
    return renderVideo(media, "Video");
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

// The real player: captions track always attached (the schema guarantees the
// file is authored), transcript and described transcript as disclosures
// below, nothing autoplays. If the media file is missing — assets land
// across sessions — the whole figure degrades to the text rendering above,
// so the game never shows a dead player.
function renderVideo(video, label) {
  const fig = el("figure", { className: "media-item card video-item" });
  fig.append(el("p", { className: "media-kind", textContent: label }));

  const player = el("video", {
    className: "video-player",
    controls: true,
    preload: "metadata",
    attrs: { playsinline: "" },
  });
  if (video.poster) player.poster = video.poster;
  const source = el("source", { src: video.src });
  source.addEventListener("error", () => {
    fig.replaceWith(renderVideoAsText(video, label));
  });
  player.append(source);
  player.append(
    el("track", {
      attrs: {
        kind: "captions",
        src: video.captionsSrc,
        srclang: "en",
        label: "English",
        default: "",
      },
    }),
  );
  fig.append(player);

  const transcript = el("details");
  transcript.append(
    el("summary", { textContent: "Transcript" }),
    el("p", { textContent: video.transcript }),
  );
  fig.append(transcript);
  if (video.describedTranscript) {
    const described = el("details");
    described.append(
      el("summary", { textContent: "Described version" }),
      el("p", { textContent: video.describedTranscript }),
    );
    fig.append(described);
  }
  return fig;
}

// Ambient sound: play-on-demand only, never autoplay (schema-enforced). The
// control removes itself if the track is not on disk yet.
function renderAmbientAudio(audioMeta) {
  const audio = new Audio(audioMeta.src);
  audio.preload = "metadata";
  audio.loop = audioMeta.loop === true;
  const title = audioMeta.title ?? "Ambience";
  const idleLabel = `▶ ${title}`;
  const btn = el("button", { className: "secondary voice-btn", textContent: idleLabel });
  const wrap = el("p", { className: "ambient-audio" }, btn);
  audio.addEventListener("error", () => wrap.remove());
  btn.addEventListener("click", () => {
    if (audio.paused) {
      audio.play().then(
        () => (btn.textContent = `■ Stop ${title.toLowerCase()}`),
        () => wrap.remove(),
      );
    } else {
      audio.pause();
      btn.textContent = idleLabel;
    }
  });
  return wrap;
}

// The environment layer. CSS paints the room's backdrop (with a contrast
// scrim) off this attribute, so the screen looks like the place the player
// is standing: the hall, each wing, the corridor between them, the door.
function setScene(scene) {
  document.body.dataset.scene = scene;
}

