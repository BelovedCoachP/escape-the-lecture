// Boot sequence: load content, validate it client-side, mount the shell,
// start at level 1 or the hash resume target. If validation fails, the app
// refuses to render. That refusal is the runtime half of the accessibility
// guarantee: an inaccessible room cannot be expressed as valid content.

import { loadContent, validateContent } from "./content.js";
import {
  createRun,
  decodeResume,
  applyResume,
  loadSavedRun,
  clearSavedRun,
} from "./state.js";
import { mountShell } from "./render/shell.js";
import { showIntro, goToLevel, openFinale, advance } from "./router.js";
import { initAnnouncer } from "./a11y.js";

const CONTENT_URL = "../content/vault-content.json";

boot(document.getElementById("vault-root"));

async function boot(rootEl) {
  let content;
  try {
    content = await loadContent(CONTENT_URL);
  } catch (err) {
    renderFatal(rootEl, "The vault content could not be loaded.", [
      String(err.message ?? err),
      "If you opened index.html directly from disk, serve the repository root instead (for example: npx http-server . ) so the content file can be fetched.",
    ]);
    return;
  }

  const result = validateContent(content);
  if (!result.ok) {
    renderFatal(
      rootEl,
      "This room failed validation and will not open.",
      result.errors.map((e) => `${e.path}: ${e.message}`),
      "The schema is the accessibility guarantee. Fix the content and reload.",
    );
    return;
  }

  const refs = mountShell(rootEl, content);
  initAnnouncer(rootEl);

  // A saved run (if any) seeds the state, merged over fresh defaults so an
  // older save shape degrades gracefully.
  const saved = loadSavedRun(content.meta.id);
  const ctx = {
    content,
    run: saved ? Object.assign(createRun(), saved) : createRun(),
    refs,
    actions: {},
    suppressHashEvent: false,
    hasSavedRun: Boolean(saved && saved.view !== "intro"),
    // Captured now because showIntro rewrites run.view to "intro" before the
    // player ever clicks Continue.
    resumeTarget: saved ? { view: saved.view, order: saved.currentLevelOrder } : null,
  };
  ctx.actions.begin = () => {
    const first = Math.min(...content.levels.map((l) => l.order));
    goToLevel(ctx, first);
  };
  ctx.actions.advance = () => advance(ctx);
  ctx.actions.goTo = (order) => goToLevel(ctx, order);
  ctx.actions.continueRun = () => {
    const target = ctx.resumeTarget;
    if (target?.view === "finale") openFinale(ctx);
    else if (target?.view === "level") goToLevel(ctx, target.order);
    else ctx.actions.begin();
  };
  ctx.actions.startOver = () => {
    clearSavedRun();
    ctx.run = createRun();
    ctx.hasSavedRun = false;
    ctx.actions.begin();
  };

  window.addEventListener("hashchange", () => {
    if (ctx.suppressHashEvent) {
      ctx.suppressHashEvent = false;
      return;
    }
    const resume = decodeResume(location.hash, content);
    if (!resume) {
      showIntro(ctx);
      return;
    }
    applyResume(ctx.run, resume, content);
    if (resume.view === "finale") openFinale(ctx);
    else goToLevel(ctx, resume.currentLevelOrder);
  });

  const resume = decodeResume(location.hash, content);
  if (resume) {
    applyResume(ctx.run, resume, content);
    if (resume.view === "finale") openFinale(ctx);
    else goToLevel(ctx, resume.currentLevelOrder);
  } else {
    showIntro(ctx);
  }
}

function renderFatal(rootEl, title, details, note) {
  rootEl.innerHTML = "";
  const wrap = document.createElement("div");
  wrap.className = "fatal";
  const h = document.createElement("h1");
  h.textContent = title;
  wrap.append(h);
  if (details?.length) {
    const list = document.createElement("ul");
    for (const d of details) {
      const li = document.createElement("li");
      li.textContent = d;
      list.append(li);
    }
    wrap.append(list);
  }
  if (note) {
    const p = document.createElement("p");
    p.textContent = note;
    wrap.append(p);
  }
  rootEl.append(wrap);
}
