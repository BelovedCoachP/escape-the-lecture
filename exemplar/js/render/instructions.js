import { el } from "./dom.js";

// Sentence boundaries preserve decimal ratios, quoted dialogue and all wording.
export function instructionSentences(text) {
  return Array.from(new Intl.Segmenter("en", { granularity: "sentence" }).segment(text),
    part => part.segment.trim()).filter(Boolean);
}

export function instructionList(text, className = "") {
  return el("ul", { className: `instruction-list ${className}` },
    ...instructionSentences(text).map(sentence => el("li", { textContent: sentence })));
}

export function readableParagraphs(text, className = "") {
  const sentences = instructionSentences(text);
  const wrap = el("div", { className: `readable-copy ${className}` });
  for (let i = 0; i < sentences.length; i += 2) {
    wrap.append(el("p", { textContent: sentences.slice(i, i + 2).join(" ") }));
  }
  return wrap;
}

export const challengeTitles = {
  "l1-c1-decorative": "Sort the four images",
  "l1-c2-write-alt": "Describe the oxygen chart",
  "l1-c3-catch-aura": "Find AURA's invented detail",
  "l2-c1-run-the-ratio": "Calculate the contrast ratio",
  "l2-c2-palette-sort": "Sort the color pairings",
  "l2-c3-status-glow": "Choose two accessible revisions",
  "l3-c1-caption-repair": "Repair three caption lines",
  "l3-c2-failure-match": "Match the caption failures",
  "l3-c3-silent-rewrites": "Find two silent rewrites",
  "l4-c1-reading-order": "Restore the reading order",
  "l4-c2-costume-headings": "Find the missing heading tags",
  "l4-c3-link-text": "Evaluate the link text",
  "l5-c1-prompt-repair": "Repair four operating constraints",
  "l5-c2-vault-pitch": "Find two inaccessible puzzles",
};
