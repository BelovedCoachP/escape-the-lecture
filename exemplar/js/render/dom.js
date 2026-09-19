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

// Shared answer normalization: case-insensitive, whitespace-forgiving.
// Used by locks and repair segments so "forgiving" means the same thing
// everywhere.
export function normalize(text) {
  return text.trim().toLowerCase().replace(/\s+/g, " ");
}

// Accept a plain number or a complete ratio, never only the first number
// from an invalid answer such as "4.3:2" or "4.3 or 7".
export function parseNumericAnswer(text) {
  const match = text.trim().match(/^([+-]?(?:\d+(?:[.,]\d+)?|[.,]\d+))(?:\s*(?::|\/|to)\s*([+]?(?:\d+(?:[.,]\d+)?|[.,]\d+)))?$/i);
  if (!match) return NaN;
  const numerator = Number(match[1].replace(',', '.'));
  const denominator = match[2] ? Number(match[2].replace(',', '.')) : 1;
  return denominator > 0 ? numerator / denominator : NaN;
}
