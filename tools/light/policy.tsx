// src/policy.js
// Industry-aligned targets (WCAG 2.x AA)
export const TARGET_TEXT_CR = 4.5;   // normal text
export const TARGET_UI_CR   = 3.0;   // non-text UI (focus, icons, borders)

// Product metric (overall pass threshold)
export const TARGET_PASS_RATE = 0.95; // 95% recommended for ship; raise if you want

// Exempt items (do not count in pass-rate)
export const EXEMPT_USES = new Set([
  'CTA disabled' // WCAG exempts disabled/inactive controls
]);

// Checks that must never fail (even if pass rate is high)
export const MANDATORY_USES = new Set([
  'Link on bg',
  'Link on surface',
  'Link (strong) on bg',
  'Link (strong) on surface',
  'Focus ring vs bg (light)',
  'Focus ring vs bg (dark)'
]);
