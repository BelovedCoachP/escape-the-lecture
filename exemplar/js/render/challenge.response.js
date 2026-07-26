// Response primitive: free text, deliberately not autograded. The sequence
// is the thesis as a mechanic: the player writes, AURA assesses first
// (confidently, to one decimal place, on work it cannot evaluate), then the
// expert rubric and exemplar answer appear beside AURA's take, and the
// player scores their own work against both. The tell surfaces only after
// the player resolves the challenge, never before.

import { el } from "./dom.js";

export function renderResponse(challenge, done, api) {
  const wrap = el("div", { className: "response-body" });

  if (done) {
    wrap.append(el("p", { className: "solved-badge", textContent: "✓ Challenge complete" }));
    wrap.append(renderRubricCard(challenge.rubric));
    wrap.append(renderExemplar(challenge.exemplarAnswer));
    return wrap;
  }

  const inputId = `${challenge.id}-response`;
  const maxLength = challenge.maxLength ?? 600;
  wrap.append(el("label", { textContent: "Your answer", attrs: { for: inputId } }));
  const textarea = el("textarea", {
    id: inputId,
    attrs: { maxlength: String(maxLength) },
  });
  if (challenge.placeholder) textarea.placeholder = challenge.placeholder;
  const counter = el("p", { className: "char-count", textContent: `0 of ${maxLength} characters` });
  textarea.addEventListener("input", () => {
    counter.textContent = `${textarea.value.length} of ${maxLength} characters`;
  });

  const submit = el("button", { textContent: "Submit for assessment" });
  const revealWrap = el("div");

  submit.addEventListener("click", () => {
    if (textarea.value.trim().length === 0) {
      api.announce("Write your answer before submitting.");
      return;
    }
    textarea.readOnly = true;
    submit.disabled = true;

    const reveal = el("div", { className: "response-reveal" });
    if (challenge.companionAssessment) {
      reveal.append(renderAssessmentCard(challenge.companionAssessment, api.companionName));
    }
    reveal.append(renderRubricCard(challenge.rubric));
    revealWrap.append(reveal, renderExemplar(challenge.exemplarAnswer));

    const doneBtn = el("button", { textContent: "I have scored my work" });
    doneBtn.addEventListener("click", () => {
      doneBtn.disabled = true;
      doneBtn.textContent = "Challenge complete ✓";
      const a = challenge.companionAssessment;
      if (a && a.accurate === false && a.tell) {
        revealWrap.append(renderTellCard(a.tell, api.companionName));
      }
      api.complete();
    });
    revealWrap.append(el("p", {}, doneBtn));

    api.announce(
      `${api.companionName} assesses your work first. The expert rubric appears beside its assessment. Score your own work against both, then continue.`,
    );
    const heading = revealWrap.querySelector("h4");
    if (heading) {
      heading.setAttribute("tabindex", "-1");
      heading.focus();
    }
  });

  wrap.append(textarea, counter, el("p", {}, submit), revealWrap);
  return wrap;
}

function renderAssessmentCard(assessment, companionName) {
  const card = el("section", { className: "card companion-line reveal-panel" });
  const speaker = el("h4", { className: "speaker", textContent: `${companionName} assesses` });
  if (typeof assessment.confidence === "number") {
    speaker.append(
      el("span", {
        className: "confidence-badge",
        textContent: `Confidence: ${assessment.confidence.toFixed(1)}%`,
      }),
    );
  }
  card.append(speaker, el("p", { textContent: assessment.text }));
  return card;
}

function renderRubricCard(rubric) {
  const card = el("section", { className: "card reveal-panel" });
  card.append(el("h4", { textContent: "The expert rubric" }));
  const list = el("ul", { className: "rubric-list" });
  rubric.forEach((r) => {
    const item = el("li", { className: "rubric-item" });
    item.append(el("p", {}, el("strong", { textContent: r.criterion })));
    item.append(el("p", { className: "rubric-note", textContent: `Look for: ${r.lookFor}` }));
    if (r.commonMiss) {
      item.append(el("p", { className: "rubric-note", textContent: `Common miss: ${r.commonMiss}` }));
    }
    list.append(item);
  });
  card.append(list);
  return card;
}

function renderExemplar(exemplarAnswer) {
  const d = el("details");
  d.append(
    el("summary", { textContent: "The expert answer (a comparison, not a key)" }),
    el("p", { className: "prewrap", textContent: exemplarAnswer }),
  );
  return d;
}

export function renderTellCard(tell, companionName) {
  const card = el("aside", { className: "card tell-card" });
  card.append(
    el("p", { className: "tell-label", textContent: "The tell" }),
    el("p", { textContent: tell }),
  );
  card.setAttribute("aria-label", `How ${companionName}'s error could have been caught`);
  return card;
}
