// helpers/gradients.ts
import { colord } from "colord";

export type GradientKind = "linear" | "radial" | "diamond";
export type GradientMode = "lighten" | "darken";

interface ParsedGradient {
  kind: GradientKind;
  fnName: string;
  inner: string;
}

/**
 * Clamp a numeric value into a range.
 */
function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min;
  return Math.min(max, Math.max(min, value));
}

/**
 * Try to parse a gradient function like:
 *   linear-gradient(...)
 *   radial-gradient(...)
 *   diamond-gradient(...)   // custom / app-specific
 *
 * Returns null if it's not in a supported form.
 */
function parseGradientFunction(gradient: string): ParsedGradient | null {
  const trimmed = gradient.trim();
  const openParenIndex = trimmed.indexOf("(");
  const closeParenIndex = trimmed.lastIndexOf(")");

  if (openParenIndex === -1 || closeParenIndex === -1 || closeParenIndex <= openParenIndex + 1) {
    return null;
  }

  const fnName = trimmed.slice(0, openParenIndex).trim();
  const inner = trimmed.slice(openParenIndex + 1, closeParenIndex);
  const lowerFnName = fnName.toLowerCase();

  let kind: GradientKind | null = null;

  if (lowerFnName === "linear-gradient") {
    kind = "linear";
  } else if (lowerFnName === "radial-gradient") {
    kind = "radial";
  } else if (lowerFnName === "diamond-gradient") {
    // Not a standard CSS gradient, but supported here as a custom kind.
    kind = "diamond";
  }

  if (!kind) {
    return null;
  }

  return { kind, fnName, inner };
}

/**
 * Map a GradientKind back to a gradient function name.
 * For now we use the standard CSS function names for linear/radial,
 * and a custom "diamond-gradient" for diamond.
 */
function getFunctionNameForKind(kind: GradientKind): string {
  switch (kind) {
    case "linear":
      return "linear-gradient";
    case "radial":
      return "radial-gradient";
    case "diamond":
      return "diamond-gradient";
    default:
      // Should be unreachable, but fall back to linear.
      return "linear-gradient";
  }
}

/**
 * Adjust all color tokens (hex / rgb[a] / hsl[a] / named colors) in a CSS
 * value string using colord.
 *
 * We:
 *   - Look for candidate color substrings with a regex.
 *   - Ask colord if each candidate is a valid color.
 *   - Lighten or darken it by `amount`.
 *   - Serialize back to an RGB(A) CSS string.
 */
function adjustColorsInCssValue(
  value: string,
  mode: GradientMode,
  amount: number
): string {
  // Candidates:
  //   #rgb / #rgba / #rrggbb / #rrggbbaa
  //   rgb(...) / rgba(...)
  //   hsl(...) / hsla(...)
  //   named colors (red, blue, transparent, etc.)
  const colorRegex =
    /(#(?:[0-9a-fA-F]{3,8})\b|rgba?\([^)]*\)|hsla?\([^)]*\)|\b[a-zA-Z]+\b)/g;

  return value.replace(colorRegex, (match) => {
    const c = colord(match);

    if (!c.isValid()) {
      return match;
    }

    const adjusted =
      mode === "lighten" ? c.lighten(amount) : c.darken(amount);

    // Use RGB(A) strings to preserve alpha where present and keep it CSS-friendly.
    return adjusted.toRgbString();
  });
}

/**
 * Internal engine: parses a CSS gradient, adjusts all color stops,
 * optionally converts the gradient kind, and returns a new CSS string.
 *
 * - If the gradient cannot be parsed, logs a warning and returns the
 *   original `gradient` unchanged.
 */
function adjustCssGradient(
  gradient: string,
  amount: number,
  mode: GradientMode,
  targetKind?: GradientKind,
  logger: (message: string) => void = console.warn
): string {
  const amt = clamp(amount, 0, 1);

  const parsed = parseGradientFunction(gradient);

  if (!parsed) {
    logger(
      `[adjustCssGradient] Unable to parse gradient: "${gradient}". Returning original value.`
    );
    return gradient;
  }

  const { kind: originalKind, inner } = parsed;

  const outKind = targetKind ?? originalKind;
  const fnName = getFunctionNameForKind(outKind);

  const adjustedInner = adjustColorsInCssValue(inner, mode, amt);

  return `${fnName}(${adjustedInner})`;
}

/**
 * Public API: lighten all color stops in a CSS gradient string.
 *
 * - `amount` should be between 0 and 1 (values are clamped).
 * - If `targetKind` is omitted, the original kind is preserved.
 * - If the input is not a parsable gradient, logs a warning and returns
 *   the original string.
 */
export function lightenCssGradient(
  gradient: string,
  amount: number,
  targetKind?: GradientKind,
  logger?: (message: string) => void
): string {
  return adjustCssGradient(gradient, amount, "lighten", targetKind, logger ?? console.warn);
}

/**
 * Public API: darken all color stops in a CSS gradient string.
 *
 * - `amount` should be between 0 and 1 (values are clamped).
 * - If `targetKind` is omitted, the original kind is preserved.
 * - If the input is not a parsable gradient, logs a warning and returns
 *   the original string.
 */
export function darkenCssGradient(
  gradient: string,
  amount: number,
  targetKind?: GradientKind,
  logger?: (message: string) => void
): string {
  return adjustCssGradient(gradient, amount, "darken", targetKind, logger ?? console.warn);
}
