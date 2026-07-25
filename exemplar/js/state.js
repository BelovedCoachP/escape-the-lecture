// In-memory run state. Nothing persists: no cookies, no localStorage (storage
// partitioning breaks inside LMS iframes). The URL hash carries minimal resume
// position only.

export function createRun() {
  return {
    view: "intro", // "intro" | "level" | "finale"
    currentLevelOrder: 1,
    completed: {}, // levelId -> array of completed challenge ids
    evidence: [], // { levelId, fragment } in the order banked
    hintUsage: {}, // challengeId -> count (never penalized; tracked for Session B)
    finaleSubmitted: false,
  };
}

export function markChallengeComplete(run, levelId, challengeId) {
  const list = (run.completed[levelId] ??= []);
  if (!list.includes(challengeId)) list.push(challengeId);
}

export function isLevelComplete(run, level) {
  const list = run.completed[level.id] ?? [];
  return level.challenges.every((c) => list.includes(c.id));
}

export function bankEvidence(run, levelId, fragment) {
  if (!run.evidence.some((e) => e.levelId === levelId)) {
    run.evidence.push({ levelId, fragment });
  }
}

export function getProgress(run, content) {
  const total = content.levels.length;
  const done = content.levels.filter((l) => isLevelComplete(run, l)).length;
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
    }
  }
}
