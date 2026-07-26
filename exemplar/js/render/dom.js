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
