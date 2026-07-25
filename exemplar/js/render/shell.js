// Builds the archive hall: header, level frame, progress spine, persistent
// AURA panel, and the three views (intro, level, finale). This is the
// text-first build: media items render as their text equivalents, and
// challenges are placeholders until the interactive primitives land.

import {
  markChallengeComplete,
  isLevelComplete,
  bankEvidence,
  getProgress,
} from "../state.js";
import { announce, moveFocusTo } from "../a11y.js";

const TYPE_LABELS = {
  choice: "Selection challenge",
  sequence: "Ordering challenge",
  response: "Written response",
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

  const layout = el("div", { className: "vault-layout" });
  layout.append(main, rail);

  const footer = el("footer", { className: "vault-footer" });
  if (content.meta.brandFooter) {
    footer.append(el("p", { textContent: content.meta.brandFooter }));
  }

  rootEl.append(header, layout, footer);
  return { main, companionTranscript, spineSummary, spineList };
}

/* ---------- Intro ---------- */

export function renderIntro(ctx) {
  const { content, refs } = ctx;
  const n = content.narrative;
  refs.main.innerHTML = "";

  const view = el("section");
  view.append(
    el("p", { className: "view-eyebrow", textContent: "Briefing" }),
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

  const view = el("section");
  view.append(
    el("p", {
      className: "view-eyebrow",
      textContent: level.subtitle ?? `Level ${level.order}`,
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

  (level.media ?? []).forEach((m) => {
    const rendered = renderMediaAsText(m);
    if (rendered) view.append(rendered);
  });

  (level.companionLines ?? []).forEach((line) => {
    view.append(renderCompanionLine(line, ctx));
  });

  const challenges = level.challenges;
  challenges.forEach((challenge, i) => {
    view.append(
      renderChallengePlaceholder(challenge, i + 1, challenges.length, level, ctx, view),
    );
  });

  refs.main.append(view);

  if (isLevelComplete(run, level)) {
    view.append(renderLevelComplete(level, ctx));
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

function renderChallengePlaceholder(challenge, num, total, level, ctx, viewEl) {
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

  if (challenge.type === "choice") {
    const list = el("ul", { className: "option-list" });
    challenge.options.forEach((o) => list.append(el("li", { textContent: o.text })));
    card.append(list);
  } else if (challenge.type === "sequence") {
    const list = el("ol", { className: "option-list" });
    challenge.items.forEach((it) => list.append(el("li", { textContent: it.text })));
    card.append(list);
  }

  card.append(
    el("p", {
      className: "placeholder-note",
      textContent: "This challenge becomes interactive in the next build.",
    }),
  );

  const done = (run.completed[level.id] ?? []).includes(challenge.id);
  const btn = el("button", {
    textContent: done ? "Challenge complete ✓" : "Mark challenge complete",
  });
  btn.disabled = done;
  btn.addEventListener("click", () => {
    markChallengeComplete(run, level.id, challenge.id);
    btn.disabled = true;
    btn.textContent = "Challenge complete ✓";
    if (isLevelComplete(run, level)) {
      const completeCard = renderLevelComplete(level, ctx);
      viewEl.append(completeCard);
      renderSpine(ctx);
      announce("Level complete. Evidence logged. Shelf restored.");
      moveFocusTo(completeCard.querySelector("h3"));
    } else {
      announce(`Challenge complete. ${remainingText(run, level)}`);
    }
  });
  card.append(btn);
  return card;
}

function remainingText(run, level) {
  const doneCount = (run.completed[level.id] ?? []).length;
  const left = level.challenges.length - doneCount;
  return left === 1 ? "1 challenge remains." : `${left} challenges remain.`;
}

function renderLevelComplete(level, ctx) {
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

/* ---------- Finale ---------- */

export function renderFinale(ctx) {
  const { content, refs, run } = ctx;
  const finale = content.finale;
  refs.main.innerHTML = "";

  const view = el("section");
  view.append(
    el("p", { className: "view-eyebrow", textContent: "The Archivist returns" }),
    el("h2", { className: "view-title", textContent: finale.title }),
  );
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
  refs.spineSummary.textContent = `Shelves restored: ${done} of ${total}`;
  refs.spineList.innerHTML = "";
  [...content.levels]
    .sort((a, b) => a.order - b.order)
    .forEach((level) => {
      const restored = isLevelComplete(run, level);
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
        el("span", {
          textContent: `${level.title} (${restored ? "restored" : "sealed"})`,
        }),
      );
      refs.spineList.append(item);
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

function el(tag, { attrs, ...props } = {}, ...children) {
  const node = document.createElement(tag);
  Object.assign(node, props);
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  }
  node.append(...children);
  return node;
}
