// Run state. Progress persists to localStorage so a player can close the tab
// and come back to the room they were standing in. The URL hash still tracks
// position so a link can be shared or bookmarked.

const STORAGE_KEY = "escape-the-lecture:run:v1";

export function createRun() {
  return {
    view: "intro", // "intro" | "level" | "finale"
    currentLevelOrder: 1,
    visitedLevels: [], // rooms entered legitimately remain available for replay
    drafts: {}, // unfinished challenge answers, saved on each change
    completed: {}, // levelId -> array of completed challenge ids
    evidence: [], // { levelId, fragment } in the order banked
    keys: [], // { levelId, label } banked when a lock opens; the keyring
    locksOpened: {}, // levelId -> true once the level's lock is opened
    vaultOpened: false, // the finale meta-lock
    interludesSeen: {}, // levelId -> true once the rest beat has played
    hintUsage: {}, // challengeId -> count (never penalized; tracked for Session B)
    finaleSubmitted: false,
    finaleChoice: null, // label of the stance the player stood behind
  };
}

export function markChallengeComplete(run, levelId, challengeId) {
  const list = (run.completed[levelId] ??= []);
  if (!list.includes(challengeId)) list.push(challengeId);
}

export function challengesComplete(run, level) {
  const list = run.completed[level.id] ?? [];
  return level.challenges.every((c) => list.includes(c.id));
}

// A level is restored when its challenges are solved AND its lock, if it has
// one, has been opened. The lock is the level's exit, not a fourth challenge.
export function isLevelRestored(run, level) {
  return (
    challengesComplete(run, level) &&
    (!level.lock || run.locksOpened[level.id] === true)
  );
}

export function openLock(run, level) {
  run.locksOpened[level.id] = true;
  if (level.rewardLabel) bankKey(run, level.id, level.rewardLabel);
}

export function bankKey(run, levelId, label) {
  if (!run.keys.some((k) => k.levelId === levelId)) {
    run.keys.push({ levelId, label });
  }
}

// A room can be entered if it is the first room, it is already restored, or
// the room before it is restored. Per-room, not high-water-mark, so
// restarting an earlier room never seals rooms the player already opened.
export function isLevelReachable(run, content, level) {
  const orders = content.levels.map((l) => l.order).sort((a, b) => a - b);
  if (level.order === orders[0]) return true;
  if (isLevelRestored(run, level) || run.visitedLevels?.includes(level.id)) return true;
  const prevOrder = [...orders].reverse().find((o) => o < level.order);
  const prev = content.levels.find((l) => l.order === prevOrder);
  return prev ? isLevelRestored(run, prev) : true;
}

// Full reset of one room: challenges, lock, its key, its evidence, and its
// interlude, so replaying the room replays all of it.
export function resetLevel(run, level) {
  for (const challenge of level.challenges) delete run.drafts?.[challenge.id];
  run.vaultOpened = false;
  run.finaleSubmitted = false;
  run.finaleChoice = null;
  delete run.completed[level.id];
  delete run.locksOpened[level.id];
  delete run.interludesSeen[level.id];
  run.keys = run.keys.filter((k) => k.levelId !== level.id);
  run.evidence = run.evidence.filter((e) => e.levelId !== level.id);
}

export function bankEvidence(run, levelId, fragment) {
  if (!run.evidence.some((e) => e.levelId === levelId)) {
    run.evidence.push({ levelId, fragment });
  }
}

export function getProgress(run, content) {
  const total = content.levels.length;
  const done = content.levels.filter((l) => isLevelRestored(run, l)).length;
  return { done, total, pct: total ? Math.round((done / total) * 100) : 0 };
}

export function encodeResume(run) {
  if (run.view === "finale") return "/finale";
  if (run.view === "level") return `/level/${run.currentLevelOrder}`;
  return "/intro";
}

export function decodeResume(hash, content) {
  const h = (hash || "").replace(/^#/, "");
  if (h === "/finale") return { view: "finale" };
  const m = h.match(/^\/level\/(\d+)$/);
  if (m) {
    const order = Number(m[1]);
    if (content.levels.some((l) => l.order === order)) {
      return { view: "level", currentLevelOrder: order };
    }
  }
  return null;
}

// ---------- Persistence ----------
// Storage is a convenience, never a requirement: every read and write is
// guarded, so a blocked or full store degrades to a normal in-memory run.

export function saveRun(run, contentId) {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ contentId, savedAt: new Date().toISOString(), run }),
    );
  } catch {
    /* private mode, quota, or storage disabled: play on without saving */
  }
}

export function loadSavedRun(contentId) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // A saved run from different content is not this room's progress.
    if (!parsed?.run || parsed.contentId !== contentId) return null;
    const saved = parsed.run;
    const record = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
    if (!record(saved) || !["intro", "level", "finale"].includes(saved.view) ||
        !Number.isInteger(saved.currentLevelOrder) ||
        !record(saved.completed) || !Object.values(saved.completed).every(v => Array.isArray(v) && v.every(id => typeof id === "string")) ||
        !record(saved.locksOpened) || !record(saved.interludesSeen) ||
        !Array.isArray(saved.keys) || !saved.keys.every(k => record(k) && typeof k.levelId === "string" && typeof k.label === "string") ||
        !Array.isArray(saved.evidence) || !saved.evidence.every(e => record(e) && typeof e.levelId === "string" && typeof e.fragment === "string")) return null;
    if (!Array.isArray(saved.visitedLevels) || !saved.visitedLevels.every(id => typeof id === "string")) saved.visitedLevels = [];
    if (!record(saved.drafts)) saved.drafts = {};
    for (const [id, draft] of Object.entries(saved.drafts)) if (!record(draft)) delete saved.drafts[id];
    return saved;
  } catch {
    return null;
  }
}

export function clearSavedRun() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* nothing to clear */
  }
}

// A location is not evidence of completion. Never award progress from a URL.
export function applyResume(run, resume, content) {
  if (resume.view === "finale") {
    if (!content.levels.every(level => isLevelRestored(run, level))) return false;
  } else if (resume.view === "level") {
    const level = content.levels.find(level => level.order === resume.currentLevelOrder);
    if (!level || !isLevelReachable(run, content, level)) return false;
  } else return false;
  Object.assign(run, resume);
  return true;
}
