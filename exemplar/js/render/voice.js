// Shared voice playback control. Speech is never audio-only in this game:
// every voiced line's full text is already on screen, so this control is
// purely additive. Play-on-demand, visible stop, no loop, and if the file
// is missing the control removes itself rather than presenting a dead
// button (assets arrive across media sessions).

import { el } from "./dom.js";

export function voiceControl(audioSrc, speakerName) {
  // metadata preload so a missing file errors immediately and the control
  // removes itself before the player ever sees a dead button.
  const audio = new Audio(audioSrc);
  audio.preload = "metadata";
  const idleLabel = `▶ Hear ${speakerName}`;
  const btn = el("button", { className: "secondary voice-btn", textContent: idleLabel });
  const wrap = el("p", { className: "voice-row" }, btn);

  audio.addEventListener("error", () => wrap.remove());
  audio.addEventListener("ended", () => (btn.textContent = idleLabel));

  btn.addEventListener("click", () => {
    if (audio.paused) {
      audio.play().then(
        () => (btn.textContent = "■ Stop"),
        () => wrap.remove(),
      );
    } else {
      audio.pause();
      audio.currentTime = 0;
      btn.textContent = idleLabel;
    }
  });

  return {
    node: wrap,
    // For lines that speak when they appear (always downstream of a player
    // gesture; the on-screen text carries the content if playback is blocked).
    play: () =>
      audio.play().then(
        () => (btn.textContent = "■ Stop"),
        () => {},
      ),
  };
}
