// Accessibility utilities. Every state change, feedback reveal, and view
// transition routes through announce() so screen reader users hear what
// sighted users see happen.

let liveEl = null;

export function initAnnouncer(parentEl) {
  liveEl = document.createElement("div");
  liveEl.className = "sr-only";
  liveEl.setAttribute("aria-live", "polite");
  liveEl.setAttribute("aria-atomic", "true");
  parentEl.append(liveEl);
}

export function announce(message, politeness = "polite") {
  if (!liveEl) return;
  liveEl.setAttribute("aria-live", politeness);
  // Clearing first, then setting a beat later, makes repeated identical
  // announcements reliable across screen readers. setTimeout, not
  // requestAnimationFrame: rAF is throttled to zero in non-visible tabs,
  // which would silently drop announcements inside a backgrounded LMS iframe.
  liveEl.textContent = "";
  clearTimeout(announce._t);
  announce._t = setTimeout(() => {
    liveEl.textContent = message;
  }, 50);
}

export function moveFocusTo(el) {
  if (!el) return;
  if (!el.hasAttribute("tabindex")) el.setAttribute("tabindex", "-1");
  el.focus();
}

export function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
