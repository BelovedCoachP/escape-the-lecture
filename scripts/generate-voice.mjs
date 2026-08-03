// Session D voice batch. Generates every voiced line via ElevenLabs and
// authors a sibling .vtt for each mp3 (repo convention: no audio without
// captions). AURA line text is read straight from the content file so the
// audio can never drift from the screen; Archivist lock lines carry an
// explicit dialogue manifest here because the on-screen prompt wraps his
// speech in narration he should not read aloud — each manifest entry is
// verified as a substring of the content prompt, so drift still fails loudly.
//
// Usage: node scripts/generate-voice.mjs [--force] [--dry-run]
// Requires ELEVENLABS_API_KEY in .env and ffprobe on PATH (for VTT timing).

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FORCE = process.argv.includes("--force");
const DRY = process.argv.includes("--dry-run");

// ---- config -------------------------------------------------------------

const VOICES = {
  aura: {
    id: "Gv42yFG3G6CHLsU5y8g6", // Lucy: charming, upbeat, kind
    settings: { stability: 0.45, similarity_boost: 0.75, style: 0.35 },
  },
  archivist: {
    id: "ePiPWpzcHZrcqRzFrgQg", // Om: calm and soothing
    settings: { stability: 0.7, similarity_boost: 0.8, style: 0.15 },
  },
};

const MODEL_ID = "eleven_multilingual_v2";
const AUDIO_DIR = path.join(root, "exemplar", "assets", "audio");

// ---- gather the lines ---------------------------------------------------

const content = JSON.parse(
  readFileSync(path.join(root, "content", "vault-content.json"), "utf8"),
);

const jobs = [];

function addJob(voice, name, text, { mustAppearIn } = {}) {
  if (mustAppearIn && !mustAppearIn.includes(text)) {
    console.error(`DRIFT  ${name}: manifest dialogue is not a substring of the content text.`);
    process.exitCode = 1;
    return;
  }
  jobs.push({ voice, name, text, dir: voice });
}

// AURA: every companion line and assessment, text taken verbatim.
for (const level of content.levels) {
  for (const line of level.companionLines ?? []) {
    addJob("aura", line.id.replace(/^aura-/, ""), line.text);
  }
  for (const challenge of level.challenges) {
    if (challenge.companionAssessment) {
      addJob(
        "aura",
        challenge.companionAssessment.id.replace(/^aura-/, ""),
        challenge.companionAssessment.text,
      );
    }
  }
}
if (content.finale.companionAssessment) {
  addJob(
    "aura",
    content.finale.companionAssessment.id.replace(/^aura-/, ""),
    content.finale.companionAssessment.text,
  );
}

// The Archivist at each lock: dialogue only, never the narration around it.
const ARCHIVIST_LOCK_DIALOGUE = {
  "invisible-image":
    "You gave four images their words back. One skill did that work. Name it, one word, and the shelf returns to me.",
  "color-chamber":
    "Required from optional. Passing from failing. Signal from decoration. You spent this room telling things apart, and never once by color alone. Name the skill, one word, and the chamber is mine again.",
  "caption-conspiracy":
    "Thirty-four hundred hours of speech, and every hour deserved to arrive in text exactly as it left the speaker. You did that work here, and you caught the machine doing something else in its place. Name the skill, one word, and the wing is mine again.",
  "document-labyrinth":
    "You changed nothing a sighted reader will ever notice. Order restored, headings made real, links given names. Tell me what you gave this document back. One word, and the wing returns to me.",
  "prompt-reactor":
    "The last key is not mine to give. I wrote it into AURA's constraints the day I built it, and you have just repaired the very lines it was hiding in. The instructions are whole again on the coolant ring. Read them the way a machine would: exactly, in order, missing nothing. They spell the key.",
};

