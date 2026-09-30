// Shared DOM helper for all renderers.

export function el(tag, { attrs, ...props } = {}, ...children) {
  const node = document.createElement(tag);
  Object.assign(node, props);
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  }
  node.append(...children);
  return node;
}

// Shared answer normalization: case, spacing, punctuation, curly quotes,
// hyphens and dashes never decide whether an answer is right. "Screen-reader
// users navigate by headings!" and "screen reader users navigate by
// headings" are the same answer.
export function normalize(text) {
  return text
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[‐-―_/-]/g, " ")
    .replace(/[.,!?;:'"()[\]‘’‚‛“”„…]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Compare with spaces removed too, so "screenreader" matches "screen reader"
// and a lock typed "I N S T R U C T" matches "instruct".
function compact(text) {
  return normalize(text).replace(/ /g, "");
}

export function answerMatches(accepted, input) {
  const target = compact(input);
  return target !== "" && accepted.some((a) => compact(a) === target);
}

// Accept a plain number or a complete ratio, never only the first number
// from an invalid answer such as "4.3:2" or "4.3 or 7". A trailing period
// or a trailing "ratio" is forgiven: "4.3:1." and "4.3 to 1 ratio" both read.
export function parseNumericAnswer(text) {
  const cleaned = text
    .trim()
    .replace(/[.!]+$/, "")
    .replace(/\s*(?:ratio|contrast)$/i, "")
    .replace(/[.!]+$/, "");
  const match = cleaned.match(/^([+-]?(?:\d+(?:[.,]\d+)?|[.,]\d+))(?:\s*(?::|\/|to)\s*([+]?(?:\d+(?:[.,]\d+)?|[.,]\d+)))?$/i);
  if (!match) return NaN;
  const numerator = Number(match[1].replace(',', '.'));
  const denominator = match[2] ? Number(match[2].replace(',', '.')) : 1;
  return denominator > 0 ? numerator / denominator : NaN;
}
