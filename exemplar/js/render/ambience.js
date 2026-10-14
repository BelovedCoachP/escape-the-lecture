// The game-wide ambience: one looping track that plays under every room.
//
// WCAG 1.4.2 allows audio that starts on its own only with a mechanism to
// stop it, so this module guarantees one: a labeled button in the AURA panel
// on every page. A player who stops the music keeps it stopped across rooms
// and visits (remembered in localStorage), and the music drops under any
// voice line or video so it never competes with speech.
//
// Browsers refuse sound before a visitor's first click or key press. The
// track tries to start as soon as the page loads; if the browser blocks it,
// it starts on the first interaction anywhere on the page.

import { el } from "./dom.js";

const PREF_KEY = "escape-the-lecture:ambience";
const DUCKED_VOLUME = 0.25;

const readPref = () => {
  try { return localStorage.getItem(PREF_KEY); } catch { return null; }
};
const writePref = (value) => {
  try { localStorage.setItem(PREF_KEY, value); } catch { /* storage blocked: still works this visit */ }
};

export function createAmbience(meta) {
  const audio = new Audio(meta.src);
  audio.loop = meta.loop !== false;
  audio.preload = "auto";
  const title = (meta.title ?? "Ambience").toLowerCase();

  // Wanted = the music should be playing whenever the browser allows it.
  let wanted = meta.autoplay === true && readPref() !== "off";
  const speaking = new Set();

  const btn = el("button", { className: "secondary ambience-btn" });
  const node = el("p", { className: "ambience-row" }, btn);
  const label = () => {
    btn.textContent = audio.paused ? `▶ Play ${title}` : `■ Stop ${title}`;
  };
  label();
  audio.addEventListener("play", label);
  audio.addEventListener("pause", label);
  audio.addEventListener("error", () => node.remove());

  const tryPlay = () => audio.play().catch(() => {});

  btn.addEventListener("click", () => {
    if (audio.paused) {
      wanted = true;
      writePref("on");
      tryPlay();
    } else {
      wanted = false;
      writePref("off");
      audio.pause();
    }
  });

  // Blocked autoplay: start on the first click, tap, or key press, unless
  // that first interaction is this button (its own handler decides).
  const onFirstGesture = (event) => {
    if (btn.contains(event.target)) return;
    if (wanted && audio.paused) tryPlay();
  };
  const armGesture = () => {
    for (const type of ["pointerdown", "keydown", "touchstart"]) {
      document.addEventListener(type, onFirstGesture, { capture: true, once: true });
    }
  };

  // Speech and video always win: the ambience drops while any of them plays.
  const setDucked = () => {
    audio.volume = speaking.size > 0 ? DUCKED_VOLUME : 1;
  };
  const isSpeech = (media) => media !== audio && !media.muted;
  document.addEventListener("play", (event) => {
    if (event.target instanceof HTMLMediaElement && isSpeech(event.target)) {
      speaking.add(event.target);
      setDucked();
    }
  }, true);
  for (const type of ["pause", "ended", "emptied"]) {
    document.addEventListener(type, (event) => {
      if (speaking.delete(event.target)) setDucked();
    }, true);
  }
  // Voice lines play from detached Audio objects, which never reach the
  // document; voice.js announces them instead.
  document.addEventListener("vault:voice", (event) => {
    const { media, playing } = event.detail;
    if (playing) speaking.add(media);
    else speaking.delete(media);
    setDucked();
  });

  return {
    node,
    start() {
      if (!wanted) return;
      audio.play().catch(armGesture);
    },
  };
}
