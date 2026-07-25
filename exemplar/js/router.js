// Level-to-level flow. Each transition updates the hash (resume position),
// re-renders the view, refreshes the progress spine, and moves focus to the
// new view's heading so keyboard and screen reader users are never lost.

import {
  renderIntro,
  renderLevel,
  renderFinale,
  renderInterlude,
  renderProgressSpine,
} from "./render/shell.js";
import { announce, moveFocusTo } from "./a11y.js";
import { encodeResume, maxUnlockedOrder } from "./state.js";

export function showIntro(ctx) {
  ctx.run.view = "intro";
  syncHash(ctx);
  renderIntro(ctx);
  renderProgressSpine(ctx);
  focusViewHeading(ctx);
}

export function goToLevel(ctx, order) {
  const level = ctx.content.levels.find((l) => l.order === order);
  if (!level) return;
  // Rooms unlock in order; the spine only offers reachable rooms, and this
  // guard keeps programmatic paths honest too.
  if (order > maxUnlockedOrder(ctx.run, ctx.content)) return;
  ctx.run.view = "level";
  ctx.run.currentLevelOrder = order;
  syncHash(ctx);
  renderLevel(level, ctx);
  renderProgressSpine(ctx);
  focusViewHeading(ctx);
  announce(`${level.subtitle ? level.subtitle + ": " : ""}${level.title}`);
}

export function advance(ctx) {
  // The rest beat plays in the transition: after a room resolves, before the
  // next brief. It advances the Archivist's arc and lets the player breathe.
  const current = ctx.content.levels.find(
    (l) => l.order === ctx.run.currentLevelOrder,
  );
  if (
    ctx.run.view === "level" &&
    current?.interlude &&
    !ctx.run.interludesSeen[current.id]
  ) {
    ctx.run.interludesSeen[current.id] = true;
    renderInterlude(current, ctx, () => proceed(ctx));
    const heading = ctx.refs.main.querySelector("h2");
    moveFocusTo(heading);
    announce(
      `Interlude. ${current.interlude.shelfEvent ?? "The archive responds."}`,
    );
    return;
  }
  proceed(ctx);
}

function proceed(ctx) {
  const orders = ctx.content.levels.map((l) => l.order).sort((a, b) => a - b);
  const next = orders.find((o) => o > ctx.run.currentLevelOrder);
  if (next !== undefined) {
    goToLevel(ctx, next);
  } else {
    openFinale(ctx);
  }
}

export function openFinale(ctx) {
  ctx.run.view = "finale";
  syncHash(ctx);
  renderFinale(ctx);
  renderProgressSpine(ctx);
  focusViewHeading(ctx);
  announce(ctx.content.finale.title);
}

function syncHash(ctx) {
  const target = "#" + encodeResume(ctx.run);
  if (location.hash !== target) {
    ctx.suppressHashEvent = true;
    location.hash = target;
  }
}

function focusViewHeading(ctx) {
  const heading = ctx.refs.main.querySelector("h2");
  moveFocusTo(heading);
}
