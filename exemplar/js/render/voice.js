import { el } from "./dom.js";
const controls = new Set();
export function stopVoices() {
  for (const control of controls) control.stop();
  controls.clear();
}
export function voiceControl(audioSrc, speakerName) {
  const audio = new Audio(audioSrc);
  audio.preload = "metadata";
  const idleLabel = `▶ Hear ${speakerName}`;
  const btn = el("button", { className: "secondary voice-btn", textContent: idleLabel });
  const wrap = el("p", { className: "voice-row" }, btn);
  let request = 0;
  const stop = () => {
    request++;
    audio.pause();
    audio.currentTime = 0;
    btn.textContent = idleLabel;
  };
  const control = { stop };
  controls.add(control);
  const play = async () => {
    for (const other of controls) if (other !== control) other.stop();
    const token = ++request;
    try {
      await audio.play();
      if (token !== request) return;
      btn.textContent = `■ Stop ${speakerName}`;
    } catch {
      if (token === request) btn.textContent = idleLabel;
      // Autoplay rejection leaves a working manual playback button.
    }
  };
  audio.addEventListener("error", () => { stop(); controls.delete(control); wrap.remove(); });
  audio.addEventListener("ended", () => (btn.textContent = idleLabel));
  btn.addEventListener("click", () => audio.paused ? play() : stop());
  return { node: wrap, play, stop };
}
