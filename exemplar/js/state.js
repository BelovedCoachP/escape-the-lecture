// In-memory run state. Nothing persists: no cookies, no localStorage (storage
// partitioning breaks inside LMS iframes). The URL hash carries minimal resume
// position only.

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

// Highest level order the player may enter: one past the last restored level.
export function maxUnlockedOrder(run, content) {
  const orders = content.levels.map((l) => l.order).sort((a, b) => a - b);
  let max = orders[0];
  for (const order of orders) {
    const level = content.levels.find((l) => l.order === order);
    if (isLevelRestored(run, level)) {
      const next = orders.find((o) => o > order);
      max = next ?? order;
    } else {
      break;
    }
  }
  return max;
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
