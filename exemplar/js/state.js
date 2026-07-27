// Run state. Progress persists to localStorage so a player can close the tab
// and come back to the room they were standing in. The URL hash still tracks
// position so a link can be shared or bookmarked.

const STORAGE_KEY = "escape-the-lecture:run:v1";

export function createRun() {
  return {
    view: "intro", // "intro" | "level" | "finale"
    currentLevelOrder: 1,
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
  if (isLevelRestored(run, level)) return true;
  const prevOrder = [...orders].reverse().find((o) => o < level.order);
  const prev = content.levels.find((l) => l.order === prevOrder);
  return prev ? isLevelRestored(run, prev) : true;
}

// Full reset of one room: challenges, lock, its key, its evidence, and its
// interlude, so replaying the room replays all of it.
export function resetLevel(run, level) {
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
    return parsed.run;
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

export function applyResume(run, resume, content) {
  // Jumping ahead marks earlier levels restored so the progress spine and the
  // finale's evidence replay stay coherent for a resumed run.
  Object.assign(run, resume);
  const upTo =
    resume.view === "finale" ? Infinity : resume.currentLevelOrder ?? 1;
  for (const level of content.levels) {
    if (level.order < upTo) {
      run.completed[level.id] = level.challenges.map((c) => c.id);
      bankEvidence(run, level.id, level.evidenceFragment);
      openLock(run, level);
      run.interludesSeen[level.id] = true;
    }
  }
}
