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
  // Detached Audio never reaches the document, so tell the ambience directly
  // when a voice starts and stops; it lowers itself under speech.
  const tell = (playing) => document.dispatchEvent(new CustomEvent("vault:voice", { detail: { media: audio, playing } }));
  audio.addEventListener("play", () => tell(true));
  for (const type of ["pause", "ended"]) audio.addEventListener(type, () => tell(false));
  btn.addEventListener("click", () => audio.paused ? play() : stop());
  return { node: wrap, play, stop };
}

// One audio element keeps the epilogue in order and retains playback permission.
export function voiceSequence(lines) {
  const audio = new Audio();
  audio.preload = "metadata";
  const btn = el("button", { className: "secondary voice-btn", textContent: "Play voices" });
  const status = el("span", { attrs: { role: "status" } });
  const node = el("div", { className: "voice-row button-row" }, btn, status);
  let index = 0;
  let active = false;
  let request = 0;
  const tell = playing => document.dispatchEvent(new CustomEvent("vault:voice", { detail: { media: audio, playing } }));
  const stop = () => {
    active = false;
    request++;
    audio.pause();
    audio.currentTime = 0;
    tell(false);
    btn.textContent = "Replay voices";
    status.textContent = "Voice playback stopped.";
  };
  const control = { stop };
  controls.add(control);
  const playCurrent = async () => {
    if (!active) return;
    if (index >= lines.length) {
      active = false;
      tell(false);
      btn.textContent = "Replay voices";
      status.textContent = "Voice playback complete.";
      return;
    }
    const token = ++request;
    audio.src = lines[index].audioSrc;
    btn.textContent = "Stop voice";
    status.textContent = `${lines[index].speakerName} · line ${index + 1} of ${lines.length}`;
    try {
      await audio.play();
    } catch (error) {
      if (token !== request || !active) return;
      if (error.name === "NotAllowedError") {
        active = false;
        btn.textContent = "Play voices";
        status.textContent = "Select Play voices to start the recordings.";
      } else {
        index++;
        void playCurrent();
      }
    }
  };
  const play = () => {
    for (const other of controls) if (other !== control) other.stop();
    index = 0;
    active = true;
    return playCurrent();
  };
  audio.addEventListener("ended", () => {
    tell(false);
    if (active) { index++; void playCurrent(); }
  });
  audio.addEventListener("error", () => {
    if (active) { index++; void playCurrent(); }
  });
  audio.addEventListener("play", () => tell(true));
  audio.addEventListener("pause", () => tell(false));
  btn.addEventListener("click", () => active ? stop() : play());
  return { node, play, stop };
}
