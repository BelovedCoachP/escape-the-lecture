// Field tool: a live WCAG contrast checker rendered inside the room that
// teaches contrast. Same math as the standard (WCAG 2.1 relative luminance),
// so the player can test any pairing without leaving the vault. A link to
// the WebAIM checker rides along, prefilled with whatever is in the fields,
// for players who want a second opinion from the real-world tool.

import { el } from "./dom.js";

const HEX_RE = /^#?([0-9a-f]{6}|[0-9a-f]{3})$/i;

function normalizeHex(raw) {
  const m = HEX_RE.exec(raw.trim());
  if (!m) return null;
  let hex = m[1];
  if (hex.length === 3) hex = [...hex].map((c) => c + c).join("");
  return hex.toUpperCase();
}

function luminance(hex) {
  const [r, g, b] = [0, 2, 4]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function ratio(hexA, hexB) {
  const [hi, lo] = [luminance(hexA), luminance(hexB)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

export function renderContrastChecker() {
  const card = el("section", { className: "card tool-card" });
  card.append(
    el("p", { className: "card-eyebrow", textContent: "Field tool · Contrast checker" }),
    el("h3", { textContent: "Run the numbers yourself" }),
    el("p", {
      textContent:
        "Enter any two hex colors to get their real contrast ratio, computed exactly the way the standard computes it. AA asks 4.5 to 1 for body text and 3 to 1 for large text.",
    }),
  );

  const row = el("div", { className: "tool-row" });
  const makeField = (labelText, id, initial) => {
    const wrap = el("div", { className: "tool-field" });
    const label = el("label", { textContent: labelText, attrs: { for: id } });
    const input = el("input", {
      id,
      className: "calc-input tool-hex",
      attrs: { type: "text", autocomplete: "off", spellcheck: "false", value: initial },
    });
    wrap.append(label, input);
    row.append(wrap);
    return input;
  };
  const fgInput = makeField("Text color (hex)", "tool-fg", "#F8FAFC");
  const bgInput = makeField("Background color (hex)", "tool-bg", "#9B4DEA");

  const swatch = el("div", {
    className: "tool-swatch",
    attrs: { "aria-hidden": "true" },
    textContent: "Wing Two",
  });
  const result = el("p", { className: "tool-result", attrs: { "aria-live": "polite" } });
  const webaim = el("a", {
    className: "tool-link",
    textContent: "Check the same pair on WebAIM's contrast checker",
    attrs: { target: "_blank", rel: "noopener noreferrer" },
  });

  const update = () => {
    const fg = normalizeHex(fgInput.value);
    const bg = normalizeHex(bgInput.value);
    if (!fg || !bg) {
      result.textContent =
        "Enter both colors as hex values, like #F8FAFC. Three or six digits, with or without the #.";
      swatch.style.removeProperty("color");
      swatch.style.removeProperty("background-color");
      webaim.href = "https://webaim.org/resources/contrastchecker/";
      return;
    }
    const r = ratio(fg, bg);
    const rounded = (Math.floor(r * 100) / 100).toFixed(2);
    const body = r >= 4.5 ? "passes" : "fails";
    const large = r >= 3 ? "passes" : "fails";
    result.textContent = `${rounded} to 1 — ${body} AA for body text (4.5 needed); ${large} AA for large text (3 needed).`;
    swatch.style.color = `#${fg}`;
    swatch.style.backgroundColor = `#${bg}`;
    webaim.href = `https://webaim.org/resources/contrastchecker/?fcolor=${fg}&bcolor=${bg}`;
  };

  fgInput.addEventListener("input", update);
  bgInput.addEventListener("input", update);
  update();

  card.append(row, swatch, result, el("p", {}, webaim));
  return card;
}