for (const level of content.levels) {
  const dialogue = ARCHIVIST_LOCK_DIALOGUE[level.id];
  if (!dialogue || !level.lock) continue;
  addJob("archivist", `lock-${level.id}`, dialogue, {
    mustAppearIn: level.lock.prompt,
  });
}

// The opening monologue, for the Lockdown cinematic mix.
addJob(
  "archivist",
  "lockdown-vo",
  content.narrative.openingMedia.transcript.replace(/THE ARCHIVIST:\s*/g, ""),
);

// The epilogue exchange inside the opened vault. Narrator beats stay text.
(content.finale.epilogue?.beats ?? []).forEach((beat, i) => {
  if (beat.speaker === "narrator") return;
  addJob(beat.speaker === "aura" ? "aura" : "archivist", `epilogue-${i + 1}`, beat.text);
});

// ---- generate -----------------------------------------------------------

const env = readFileSync(path.join(root, ".env"), "utf8");
const apiKey = env.match(/ELEVENLABS_API_KEY=(\S+)/)?.[1];
if (!apiKey && !DRY) {
  console.error("No ELEVENLABS_API_KEY in .env");
  process.exit(1);
}

function mp3Duration(file) {
  const out = execFileSync("ffprobe", [
    "-v", "error",
    "-show_entries", "format=duration",
    "-of", "default=noprint_wrappers=1:nokey=1",
    file,
  ]);
  return parseFloat(String(out));
}

function toTimestamp(seconds) {
  const h = String(Math.floor(seconds / 3600)).padStart(2, "0");
  const m = String(Math.floor((seconds % 3600) / 60)).padStart(2, "0");
  const s = (seconds % 60).toFixed(3).padStart(6, "0");
  return `${h}:${m}:${s}`;
}

// Cues split on sentence ends, timed proportionally to text length. A rough
// but honest starting point; hand-tune against the audio where it matters.
function writeVtt(file, text, duration) {
  const sentences = text.match(/[^.!?…]+[.!?…]+(\s|$)/g)?.map((s) => s.trim()) ?? [text];
  const totalChars = sentences.reduce((n, s) => n + s.length, 0);
  let cursor = 0;
  const cues = sentences.map((sentence) => {
    const share = (sentence.length / totalChars) * duration;
    const cue = `${toTimestamp(cursor)} --> ${toTimestamp(Math.min(cursor + share, duration))}\n${sentence}`;
    cursor += share;
    return cue;
  });
  writeFileSync(file, `WEBVTT\n\n${cues.join("\n\n")}\n`);
}

let generated = 0;
let skipped = 0;

for (const job of jobs) {
  const dir = path.join(AUDIO_DIR, job.dir);
  mkdirSync(dir, { recursive: true });
  const mp3 = path.join(dir, `${job.name}.mp3`);
  const vtt = path.join(dir, `${job.name}.vtt`);

  if (existsSync(mp3) && !FORCE) {
    if (!existsSync(vtt)) writeVtt(vtt, job.text, mp3Duration(mp3));
    skipped += 1;
    continue;
  }
  if (DRY) {
    console.log(`would generate  ${job.voice}  ${path.relative(root, mp3)}  (${job.text.length} chars)`);
    continue;
  }

  const voice = VOICES[job.voice];
  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voice.id}?output_format=mp3_44100_128`,
    {
      method: "POST",
      headers: { "xi-api-key": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        text: job.text,
        model_id: MODEL_ID,
        voice_settings: voice.settings,
      }),
    },
  );
  if (!res.ok) {
    console.error(`FAIL  ${job.name}: ${res.status} ${await res.text()}`);
    process.exitCode = 1;
    continue;
  }
  writeFileSync(mp3, Buffer.from(await res.arrayBuffer()));
  writeVtt(vtt, job.text, mp3Duration(mp3));
  console.log(`ok  ${job.voice}  ${path.relative(root, mp3)}`);
  generated += 1;
}

console.log(`\n${generated} generated, ${skipped} already present. ${jobs.length} lines total.`);
