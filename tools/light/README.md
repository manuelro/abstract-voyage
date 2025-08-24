Accent Ladder — φ Delta Control (Variable Levels)
This application generates perceptually even accent color ladders (light and dark) from a base color using the OKLCH color space and φ-based delta scaling. It exports design tokens (CSS variables and JSON), provides a themed UI preview, performs a focused accessibility audit, and includes an optimizer that minimally adjusts the accent to meet WCAG contrast targets.
Abstract
Design systems often start with a brand accent that does not generalize to accessible, theme-ready scales. This tool creates light and dark accent ladders with appropriate on-colors, validates key contrast scenarios, and offers controlled, explainable optimization to reach target contrast pass rates with minimal perceptual drift.
Features
OKLCH-based tint/base/shade ladders (3–10 levels) for light and dark themes
Automatic on-color selection per level (aimed at WCAG AA text)
φ-based delta presets (gentle, soft, standard, bold, extra)
Accessibility audit focused on accent-as-text and focus ring use cases (10 checks)
Optimizer: nearest acceptable accent (small hue drift), optional dark-surface nudge, and optional stronger delta; all changes are animated
Export of CSS variables (:root and [data-theme="dark"]) and Design Tokens JSON
Problem Statement
Brand accents frequently fail contrast requirements across backgrounds and surfaces, especially when mirrored into dark mode. Teams need a repeatable method to derive accessible, perceptually consistent scales, validate usage, and produce tokens that integrate cleanly with component libraries.
System Overview
The application is a React SPA (plain JS/JSX). Core logic is implemented as pure functions (color conversions, ladder generation, token mapping, contrast calculations). UI components are presentational; App.jsx coordinates state, derived data, and the optimization flow.
Controls (baseHex, deltaScale, levels)
    ↓
Ladder builders (light/dark, pure functions)
    ↓
Role mapping → Theme variables
    ├─ Tiny UI preview (scoped wrapper only)
    ├─ Ladder grid (tiles)
    ├─ Tokens output (CSS/JSON)
    └─ Accessibility audit (scoped)
                 ↑
         Optimizer (search in OKLCH with small hue drift; optional surface nudge; delta escalation)
Core Concepts
OKLCH Color Model
All color computations (generation and animation) use OKLCH. Conversions between HEX and OKLCH are implemented in utils/color.js. Ladder construction modifies L (lightness) and C (chroma) around a fixed or slightly drifting hue; on-color selection enforces text contrast targets when feasible.
φ-Based Delta Control
A scalar s (e.g., √φ) modulates lightness and chroma envelopes to produce aesthetically balanced ladders. Presets correspond to 1/φ², 1/φ, 1, √φ, φ.
Role Mapping
computeRoleKeys(steps) maps arbitrary level counts to role aliases:
accent-base, accent-tint-1/2, accent-shade-1/2, plus corresponding on-*. CTA and focus ring tokens derive from these roles.
Accessibility Audit
Scope (10 checks): items directly influenced by the base accent:
Light: shade-1/shade-2 as link text on --bg and on --surface (4 checks)
Dark: same as above (4 checks)
Focus ring vs --bg: light and dark (2 checks, UI ≥ 3:1)
Targets: text AA ≥ 4.5:1; non-text UI ≥ 3:1.
The audit table may show additional rows for context, but the pass rate is computed from these 10 checks.
Optimization Algorithm
Nearest accent search in OKLCH with constraints: ΔL ≤ 0.45, ΔC ≤ 0.30, hue drift ≤ ±12°. Coarse search followed by local refinement; objective balances pass rate, residual contrast penalty, and distance from the original accent.
Surface nudge (optional): darken dark theme --surface by ~0.03 L when necessary.
Delta escalation (optional): increase the φ-based delta one step to strengthen separation (notably shade-2 vs surface).
Early stop: the process stops as soon as the target pass rate is met. All changes animate (OKLCH for colors, numeric tween for delta).
User Interface Notes
Theme scopes (.sim-light / .sim-dark) apply only to the intended preview/audit wrappers. Surrounding panels and tabs remain neutral.
Tabs use a consistent active token pair to avoid visual drift across scopes.
Ensure .sim-light, .sim-dark { color: var(--text); } so text color follows the scoped theme variables.
Exports
CSS Variables
:root { … } for light mode; [data-theme="dark"] { … } for dark mode
--accent-* and --on-accent-* per level
Role aliases and CTA tokens
Ring color derived from the default accent
Design Tokens JSON
color.* for light; modes.dark.color.* for dark
role.cta.* aliases
scale.accent-level index mapping
Schema compatible for integration into token pipelines
Project Structure
src/
  components/
    A11yAudit.jsx
    Controls.jsx
    LadderGrid.jsx
    Tabs.jsx
    TinyUIPreview.jsx
    TokensOutput.jsx
    Toast.jsx
  hooks/
    useToast.js
  utils/
    animate.js
    color.js
    ladder.js
    optimizer.js
    tokens.js
  styles.css
  App.jsx
Installation and Usage
Requirements: Node.js 18+
npm install
npm run dev         # development
npm run build       # production build
npm run preview     # serve build locally
Configuration
Adjust targets and constraints in code:
Pass-rate target: TARGET_PASS_RATE (default 0.95) in App.jsx.
Text/UI contrast thresholds: TARGET_TEXT_CR, TARGET_UI_CR in utils/optimizer.js.
Search window and hue drift: options to findNearestPassingBase.
Testing (Suggested)
Color conversions: HEX↔OKLCH round-trip within tolerance.
Ladder properties: expected ordering and guardrails on L and C.
On-color solver: foreground ≥ 4.5 when feasible.
Optimizer: seeded failing palettes achieve target or report best achievable with explanation.
UI: controlled delta select (id→value mapping), consistent tab appearance across scopes.
Limitations
The pass rate is intentionally limited to accent-driven checks; it is not a full page accessibility audit.
Hue drift is capped to preserve brand identity; some palettes may not reach very high pass rates without larger adjustments.
Future Work
Expose user controls for maximum hue drift and surface nudge magnitude.
Add alternative ladder shapes (e.g., neutral UI ladder).
Provide SCSS/Tailwind exports alongside CSS/JSON.
Add unit tests and visual regression tests.
License
MIT (or update to your organization’s license).
Acknowledgments
OKLCH color space and WCAG contrast guidance informed the implementation. The φ-based deltas are used as a practical aesthetic heuristic.