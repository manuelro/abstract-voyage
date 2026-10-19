import { colord } from 'colord';
import {
  normalizeTailwindToken,
  tailwindTokenCssValue,
  translateTailwindTokenBreakpoint,
  type TailwindTokenValue,
} from '../../../../components/Panel/config/tailwindFields';
import {
  COVER_FLOW_GRADIENT_SOURCE_CARDS,
  type UnifiedGradientSourceCard,
} from '../Card/config/appearance';

export type QuoteTextColorSource = 'inherit' | UnifiedGradientSourceCard;

/** At least 7 swatches to pick from (operator ask) -- hues evenly spaced
 * around the wheel (360/7 ≈ 51.4° apart, starting at red/0°) so the set
 * reads as a deliberately distributed spread, not an arbitrary hand-picked
 * palette, and so paletteSaturationPercent/paletteLightnessPercent can
 * modulate every swatch identically with no swatch needing its own
 * special-cased S/L. */
export const QUOTE_PALETTE_SIZE = 7;
const QUOTE_PALETTE_HUE_STEP_DEG = 360 / QUOTE_PALETTE_SIZE;

/** Generates the QUOTE_PALETTE_SIZE-swatch background palette
 * paletteColorIndex selects from. saturationPercent/lightnessPercent (each
 * 0-100, clamped) are the two "how pastel/how light-dark" modulation knobs
 * applied uniformly to every swatch -- low saturation + high lightness
 * reads pastel; high saturation + low lightness reads deep/moody; the two
 * axes are independent so any point on that plane is reachable. Pure
 * function of the two numbers (plus the fixed hue spacing above), so the
 * same inputs always produce the same 7 hex colors. */
export function generateQuotePalette(saturationPercent: number, lightnessPercent: number): string[] {
  const s = Math.min(100, Math.max(0, Number.isFinite(saturationPercent) ? saturationPercent : 0));
  const l = Math.min(100, Math.max(0, Number.isFinite(lightnessPercent) ? lightnessPercent : 50));
  return Array.from({ length: QUOTE_PALETTE_SIZE }, (_, index) => (
    colord({ h: index * QUOTE_PALETTE_HUE_STEP_DEG, s, l }).toHex()
  ));
}

const QUOTE_TEXT_MIN_CONTRAST_RATIO = 4.5;

/**
 * Derives the quote's text ink from its chosen background swatch, with the
 * ink's own saturation/lightness set INDEPENDENTLY from the background's
 * (textColorSaturationPercent/textColorLightnessPercent, separate knobs from
 * paletteSaturationPercent/paletteLightnessPercent) -- the operator's own
 * "font darkness/lightness and saturation/chroma" controls. Hue is still
 * taken from the background, so the ink reads as *derived from that color*
 * rather than an arbitrary unrelated pick.
 *
 * The operator's exact saturation/lightness is honored verbatim whenever it
 * already clears minContrastRatio against the background. Only when it does
 * NOT is the lightness nudged -- the minimum distance, in whichever single
 * direction (toward 0 or toward 100) actually reaches a passing contrast --
 * so a legible result is still guaranteed without silently discarding the
 * operator's own choice when it was already safe. `honored: false` signals
 * when a nudge happened, so a caller/tester can distinguish "exactly what
 * was configured" from "the closest legible alternative."
 */
export function deriveQuoteTextColor(
  backgroundColor: string,
  saturationPercent: number,
  lightnessPercent: number,
  minContrastRatio: number = QUOTE_TEXT_MIN_CONTRAST_RATIO,
): { color: string; honored: boolean } {
  const background = colord(backgroundColor);
  const { h } = background.toHsl();
  const s = Math.min(100, Math.max(0, Number.isFinite(saturationPercent) ? saturationPercent : 0));
  const desiredL = Math.min(100, Math.max(0, Number.isFinite(lightnessPercent) ? lightnessPercent : 50));
  const colorAt = (l: number) => colord({ h, s, l });
  const contrastAt = (l: number) => colorAt(l).contrast(background);

  if (contrastAt(desiredL) >= minContrastRatio) {
    return { color: colorAt(desiredL).toHex(), honored: true };
  }

  // Neither endpoint can necessarily reach minContrastRatio (e.g. a mid-gray
  // background with s=100 can cap below 4.5:1 at both L=0 and L=100 when
  // paired with certain hues) -- fall back to whichever endpoint gets
  // closer rather than claiming a pass that was never reached.
  const blackContrast = contrastAt(0);
  const whiteContrast = contrastAt(100);
  const towardBlack = blackContrast >= whiteContrast;
  if ((towardBlack && blackContrast < minContrastRatio) || (!towardBlack && whiteContrast < minContrastRatio)) {
    return { color: colorAt(towardBlack ? 0 : 100).toHex(), honored: false };
  }

  let passing = towardBlack ? 0 : 100;
  let failing = desiredL;
  for (let step = 0; step < 20; step += 1) {
    const middle = (passing + failing) / 2;
    if (contrastAt(middle) >= minContrastRatio) passing = middle;
    else failing = middle;
  }
  return { color: colorAt(passing).toHex(), honored: false };
}

/**
 * Modulates a single mesh-derived color by the SAME two knobs the WebGL mesh
 * uses in unified mode, so the CSS fallback reproduces the mesh's own look.
 *
 * Saturation is luminance-based, IDENTICAL to the mesh shader's own
 * `applySaturation` (helpers/proceduralColorShader.ts): the grey point is the
 * color's Rec.601 luma (0.299R + 0.587G + 0.114B) and the result is
 * mix(grey, color, chromaAmount), with the same chroma curve
 * (chromaAmount = saturation for 0-1, 1 + (saturation-1)*2.2 above 1, clamped
 * to 2.5). This is what makes saturationPercent = 0 a FAITHFUL grayscale --
 * every color collapses to its own perceived luminance, exactly as the live
 * mesh does at saturation 0.
 *
 * The previous implementation scaled HSL saturation to zero instead, which
 * greyed at HSL *lightness* (= (max+min)/2 of the channels), NOT luminance --
 * so a bright yellow (#ff0, luma ~226) and a dark blue (#00f, luma ~29) both
 * collapsed to the same mid-grey #808080, discarding the colors' very
 * different real brightness. That is the "not a faithful grayscale" the
 * saturation knob produced at zero; this restores a true, mesh-matching
 * grayscale.
 *
 * Darkening and lightening offset each other on one brightness axis. Pure;
 * clamps channels to the 0-255 gamut.
 */
export function quoteMeshBrightnessMultiplier(darkeningPercent: number, lighteningPercent: number): number {
  const darkening = Math.min(100, Math.max(0, Number.isFinite(darkeningPercent) ? darkeningPercent : 0));
  const lightening = Math.min(100, Math.max(0, Number.isFinite(lighteningPercent) ? lighteningPercent : 0));
  return 1 + (lightening - darkening) / 100;
}

export function modulateQuoteMeshColor(
  color: string,
  saturationPercent: number,
  darkeningPercent: number,
  lighteningPercent = 0,
): string {
  const safeSaturation = Math.min(2.5, Math.max(0, Number.isFinite(saturationPercent) ? saturationPercent : 100) / 100);
  const chromaAmount = safeSaturation <= 1 ? safeSaturation : 1 + (safeSaturation - 1) * 2.2;
  const brightnessMultiplier = quoteMeshBrightnessMultiplier(darkeningPercent, lighteningPercent);
  const { r, g, b } = colord(color).toRgb();
  const luma = 0.299 * r + 0.587 * g + 0.114 * b;
  const channel = (c: number) => Math.min(255, Math.max(0, (luma + (c - luma) * chromaAmount) * brightnessMultiplier));
  return colord({ r: channel(r), g: channel(g), b: channel(b) }).toHex();
}

/**
 * Builds the CSS `linear-gradient(...)` used by the 'css' gradient-ink render
 * mode (QuoteConfig.gradientInkRenderMode). `colors` are the three
 * representative colors of the selected card (computeDeckChord's
 * dominant/support/counterpoint, as hex), each modulated by
 * modulateQuoteMeshColor above. `angleDegrees` is emitted verbatim (the caller
 * already normalized it to 0-360). Returns null when there are no colors to
 * work with, so the caller can fall back to the plain quote rather than emit
 * an empty gradient. Pure and deterministic: the same card + knobs always
 * produce the same string.
 */
export function buildQuoteCssInkGradient(
  colors: ReadonlyArray<string>,
  angleDegrees: number,
  saturationPercent: number,
  darkeningPercent: number,
  lighteningPercent = 0,
): string | null {
  const modulated = colors
    .filter(color => typeof color === 'string' && color.trim().length > 0)
    .map(color => modulateQuoteMeshColor(color, saturationPercent, darkeningPercent, lighteningPercent));
  if (modulated.length === 0) return null;
  // A single color still needs two stops for a valid gradient.
  const stops = modulated.length === 1 ? [modulated[0], modulated[0]] : modulated;
  return `linear-gradient(${angleDegrees}deg, ${stops.join(', ')})`;
}

/**
 * Builds the CSS `linear-gradient(...)` for the 'css' render mode from colors
 * Reads the mesh's rendered pixels along the CSS gradient axis inside the
 * padded text box. The shader has already applied saturation, brightness and
 * scale. Reproduce GradientInkSurface's foreground-over-surface compositing
 * and screen/multiply blend to approximate the visible unified glyph color.
 * `direction` must be the same CSS angle used to choose the sample positions.
 */
export function buildQuoteCssInkGradientFromMeshSamples(
  stops: ReadonlyArray<readonly [number, number, number]>,
  direction: string = 'to top right',
  ink?: Pick<QuoteConfig, 'gradientInkSurfaceColor' | 'gradientInkOverlayOpacityPercent' | 'gradientInkTextColor' | 'gradientInkTextOpacityPercent' | 'gradientInkBlendMode'>,
): string | null {
  // GradientInkSurface composites its foreground over its surface, then
  // blends that layer with the mesh. Sampling the mesh alone misses the
  // actual color of a unified-ink glyph, particularly with screen blending.
  const surface = ink ? colord(ink.gradientInkSurfaceColor).toRgb() : null;
  const foreground = ink ? colord(ink.gradientInkTextColor).toRgb() : null;
  const surfaceAlpha = ink ? Math.min(1, Math.max(0, ink.gradientInkOverlayOpacityPercent / 100)) : 0;
  const textAlpha = ink ? Math.min(1, Math.max(0, ink.gradientInkTextOpacityPercent / 100)) : 0;
  const layerAlpha = textAlpha + surfaceAlpha * (1 - textAlpha);
  const hexes = stops
    .filter(stop => Array.isArray(stop) && stop.length >= 3 && stop.every(channel => Number.isFinite(channel)))
    .map(stop => {
      const channels = stop.map((mesh, i) => {
        if (!ink || !surface || !foreground || layerAlpha === 0) return mesh;
        const source = (textAlpha * [foreground.r, foreground.g, foreground.b][i]
          + (1 - textAlpha) * surfaceAlpha * [surface.r, surface.g, surface.b][i]) / layerAlpha;
        // Unified quote ink blends the glyph even with a transparent surface.
        const blended = ink.gradientInkBlendMode === 'multiply'
          ? mesh * source / 255
          : 255 - (255 - mesh) * (255 - source) / 255;
        return mesh * (1 - layerAlpha) + blended * layerAlpha;
      });
      return colord({
        r: Math.min(255, Math.max(0, Math.round(channels[0]))),
        g: Math.min(255, Math.max(0, Math.round(channels[1]))),
        b: Math.min(255, Math.max(0, Math.round(channels[2]))),
      }).toHex();
    });
  if (hexes.length === 0) return null;
  const list = hexes.length === 1 ? [hexes[0], hexes[0]] : hexes;
  return `linear-gradient(${direction}, ${list.join(', ')})`;
}

/**
 * Quote.tsx centers the content block within its figure. Text alignment
 * inside that block is independently configurable. Geometry options control
 * the figure's box proportions, not content placement.
 */
/** CSS mix-blend-mode values for the opt-in whole-card blend (card-blend). */
export type CardBlendMode =
  | 'normal' | 'multiply' | 'screen' | 'overlay' | 'darken' | 'lighten'
  | 'color-dodge' | 'color-burn' | 'hard-light' | 'soft-light' | 'difference'
  | 'exclusion' | 'hue' | 'saturation' | 'color' | 'luminosity';

export const CARD_BLEND_MODES: ReadonlyArray<CardBlendMode> = [
  'normal', 'multiply', 'screen', 'overlay', 'darken', 'lighten',
  'color-dodge', 'color-burn', 'hard-light', 'soft-light', 'difference',
  'exclusion', 'hue', 'saturation', 'color', 'luminosity',
];

export type QuoteSurfaceConfig = {
  enabled: boolean;
  text: string;
  showQuotationMarks: boolean;
  /** Opening-only when false: the closing mark (which flex-ends to the right
   * edge and floats far from short text) is suppressed while the opening mark
   * still reads as the "quotable voice" cue. Independent of showQuotationMarks
   * so a role can keep the opening accent without the trailing glyph. */
  showClosingQuotationMark: boolean;
  /** Size, opacity and placement for the opening ("“") and closing
   * ("”") marks, fully segregated -- every field below has an
   * independent `opening*`/`closing*` pair, matching the existing asymmetry
   * this component already has between the two (different default size,
   * and only the closing mark self-aligns to the trailing edge). Defaults
   * reproduce the prior hardcoded values exactly (3em/2.5em font-size,
   * 0.68 opacity) -- a purely additive refinement, not a behavior change,
   * until an operator moves one of these off its default.
   *
   * Size stays in `em` (matching the glyph's own existing relative-to-
   * figure-font-size unit, not a new one) -- it was never asked to become a
   * Tailwind token, and there is no "quotation mark size" scale in
   * Tailwind's theme to migrate onto (unlike leading/tracking/borderRadius
   * elsewhere in this file, which genuinely do have a matching Tailwind
   * scale). Clamped to 0.1-60em -- the operator ask was "tolerate 500% more
   * than the current limit": the prior ceiling was 10em, and 10 + 500% of
   * 10 = 60.
   *
   * Offset X/Y are now ABSOLUTE placement, not a relative nudge: the mark is
   * `position: absolute` within the figure (QuoteConfig's own doc comment
   * above already establishes the figure as the unconditional center/center
   * container), and X/Y are percentages of the FIGURE's own box -- the
   * operator's own explicit definition: "0 in x means the quotation mark
   * starts from the left start of the quote container, y = 0 means it
   * starts at the top of the quote container." This replaced an earlier
   * version where X/Y were a `transform: translate()` nudge relative to the
   * mark's own flex-flow position (0 meant "unchanged from today's
   * position") -- a deliberate redefinition per that explicit instruction,
   * not an accidental one; every existing caller with marks enabled will
   * render its mark(s) in a different spot than before unless its own X/Y
   * happens to still describe a sensible position under the new
   * container-relative meaning (see the ROLE presets below, which were
   * re-tuned alongside this change). Because the mark is removed from the
   * figure's flex flow entirely, its size/position can no longer compress
   * or otherwise affect the quote TEXT's own configured padding (the
   * separate operator ask "the padding of the quote must be respected even
   * with the quotation mark enabled") -- the text keeps exactly the padding
   * configured below regardless of what the marks are doing. Negative
   * values and values past 100 are valid and expected (move past the
   * container's own edges in any direction); see normalizeQuoteConfig's own
   * comment for the exact bounds chosen. */
  openingMarkSizeEm: number;
  openingMarkOpacityPercent: number;
  openingMarkOffsetXPercent: number;
  openingMarkOffsetYPercent: number;
  closingMarkSizeEm: number;
  closingMarkOpacityPercent: number;
  closingMarkOffsetXPercent: number;
  closingMarkOffsetYPercent: number;
  /** Shared (not segregated per opening/closing -- a mismatched pair of
   * typefaces for the two marks of the same punctuation device would read
   * as a typographic mistake, not a design choice) font family for both
   * quotation marks, as a Tailwind `fontFamily` token -- the same
   * mechanism/scale textFontFamily and authorFontFamily already use. Was
   * hardcoded to `var(--site-font-serif)` in Quote.module.css; that
   * hardcoded serif is still the default token value below, so this is
   * additive, not a visual change, until an operator picks `font-sans`. */
  markFontFamily: TailwindTokenValue<'fontFamily'>;
  /** Whether the figure clips content that extends past its own box
   * (`overflow: hidden`) or lets it bleed past the edges (`overflow:
   * visible`, the default/prior behavior -- the figure never set its own
   * `overflow` before this field existed). Primarily meaningful alongside
   * the quotation marks' own absolute placement above: a mark pushed well
   * past 0-100% (or an oversized one) can now be deliberately cropped at
   * the figure's own edge instead of always bleeding past it. Off by
   * default so every existing call site renders unchanged. */
  clipOverflowEnabled: boolean;
  showAuthor: boolean;
  author: string;
  /** Reading measure in `ch`, applied as the body's max-inline-size. Role-
   * dependent: display Statements want a tight ~34ch; reading Passages want
   * ~60ch so a 40-90 word paragraph doesn't over-rag. Was a hardcoded 34ch
   * in Quote.module.css before this field existed.
   *
   * Deliberately NOT migrated onto the Tailwind token system (commit
   * 7796da4): Tailwind's own `maxWidth` scale is rem/viewport-based (e.g.
   * `max-w-prose` = 65ch is its only ch-flavored stop), not a general
   * character-count scale -- forcing this field onto it would trade away
   * the exact "N characters per line" typographic intent that's the entire
   * reason this field exists (reading-measure research targets character
   * counts, not rem widths) for a handful of mismatched, mostly-irrelevant
   * stops. Reviewed and kept as a plain number by design, not an oversight. */
  measureCh: number;
  /** Per-breakpoint width override for the quote body, as a Tailwind `maxWidth`
   * token. `auto` (the default) falls back to the character `measureCh` above;
   * any real token overrides it -- including `max-w-full` for 100% of the
   * container, the `max-w-percent-*` steps, and the rem scale. md/lg inherit the
   * smaller breakpoint while left at `auto`. */
  measureMaxWidth: TailwindTokenValue<'maxWidth'>;
  measureMaxWidthMd: TailwindTokenValue<'maxWidth', 'md'>;
  measureMaxWidthLg: TailwindTokenValue<'maxWidth', 'lg'>;
  /** Line-height for the body text, as a Tailwind `lineHeight` token
   * (leading-none/tight/snug/normal/relaxed/loose -- commit 7796da4's
   * generated-token system, components/Panel/config/tailwindFields.ts,
   * same as textSize/paddingX below). Display roles stay tight
   * (leading-tight); reading roles open up (leading-normal/-relaxed)
   * because leading must grow with word count. Was a raw unitless float
   * (and before that a hardcoded 1.26 in Quote.module.css) until this field
   * was migrated onto the token system -- the trade is discrete steps
   * (6 tokens) instead of a continuous number, in exchange for the same
   * generated/validated/panel-integrated machinery every other sizing field
   * here already uses. */
  leading: TailwindTokenValue<'lineHeight'>;
  /** Tracking: letter-spacing, as a Tailwind `letterSpacing` token
   * (tracking-tighter/tighter/tight/normal/wide/wider/widest). Was a raw
   * em number (and before that a hardcoded -0.025em in Quote.module.css)
   * until migrated onto the token system for the same reason as `leading`
   * above. */
  tracking: TailwindTokenValue<'letterSpacing'>;
  /** Applied to the passage only, independent of the gradient ink's color alpha. */
  textOpacityPercent: number;
  /** Alignment of the passage block and its lines within the quote figure. */
  textAlign: 'start' | 'center' | 'end';
  /** CSS text-wrap for the body paragraph. 'pretty' (default -- today's
   * hardcoded value) avoids orphans/ugly rags; 'balance' evens out line
   * lengths (reads well for a short 2-4 line pull quote); 'wrap' is the
   * plain greedy algorithm. Part of "paragraph formatting for enhanced
   * reading" alongside leading/tracking/measure. */
  textWrap: 'wrap' | 'balance' | 'pretty';
  /** CSS hyphens for the body paragraph. True (`hyphens: auto`) lets the
   * browser hyphenate long words at narrow measures/paddingX, reducing
   * ragged-right gaps; false (default) preserves today's behavior
   * (`hyphens: none`, no automatic hyphenation). */
  hyphens: boolean;
  /** Opt-in: when true, the figure's own background and (derived) ink color
   * come from the generated QUOTE_PALETTE_SIZE-swatch palette below
   * (paletteColorIndex/paletteSaturationPercent/paletteLightnessPercent)
   * instead of whatever background a host sets via Quote's own `style` prop.
   * Off by default so every existing call site -- the wall's masonry quotes,
   * its standalone editorial quote, and the three ROLE presets below, all of
   * which supply their own host-level background/ink today -- renders
   * unchanged until explicitly opted in. */
  paletteBackgroundEnabled: boolean;
  /** 1-based index (1..QUOTE_PALETTE_SIZE) selecting which generated swatch
   * is used as the figure's background when paletteBackgroundEnabled is on.
   *
   * paletteColorIndex and the four saturation/lightness percentages below
   * are deliberately NOT migrated onto the Tailwind token system (commit
   * 7796da4): they are colord() HSL color-generation parameters (inputs to
   * generateQuotePalette/deriveQuoteTextColor above), not CSS dimension/
   * typography values Tailwind's theme scales describe. There is no
   * "Tailwind saturation scale" to map onto. Reviewed and kept as plain
   * numbers by design. */
  paletteColorIndex: number;
  /** HSL saturation (0-100) applied uniformly to every generated swatch.
   * Lower reads as pastel/muted; higher reads as vivid. Independent of
   * paletteLightnessPercent, so "pastel" (low saturation + high lightness)
   * and "dark & moody" (low saturation + low lightness) are both reachable
   * from the same two knobs. */
  paletteSaturationPercent: number;
  /** HSL lightness (0-100) applied uniformly to every generated swatch --
   * how light or dark the whole palette reads. */
  paletteLightnessPercent: number;
  /** Text ink saturation (0-100, "chroma") when paletteBackgroundEnabled is
   * on. Independent from paletteSaturationPercent above -- the background
   * swatch and the text ink are modulated by two SEPARATE knobs, not the
   * same one, so e.g. a vivid background can still take muted/grayscale
   * text or vice versa. The ink's hue is still derived from the chosen
   * background swatch (see deriveQuoteTextColor below) -- only saturation
   * and lightness are independently operator-set. */
  textColorSaturationPercent: number;
  /** Text ink lightness/darkness (0-100) when paletteBackgroundEnabled is
   * on. Honored exactly whenever the result still clears WCAG AA contrast
   * (4.5:1) against the chosen background; otherwise nudged the minimum
   * distance needed to pass -- see deriveQuoteTextColor's own doc comment.
   * Independent from paletteLightnessPercent (the background's own
   * lightness). */
  textColorLightnessPercent: number;
  /** Box geometry. 'auto' (default) keeps the figure's height purely
   * content-driven -- exactly today's behavior, which the wall's masonry
   * grid depends on for its irregular, varied-height rhythm (a uniform
   * shape there would flatten it back into an ordinary aligned grid, a
   * previously-fixed regression -- see WALL_QUOTE_INTERLEAVE_WEIGHTS's own
   * doc comment in pages/wall.tsx). 'square'/'portrait'/'landscape' instead
   * give the figure a fixed CSS aspect-ratio, computed from whatever width
   * the host already gives it (so the shape stays fluid/responsive, not a
   * hard pixel size) -- an explicit per-instance opt-in, not a new default,
   * so every existing call site renders unchanged until a host picks one.
   * cardAspectRatioEnabled takes precedence when enabled.
   * Content placement is independent of this field; text alignment is
   * controlled by textAlign. */
  geometryShape: 'auto' | 'square' | 'portrait' | 'landscape';
  /** Keep the quote surface at the quote's portrait aspect ratio (3:4 by
   * default). Unlike geometryShape's preferred ratio, this bounds the box
   * even when copy is long; overflowing content remains scrollable. The
   * host may supply its live card ratio to Quote when it differs. */
  cardAspectRatioEnabled: boolean;
  /** When a source heading is supplied inside the quote, place it at the
   * figure's padded top edge while centering the quote content in the space
   * below. Off keeps the heading in the centered content group. */
  sourceHeadingTopAligned: boolean;
  /** Optional heading copy. Empty uses the host's source heading. */
  sourceHeadingText: string;
  sourceHeadingFontSize: TailwindTokenValue<'fontSize'>;
  sourceHeadingFontSizeMd: TailwindTokenValue<'fontSize', 'md'>;
  sourceHeadingFontSizeLg: TailwindTokenValue<'fontSize', 'lg'>;
  sourceHeadingTracking: TailwindTokenValue<'letterSpacing'>;
  sourceHeadingTextTransform: TailwindTokenValue<'textTransform'>;
  sourceHeadingOpacityPercent: number;
  sourceHeadingContentGap: TailwindTokenValue<'marginBottom'>;
  headingAlign: 'start' | 'center' | 'end';
  /** Opt-in corner rounding on the figure's own root box. Off by default
   * (today's sharp-cornered behavior) so every existing call site -- the
   * wall's masonry quotes (which already apply their OWN rounding via a
   * host `className`, e.g. `rounded-[1.25rem]`), the standalone editorial
   * quote, and the three ROLE presets below -- renders unchanged.
   * Independent of `className`-supplied rounding: a host can still round
   * the root via its own class regardless of this flag; this is the
   * config-driven alternative for hosts (like quote-lab) that want rounding
   * to be a live, operator-tunable property of the quote itself. Matches
   * Card's own `cardRadius` vocabulary (rounded-none/md/lg/xl/2xl/full,
   * components/CtaButton/config/registered.ts's CtaButtonRadius) for visual
   * parity, though wired through the generated token system here rather
   * than that older hand-rolled enum. */
  borderRadiusEnabled: boolean;
  /** Corner radius, as a Tailwind `borderRadius` token, applied only when
   * borderRadiusEnabled is true. Was a raw px number until migrated onto
   * the token system (scripts/tailwind-config-fields.manifest.js). */
  borderRadius: TailwindTokenValue<'borderRadius'>;
  /** Per-breakpoint corner radius (mobile is `borderRadius` itself). Lets the
   * corners differ by breakpoint, e.g. square (rounded-none) on an edge-to-edge
   * mobile container and rounded on tablet/desktop. */
  borderRadiusMd: TailwindTokenValue<'borderRadius', 'md'>;
  borderRadiusLg: TailwindTokenValue<'borderRadius', 'lg'>;
  /** Opt-in proximity-driven elevation: the lift/tilt/scale transform the
   * shared card-lift physics produces (components/proximity/useCardLiftPhysics).
   * Independent of shadowEnabled below -- the two were previously coupled (any
   * host that provided lift physics always got BOTH the transform AND the cast
   * shadow). They are now separately switchable, so a quote can lift without a
   * shadow, cast a shadow without lifting, do both, or do neither. Only has any
   * effect when the host provides lift physics (the `liftPhysics` prop supplies
   * the tuning); with no host physics the quote stays flat regardless. */
  elevationEnabled: boolean;
  /** Opt-in cast shadow: the elevation drop shadow
   * (components/proximity/useElevationShadow). Independent of elevationEnabled
   * above -- see its doc comment. When on without elevation, the shadow still
   * reacts to pointer proximity (it just drives no transform); when off, the
   * shadow fades fully transparent even while the element lifts. Only has any
   * effect when the host provides lift physics. */
  shadowEnabled: boolean;
  /** Opt-in: applies a mix-blend-mode to the WHOLE quote so it blends against
   * its backdrop. The backdrop is whatever is painted behind the quote -- the
   * intended pattern is to nest this (blended) quote inside another quote that
   * provides the fill (e.g. a solid-fill quote below), reusing the quote we
   * already have instead of a bespoke underlay. Inherited by every editorial
   * quote type via EditorialQuoteConfig. */
  cardBlendEnabled: boolean;
  /** The mix-blend-mode applied to the whole quote against its backdrop. */
  cardBlendMode: CardBlendMode;
  /** Opt-in: paints the quote with a plain solid background color, independent
   * of the palette/gradient backgrounds. Lets any quote act as a solid-fill
   * card -- for example the backdrop a separate, blended quote is nested
   * inside. Inherited by every editorial quote type. */
  solidFillEnabled: boolean;
  solidFillColor: string;
  textColorSource: QuoteTextColorSource;
  gradientInkEnabled: boolean;
  /** When gradientInkEnabled is on, selects HOW the deck gradient paints the
   * text -- mutually exclusive by construction (one enum, not two competing
   * booleans):
   *   'unified' -- the live WebGL mesh backdrop plus the screen/multiply
   *     overlay surface the text sits on (the original behavior).
   *   'css'     -- a CSS linear-gradient clipped to the glyphs, sampled from a
   *     hidden frozen copy of the selected card mesh at the padded text box.
   *     Deck-chord colors are used until sampling is available. Only the text
   *     is painted; the sample canvas is invisible. Mesh modulation affects
   *     the sample and gradientInkCssAngleDegrees sets its axis. Inert unless
   *     gradientInkEnabled is on. */
  gradientInkRenderMode: 'unified' | 'css';
  /** Opt-in pointer-driven holographic response on the live gradient mesh. */
  gradientInkHologramEnabled: boolean;
  /** 100 = card response; 0 = no displacement/color flash. */
  gradientInkHologramStrengthPercent: number;
  /** Darkens the mesh in the shader, before text-layer blending. */
  gradientInkMeshDarkeningPercent: number;
  /** Brightens the mesh before text-layer blending; offsets darkening. */
  gradientInkMeshLighteningPercent: number;
  /** 100 = the deck's saturation; 0 = monochrome. */
  gradientInkMeshSaturationPercent: number;
  /** Preserved overall zoom for existing quote designs. The panel exposes
   * the X/Y multipliers below instead of editing this saved value directly. */
  gradientInkMeshScale: number;
  /** Independent axis multipliers on the existing mesh zoom. 1 preserves
   * the saved gradient; values below/above 1 tighten/broaden that axis. */
  gradientInkMeshScaleX: number;
  gradientInkMeshScaleY: number;
  /** Linear-gradient angle in degrees (0-360) for the 'css' render mode. Uses
   * the CSS linear-gradient convention: 0deg points to the top, 90deg to the
   * right. Only read in CSS mode. */
  gradientInkCssAngleDegrees: number;
  gradientInkSourceCard: UnifiedGradientSourceCard;
  gradientInkBaseColor: string;
  gradientInkSurfaceColor: string;
  gradientInkTextColor: string;
  gradientInkBlendMode: 'screen' | 'multiply';
  /** Opacity (0-100) of the text-layer surface (gradientInkSurfaceColor) over
   * the mesh. The glyphs retain the selected screen/multiply blend even when
   * this surface reaches 0; this control never changes render mode. */
  gradientInkOverlayOpacityPercent: number;
  /** Opacity (0-100) of the quote/author text ink color (gradientInkTextColor)
   * within gradient-ink mode. 100 (default) preserves today's fully-opaque
   * text. Lower values let more of the blended backdrop show through the text
   * itself, independent of the overlay's own opacity above. */
  gradientInkTextOpacityPercent: number;
  /** Opt-in border on the unified-ink OVERLAY (GradientInkSurface's content
   * layer -- the text-layer surface that sits over the live mesh). Only has
   * any effect in unified-ink mode (gradientInkEnabled && gradientInkRenderMode
   * === 'unified' with a live deck); off by default so every existing unified
   * quote renders unchanged until an operator opts in. */
  gradientInkBorderEnabled: boolean;
  /** Border thickness, as a Tailwind `borderWidth` token (border-0/border/
   * border-2/border-4/border-8 -- commit 7796da4's generated token system,
   * the same mechanism borderRadius/leading/tracking/textSize already use in
   * this file). Resolved to its CSS length and applied inline on the overlay;
   * only when gradientInkBorderEnabled. */
  gradientInkBorderWidth: TailwindTokenValue<'borderWidth'>;
  /** CSS border-style for the overlay border. A plain CSS enum, NOT a Tailwind
   * token: Tailwind's own border-style utilities only cover solid/dashed/
   * dotted/double/hidden/none, but the operator explicitly asked for `inset`
   * (and, by extension, the other 3D CSS border styles outset/groove/ridge),
   * which Tailwind's theme carries no utility for -- so these are emitted as
   * raw CSS border-style values instead of forced onto a scale that can't
   * express them. */
  gradientInkBorderStyle: 'solid' | 'dashed' | 'dotted' | 'double' | 'groove' | 'ridge' | 'inset' | 'outset';
  /** Overlay border color -- an arbitrary color (color picker), matching the
   * other gradientInk* color knobs (surface/text/base) rather than Tailwind's
   * fixed borderColor palette, so any hex is reachable. */
  gradientInkBorderColor: string;
  textSize: TailwindTokenValue<'fontSize'>;
  textSizeMd: TailwindTokenValue<'fontSize', 'md'>;
  textSizeLg: TailwindTokenValue<'fontSize', 'lg'>;
  authorSize: TailwindTokenValue<'fontSize'>;
  authorSizeMd: TailwindTokenValue<'fontSize', 'md'>;
  authorSizeLg: TailwindTokenValue<'fontSize', 'lg'>;
  textFontFamily: TailwindTokenValue<'fontFamily'>;
  textFontWeight: TailwindTokenValue<'fontWeight'>;
  textTransform: TailwindTokenValue<'textTransform'>;
  authorFontFamily: TailwindTokenValue<'fontFamily'>;
  /** Space outside the quote, independent of its internal padding. */
  marginTop: TailwindTokenValue<'marginTop'>;
  marginTopMd: TailwindTokenValue<'marginTop', 'md'>;
  marginTopLg: TailwindTokenValue<'marginTop', 'lg'>;
  marginBottom: TailwindTokenValue<'marginBottom'>;
  marginBottomMd: TailwindTokenValue<'marginBottom', 'md'>;
  marginBottomLg: TailwindTokenValue<'marginBottom', 'lg'>;
  /** The figure's own box padding — literal Tailwind padding utilities,
   * applied directly as classes (see Quote.tsx), not a cqw-based CSS custom
   * property. Replaces the old fixed `padding: 10cqw` (and its `7cqw`
   * long-form variant) now that the figure grows to fit its content instead
   * of being clamped into a near-square box.
   *
   * Segregated per side (top/right/bottom/left, each with its own base/Md/
   * Lg trio) rather than the earlier combined paddingX/paddingY pairs
   * (operator ask) -- components/Panel/config/tailwindFields.ts's generated
   * token registry already carries all four as independent utility
   * families (paddingTop/paddingRight/paddingBottom/paddingLeft,
   * scripts/tailwind-config-fields.manifest.js), so this reuses existing
   * generated machinery rather than inventing a new one. */
  paddingTop: TailwindTokenValue<'paddingTop'>;
  paddingTopMd: TailwindTokenValue<'paddingTop', 'md'>;
  paddingTopLg: TailwindTokenValue<'paddingTop', 'lg'>;
  paddingRight: TailwindTokenValue<'paddingRight'>;
  paddingRightMd: TailwindTokenValue<'paddingRight', 'md'>;
  paddingRightLg: TailwindTokenValue<'paddingRight', 'lg'>;
  paddingBottom: TailwindTokenValue<'paddingBottom'>;
  paddingBottomMd: TailwindTokenValue<'paddingBottom', 'md'>;
  paddingBottomLg: TailwindTokenValue<'paddingBottom', 'lg'>;
  paddingLeft: TailwindTokenValue<'paddingLeft'>;
  paddingLeftMd: TailwindTokenValue<'paddingLeft', 'md'>;
  paddingLeftLg: TailwindTokenValue<'paddingLeft', 'lg'>;
};

export type ParentQuoteFields = {
  [K in keyof QuoteSurfaceConfig as `parentQuote${Capitalize<K & string>}`]: QuoteSurfaceConfig[K]
};
export type QuoteConfig = QuoteSurfaceConfig & ParentQuoteFields;

export function parentQuoteKey(key: keyof QuoteSurfaceConfig): keyof ParentQuoteFields {
  return `parentQuote${key[0].toUpperCase()}${key.slice(1)}` as keyof ParentQuoteFields;
}
export function parentQuoteFields(config: QuoteSurfaceConfig): ParentQuoteFields {
  return Object.fromEntries(Object.entries(config).map(([key, value]) => [parentQuoteKey(key as keyof QuoteSurfaceConfig), value])) as ParentQuoteFields;
}

/** One spacing token for headings above or below quote content. */
export function quoteSourceHeadingGapStyle(config: QuoteConfig, placement: 'before' | 'after') {
  const gap = tailwindTokenCssValue('marginBottom', 'base', config.sourceHeadingContentGap);
  return placement === 'before' ? { marginBottom: gap } : { marginTop: gap };
}

export const DEFAULT_QUOTE_SURFACE_CONFIG: QuoteSurfaceConfig = {
  enabled: true,
  text: 'Abstract Voyage is where I follow the questions behind that work.',
  showQuotationMarks: false,
  showClosingQuotationMark: false,
  // Opening mark placed near the figure's own top-left, closing mark near
  // the bottom-right -- sensible starting positions under the NEW
  // container-relative placement semantics (0%/0% = flush at the figure's
  // own top-left corner), roughly approximating where the two marks used
  // to sit under the old flex-flow layout (opening above the text, closing
  // trailing after it) without being pinned exactly to the corners.
  openingMarkSizeEm: 4,
  openingMarkOpacityPercent: 68,
  openingMarkOffsetXPercent: 2,
  openingMarkOffsetYPercent: 5,
  closingMarkSizeEm: 9.3,
  closingMarkOpacityPercent: 22,
  closingMarkOffsetXPercent: 89,
  closingMarkOffsetYPercent: 75,
  markFontFamily: 'font-sans',
  clipOverflowEnabled: true,
  showAuthor: false,
  author: 'Manuel Cerdas',
  measureCh: 34,
  measureMaxWidth: 'auto',
  measureMaxWidthMd: 'auto',
  measureMaxWidthLg: 'auto',
  leading: 'leading-normal',
  tracking: 'tracking-tight',
  textOpacityPercent: 100,
  textAlign: 'center',
  textWrap: 'balance',
  hyphens: false,
  paletteBackgroundEnabled: true,
  paletteColorIndex: 5,
  // A soft, legible editorial starting point -- pastel (low saturation,
  // high lightness), fully operator-adjustable toward vivid or dark.
  paletteSaturationPercent: 100,
  paletteLightnessPercent: 84,
  // Dark, moderately-tinted ink against the light pastel default background
  // above -- independent knobs, not copied from the background's own S/L.
  textColorSaturationPercent: 69,
  textColorLightnessPercent: 40,
  geometryShape: 'auto',
  cardAspectRatioEnabled: false,
  sourceHeadingTopAligned: false,
  sourceHeadingText: '',
  sourceHeadingFontSize: 'text-sm',
  sourceHeadingFontSizeMd: 'md:text-sm',
  sourceHeadingFontSizeLg: 'lg:text-sm',
  sourceHeadingTracking: 'tracking-normal',
  sourceHeadingTextTransform: 'normal-case',
  sourceHeadingOpacityPercent: 100,
  sourceHeadingContentGap: 'mb-0',
  headingAlign: 'center',
  borderRadiusEnabled: true,
  borderRadius: 'rounded-2xl',
  borderRadiusMd: 'md:rounded-2xl',
  borderRadiusLg: 'lg:rounded-2xl',
  // Both on so a host already providing lift physics (the wall, quote-lab)
  // keeps today's coupled elevation+shadow look; each is now independently
  // switchable off.
  elevationEnabled: false,
  shadowEnabled: false,
  cardBlendEnabled: false,
  cardBlendMode: 'multiply',
  solidFillEnabled: false,
  solidFillColor: '#ffffff',
  textColorSource: '1',
  gradientInkEnabled: true,
  // Preserves the original behavior (live mesh + overlay) as the default
  // render mode; 'css' is the new, opt-in text-only fallback.
  gradientInkRenderMode: 'unified',
  gradientInkHologramEnabled: true,
  gradientInkHologramStrengthPercent: 13,
  gradientInkMeshDarkeningPercent: 37,
  gradientInkMeshLighteningPercent: 0,
  gradientInkMeshSaturationPercent: 77,
  gradientInkMeshScale: 2.85,
  gradientInkMeshScaleX: 1,
  gradientInkMeshScaleY: 1,
  gradientInkCssAngleDegrees: 0,
  gradientInkSourceCard: '2',
  gradientInkBaseColor: '#000000',
  gradientInkSurfaceColor: '#ebf5ff',
  gradientInkTextColor: '#305882',
  gradientInkBlendMode: 'screen',
  gradientInkOverlayOpacityPercent: 43,
  gradientInkTextOpacityPercent: 100,
  // Off by default (opt-in); the width/style/color below are the starting
  // values an operator sees the moment they enable it -- a visible 2px solid
  // white frame.
  gradientInkBorderEnabled: true,
  gradientInkBorderWidth: 'border-2',
  gradientInkBorderStyle: 'solid',
  gradientInkBorderColor: '#f3f8ff',
  // Uniform across tiers by default -- same rendered size as before this
  // field was segregated by breakpoint, just now independently tunable.
  textSize: 'text-2xl',
  textSizeMd: 'md:text-2xl',
  textSizeLg: 'lg:text-2xl',
  authorSize: 'text-base',
  authorSizeMd: 'md:text-base',
  authorSizeLg: 'lg:text-base',
  textFontFamily: 'font-sans',
  textFontWeight: 'font-normal',
  textTransform: 'normal-case',
  authorFontFamily: 'font-sans',
  marginTop: 'mt-0',
  marginTopMd: 'md:mt-0',
  marginTopLg: 'lg:mt-0',
  marginBottom: 'mb-0',
  marginBottomMd: 'md:mb-0',
  marginBottomLg: 'lg:mb-0',
  // Equivalent to the prior px-6/md:px-10/lg:px-12 + py-8/md:py-10/lg:py-12
  // pairs, split onto the 4 independent sides (same numeric Tailwind
  // spacing-scale step on both sides of each former pair).
  paddingTop: 'pt-0',
  paddingTopMd: 'md:pt-10',
  paddingTopLg: 'lg:pt-10',
  paddingRight: 'pr-6',
  paddingRightMd: 'md:pr-10',
  paddingRightLg: 'lg:pr-10',
  paddingBottom: 'pb-8',
  paddingBottomMd: 'md:pb-10',
  paddingBottomLg: 'lg:pb-10',
  paddingLeft: 'pl-6',
  paddingLeftMd: 'md:pl-10',
  paddingLeftLg: 'lg:pl-10',
};

export const DEFAULT_PARENT_QUOTE_SURFACE_CONFIG: QuoteSurfaceConfig = {
  ...DEFAULT_QUOTE_SURFACE_CONFIG,
  text: '', sourceHeadingText: '', showQuotationMarks: false, showAuthor: false,
  cardBlendEnabled: false, gradientInkEnabled: false, paletteBackgroundEnabled: false,
  solidFillEnabled: true, solidFillColor: '#ffffff',
  paddingTop: 'pt-4', paddingRight: 'pr-4', paddingBottom: 'pb-4', paddingLeft: 'pl-4',
  paddingTopMd: 'md:pt-4', paddingRightMd: 'md:pr-4', paddingBottomMd: 'md:pb-4', paddingLeftMd: 'md:pl-4',
  paddingTopLg: 'lg:pt-4', paddingRightLg: 'lg:pr-4', paddingBottomLg: 'lg:pb-4', paddingLeftLg: 'lg:pl-4',
};
export const DEFAULT_QUOTE_CONFIG: QuoteConfig = {
  ...DEFAULT_QUOTE_SURFACE_CONFIG,
  ...parentQuoteFields(DEFAULT_PARENT_QUOTE_SURFACE_CONFIG),

  parentQuoteText: 'Abstract Voyage is where I follow the questions behind that work.',
};

export function normalizeQuoteConfig(value: Partial<QuoteConfig> | undefined): QuoteConfig {
  const parentRaw = Object.fromEntries(Object.keys(DEFAULT_QUOTE_SURFACE_CONFIG).flatMap(key => {
    const parentValue = value?.[parentQuoteKey(key as keyof QuoteSurfaceConfig)];
    return parentValue === undefined ? [] : [[key, parentValue]];
  })) as Partial<QuoteSurfaceConfig>;
  return {
    ...normalizeQuoteSurfaceConfig(value),
    ...parentQuoteFields(normalizeQuoteSurfaceConfig({ ...DEFAULT_PARENT_QUOTE_SURFACE_CONFIG, ...parentRaw })),
  };
}

export function normalizeQuoteSurfaceConfig(value: Partial<QuoteSurfaceConfig> | undefined): QuoteSurfaceConfig {

  const source = value?.textColorSource;
  return {
    enabled: typeof value?.enabled === 'boolean' ? value.enabled : DEFAULT_QUOTE_CONFIG.enabled,
    text: typeof value?.text === 'string' && value.text.trim()
      ? value.text.trim() : DEFAULT_QUOTE_CONFIG.text,
    showQuotationMarks: typeof value?.showQuotationMarks === 'boolean'
      ? value.showQuotationMarks : DEFAULT_QUOTE_CONFIG.showQuotationMarks,
    showClosingQuotationMark: typeof value?.showClosingQuotationMark === 'boolean'
      ? value.showClosingQuotationMark : DEFAULT_QUOTE_CONFIG.showClosingQuotationMark,
    // Size: clamped to a strictly-positive, generously-bounded range. Upper
    // bound raised from 10em to 60em (operator ask: "tolerate 500% more
    // than the current limit" -- 10 + 500% of 10 = 60); 0 or negative would
    // make the mark invisible/inverted, which is never a sensible "size".
    openingMarkSizeEm: typeof value?.openingMarkSizeEm === 'number' && Number.isFinite(value.openingMarkSizeEm)
      ? Math.max(0.1, Math.min(60, value.openingMarkSizeEm)) : DEFAULT_QUOTE_CONFIG.openingMarkSizeEm,
    closingMarkSizeEm: typeof value?.closingMarkSizeEm === 'number' && Number.isFinite(value.closingMarkSizeEm)
      ? Math.max(0.1, Math.min(60, value.closingMarkSizeEm)) : DEFAULT_QUOTE_CONFIG.closingMarkSizeEm,
    // Opacity: a real 0-100 percent, unlike the offsets below.
    openingMarkOpacityPercent: typeof value?.openingMarkOpacityPercent === 'number' && Number.isFinite(value.openingMarkOpacityPercent)
      ? Math.max(0, Math.min(100, value.openingMarkOpacityPercent)) : DEFAULT_QUOTE_CONFIG.openingMarkOpacityPercent,
    closingMarkOpacityPercent: typeof value?.closingMarkOpacityPercent === 'number' && Number.isFinite(value.closingMarkOpacityPercent)
      ? Math.max(0, Math.min(100, value.closingMarkOpacityPercent)) : DEFAULT_QUOTE_CONFIG.closingMarkOpacityPercent,
    // Offsets: signed, NOT a 0-100-only percent -- 0 is the figure's own
    // top-left corner (operator's own definition) and values past 100 or
    // below 0 are valid, expected placements past the figure's own edges in
    // either direction. Bounded to -300..400: generous enough to push a
    // mark several box-widths past any edge (genuine creative placement,
    // e.g. a huge decorative mark mostly off-canvas) while still catching a
    // stray typo (an accidental extra digit) landing somewhere absurd.
    openingMarkOffsetXPercent: typeof value?.openingMarkOffsetXPercent === 'number' && Number.isFinite(value.openingMarkOffsetXPercent)
      ? Math.max(-300, Math.min(400, value.openingMarkOffsetXPercent)) : DEFAULT_QUOTE_CONFIG.openingMarkOffsetXPercent,
    openingMarkOffsetYPercent: typeof value?.openingMarkOffsetYPercent === 'number' && Number.isFinite(value.openingMarkOffsetYPercent)
      ? Math.max(-300, Math.min(400, value.openingMarkOffsetYPercent)) : DEFAULT_QUOTE_CONFIG.openingMarkOffsetYPercent,
    closingMarkOffsetXPercent: typeof value?.closingMarkOffsetXPercent === 'number' && Number.isFinite(value.closingMarkOffsetXPercent)
      ? Math.max(-300, Math.min(400, value.closingMarkOffsetXPercent)) : DEFAULT_QUOTE_CONFIG.closingMarkOffsetXPercent,
    closingMarkOffsetYPercent: typeof value?.closingMarkOffsetYPercent === 'number' && Number.isFinite(value.closingMarkOffsetYPercent)
      ? Math.max(-300, Math.min(400, value.closingMarkOffsetYPercent)) : DEFAULT_QUOTE_CONFIG.closingMarkOffsetYPercent,
    markFontFamily: normalizeTailwindToken({ utility: 'fontFamily', breakpoint: 'base', value: value?.markFontFamily, fallback: DEFAULT_QUOTE_CONFIG.markFontFamily }),
    clipOverflowEnabled: value?.clipOverflowEnabled === true,
    showAuthor: value?.showAuthor === true,
    author: typeof value?.author === 'string' && value.author.trim()
      ? value.author.trim() : DEFAULT_QUOTE_CONFIG.author,
    measureCh: typeof value?.measureCh === 'number' && Number.isFinite(value.measureCh)
      ? Math.max(16, Math.min(90, value.measureCh)) : DEFAULT_QUOTE_CONFIG.measureCh,
    measureMaxWidth: normalizeTailwindToken({ utility: 'maxWidth', breakpoint: 'base', value: value?.measureMaxWidth, fallback: DEFAULT_QUOTE_CONFIG.measureMaxWidth }),
    measureMaxWidthMd: normalizeTailwindToken({ utility: 'maxWidth', breakpoint: 'md', value: value?.measureMaxWidthMd, fallback: DEFAULT_QUOTE_CONFIG.measureMaxWidthMd }),
    measureMaxWidthLg: normalizeTailwindToken({ utility: 'maxWidth', breakpoint: 'lg', value: value?.measureMaxWidthLg, fallback: DEFAULT_QUOTE_CONFIG.measureMaxWidthLg }),
    leading: normalizeTailwindToken({ utility: 'lineHeight', breakpoint: 'base', value: value?.leading, fallback: DEFAULT_QUOTE_CONFIG.leading }),
    tracking: normalizeTailwindToken({ utility: 'letterSpacing', breakpoint: 'base', value: value?.tracking, fallback: DEFAULT_QUOTE_CONFIG.tracking }),
    textOpacityPercent: typeof value?.textOpacityPercent === 'number' && Number.isFinite(value.textOpacityPercent)
      ? Math.max(0, Math.min(100, value.textOpacityPercent)) : DEFAULT_QUOTE_CONFIG.textOpacityPercent,
    textAlign: value?.textAlign === 'start' || value?.textAlign === 'end' ? value.textAlign : 'center',
    textWrap: value?.textWrap === 'wrap' || value?.textWrap === 'balance' || value?.textWrap === 'pretty'
      ? value.textWrap : DEFAULT_QUOTE_CONFIG.textWrap,
    hyphens: typeof value?.hyphens === 'boolean' ? value.hyphens : DEFAULT_QUOTE_CONFIG.hyphens,
    paletteBackgroundEnabled: value?.paletteBackgroundEnabled === true,
    paletteColorIndex: typeof value?.paletteColorIndex === 'number' && Number.isFinite(value.paletteColorIndex)
      ? Math.round(Math.max(1, Math.min(QUOTE_PALETTE_SIZE, value.paletteColorIndex))) : DEFAULT_QUOTE_CONFIG.paletteColorIndex,
    paletteSaturationPercent: typeof value?.paletteSaturationPercent === 'number' && Number.isFinite(value.paletteSaturationPercent)
      ? Math.max(0, Math.min(100, value.paletteSaturationPercent)) : DEFAULT_QUOTE_CONFIG.paletteSaturationPercent,
    paletteLightnessPercent: typeof value?.paletteLightnessPercent === 'number' && Number.isFinite(value.paletteLightnessPercent)
      ? Math.max(0, Math.min(100, value.paletteLightnessPercent)) : DEFAULT_QUOTE_CONFIG.paletteLightnessPercent,
    textColorSaturationPercent: typeof value?.textColorSaturationPercent === 'number' && Number.isFinite(value.textColorSaturationPercent)
      ? Math.max(0, Math.min(100, value.textColorSaturationPercent)) : DEFAULT_QUOTE_CONFIG.textColorSaturationPercent,
    textColorLightnessPercent: typeof value?.textColorLightnessPercent === 'number' && Number.isFinite(value.textColorLightnessPercent)
      ? Math.max(0, Math.min(100, value.textColorLightnessPercent)) : DEFAULT_QUOTE_CONFIG.textColorLightnessPercent,
    geometryShape: value?.geometryShape === 'auto' || value?.geometryShape === 'square' || value?.geometryShape === 'portrait' || value?.geometryShape === 'landscape'
      ? value.geometryShape : DEFAULT_QUOTE_CONFIG.geometryShape,
    cardAspectRatioEnabled: value?.cardAspectRatioEnabled === true,
    sourceHeadingTopAligned: value?.sourceHeadingTopAligned === true,
    sourceHeadingText: typeof value?.sourceHeadingText === 'string' ? value.sourceHeadingText.trim() : DEFAULT_QUOTE_CONFIG.sourceHeadingText,
    sourceHeadingFontSize: normalizeTailwindToken({ utility: 'fontSize', breakpoint: 'base', value: value?.sourceHeadingFontSize, fallback: DEFAULT_QUOTE_CONFIG.sourceHeadingFontSize }),
    sourceHeadingFontSizeMd: normalizeTailwindToken({ utility: 'fontSize', breakpoint: 'md', value: value?.sourceHeadingFontSizeMd, fallback: DEFAULT_QUOTE_CONFIG.sourceHeadingFontSizeMd }),
    sourceHeadingFontSizeLg: normalizeTailwindToken({ utility: 'fontSize', breakpoint: 'lg', value: value?.sourceHeadingFontSizeLg, fallback: DEFAULT_QUOTE_CONFIG.sourceHeadingFontSizeLg }),
    sourceHeadingTracking: normalizeTailwindToken({ utility: 'letterSpacing', breakpoint: 'base', value: value?.sourceHeadingTracking, fallback: DEFAULT_QUOTE_CONFIG.sourceHeadingTracking }),
    sourceHeadingTextTransform: normalizeTailwindToken({ utility: 'textTransform', breakpoint: 'base', value: value?.sourceHeadingTextTransform, fallback: DEFAULT_QUOTE_CONFIG.sourceHeadingTextTransform }),
    sourceHeadingOpacityPercent: typeof value?.sourceHeadingOpacityPercent === 'number' && Number.isFinite(value.sourceHeadingOpacityPercent)
      ? Math.max(0, Math.min(100, value.sourceHeadingOpacityPercent)) : DEFAULT_QUOTE_CONFIG.sourceHeadingOpacityPercent,
    sourceHeadingContentGap: normalizeTailwindToken({ utility: 'marginBottom', breakpoint: 'base', value: value?.sourceHeadingContentGap, fallback: DEFAULT_QUOTE_CONFIG.sourceHeadingContentGap }),
    headingAlign: value?.headingAlign === 'start' || value?.headingAlign === 'end' ? value.headingAlign : 'center',
    borderRadiusEnabled: value?.borderRadiusEnabled === true,
    borderRadius: normalizeTailwindToken({ utility: 'borderRadius', breakpoint: 'base', value: value?.borderRadius, fallback: DEFAULT_QUOTE_CONFIG.borderRadius }),
    borderRadiusMd: normalizeTailwindToken({ utility: 'borderRadius', breakpoint: 'md', value: value?.borderRadiusMd, fallback: DEFAULT_QUOTE_CONFIG.borderRadiusMd }),
    borderRadiusLg: normalizeTailwindToken({ utility: 'borderRadius', breakpoint: 'lg', value: value?.borderRadiusLg, fallback: DEFAULT_QUOTE_CONFIG.borderRadiusLg }),
    // Opt-in, absent => off (same convention as gradientInkEnabled/
    // borderRadiusEnabled/clipOverflowEnabled above); DEFAULT_QUOTE_CONFIG is
    // the curated starting state where both are on.
    elevationEnabled: value?.elevationEnabled === true,
    shadowEnabled: value?.shadowEnabled === true,
    cardBlendEnabled: value?.cardBlendEnabled === true,
    cardBlendMode: CARD_BLEND_MODES.includes(value?.cardBlendMode as CardBlendMode)
      ? (value!.cardBlendMode as CardBlendMode) : DEFAULT_QUOTE_CONFIG.cardBlendMode,
    solidFillEnabled: value?.solidFillEnabled === true,
    solidFillColor: typeof value?.solidFillColor === 'string' && value.solidFillColor.trim()
      ? value.solidFillColor : DEFAULT_QUOTE_CONFIG.solidFillColor,
    textColorSource: source === 'inherit' || COVER_FLOW_GRADIENT_SOURCE_CARDS.includes(source as UnifiedGradientSourceCard)
      ? source as QuoteTextColorSource : DEFAULT_QUOTE_CONFIG.textColorSource,
    gradientInkEnabled: value?.gradientInkEnabled === true,
    gradientInkRenderMode: value?.gradientInkRenderMode === 'css' ? 'css' : 'unified',
    gradientInkHologramEnabled: value?.gradientInkHologramEnabled === true,
    gradientInkHologramStrengthPercent: typeof value?.gradientInkHologramStrengthPercent === 'number' && Number.isFinite(value.gradientInkHologramStrengthPercent)
      ? Math.max(0, Math.min(200, value.gradientInkHologramStrengthPercent)) : DEFAULT_QUOTE_CONFIG.gradientInkHologramStrengthPercent,
    gradientInkMeshDarkeningPercent: typeof value?.gradientInkMeshDarkeningPercent === 'number' && Number.isFinite(value.gradientInkMeshDarkeningPercent)
      ? Math.max(0, Math.min(100, value.gradientInkMeshDarkeningPercent)) : DEFAULT_QUOTE_CONFIG.gradientInkMeshDarkeningPercent,
    gradientInkMeshLighteningPercent: typeof value?.gradientInkMeshLighteningPercent === 'number' && Number.isFinite(value.gradientInkMeshLighteningPercent)
      ? Math.max(0, Math.min(100, value.gradientInkMeshLighteningPercent)) : DEFAULT_QUOTE_CONFIG.gradientInkMeshLighteningPercent,
    gradientInkMeshSaturationPercent: typeof value?.gradientInkMeshSaturationPercent === 'number' && Number.isFinite(value.gradientInkMeshSaturationPercent)
      ? Math.max(0, Math.min(200, value.gradientInkMeshSaturationPercent)) : DEFAULT_QUOTE_CONFIG.gradientInkMeshSaturationPercent,
    gradientInkMeshScale: typeof value?.gradientInkMeshScale === 'number' && Number.isFinite(value.gradientInkMeshScale)
      ? Math.max(0.5, Math.min(4, value.gradientInkMeshScale)) : DEFAULT_QUOTE_CONFIG.gradientInkMeshScale,
    gradientInkMeshScaleX: typeof value?.gradientInkMeshScaleX === 'number' && Number.isFinite(value.gradientInkMeshScaleX)
      ? Math.max(0.2, Math.min(5, value.gradientInkMeshScaleX)) : DEFAULT_QUOTE_CONFIG.gradientInkMeshScaleX,
    gradientInkMeshScaleY: typeof value?.gradientInkMeshScaleY === 'number' && Number.isFinite(value.gradientInkMeshScaleY)
      ? Math.max(0.2, Math.min(5, value.gradientInkMeshScaleY)) : DEFAULT_QUOTE_CONFIG.gradientInkMeshScaleY,
    gradientInkCssAngleDegrees: typeof value?.gradientInkCssAngleDegrees === 'number' && Number.isFinite(value.gradientInkCssAngleDegrees)
      ? ((value.gradientInkCssAngleDegrees % 360) + 360) % 360 : DEFAULT_QUOTE_CONFIG.gradientInkCssAngleDegrees,
    gradientInkSourceCard: COVER_FLOW_GRADIENT_SOURCE_CARDS.includes(value?.gradientInkSourceCard as UnifiedGradientSourceCard)
      ? value!.gradientInkSourceCard as UnifiedGradientSourceCard : DEFAULT_QUOTE_CONFIG.gradientInkSourceCard,
    gradientInkBaseColor: typeof value?.gradientInkBaseColor === 'string' && value.gradientInkBaseColor.trim()
      ? value.gradientInkBaseColor : DEFAULT_QUOTE_CONFIG.gradientInkBaseColor,
    gradientInkSurfaceColor: typeof value?.gradientInkSurfaceColor === 'string' && value.gradientInkSurfaceColor.trim()
      ? value.gradientInkSurfaceColor : DEFAULT_QUOTE_CONFIG.gradientInkSurfaceColor,
    gradientInkTextColor: typeof value?.gradientInkTextColor === 'string' && value.gradientInkTextColor.trim()
      ? value.gradientInkTextColor : DEFAULT_QUOTE_CONFIG.gradientInkTextColor,
    gradientInkBlendMode: value?.gradientInkBlendMode === 'multiply' ? 'multiply' : 'screen',
    gradientInkOverlayOpacityPercent: typeof value?.gradientInkOverlayOpacityPercent === 'number' && Number.isFinite(value.gradientInkOverlayOpacityPercent)
      ? Math.max(0, Math.min(100, value.gradientInkOverlayOpacityPercent)) : DEFAULT_QUOTE_CONFIG.gradientInkOverlayOpacityPercent,
    gradientInkTextOpacityPercent: typeof value?.gradientInkTextOpacityPercent === 'number' && Number.isFinite(value.gradientInkTextOpacityPercent)
      ? Math.max(0, Math.min(100, value.gradientInkTextOpacityPercent)) : DEFAULT_QUOTE_CONFIG.gradientInkTextOpacityPercent,
    // Opt-in, absent => off (same convention as the other *Enabled flags).
    gradientInkBorderEnabled: value?.gradientInkBorderEnabled === true,
    gradientInkBorderWidth: normalizeTailwindToken({ utility: 'borderWidth', breakpoint: 'base', value: value?.gradientInkBorderWidth, fallback: DEFAULT_QUOTE_CONFIG.gradientInkBorderWidth }),
    gradientInkBorderStyle: (['solid', 'dashed', 'dotted', 'double', 'groove', 'ridge', 'inset', 'outset'] as const)
      .includes(value?.gradientInkBorderStyle as QuoteConfig['gradientInkBorderStyle'])
      ? value!.gradientInkBorderStyle as QuoteConfig['gradientInkBorderStyle'] : DEFAULT_QUOTE_CONFIG.gradientInkBorderStyle,
    gradientInkBorderColor: typeof value?.gradientInkBorderColor === 'string' && value.gradientInkBorderColor.trim()
      ? value.gradientInkBorderColor : DEFAULT_QUOTE_CONFIG.gradientInkBorderColor,
    textSize: normalizeTailwindToken({ utility: 'fontSize', breakpoint: 'base', value: value?.textSize, fallback: DEFAULT_QUOTE_CONFIG.textSize }),
    textSizeMd: normalizeTailwindToken({ utility: 'fontSize', breakpoint: 'md', value: value?.textSizeMd, fallback: DEFAULT_QUOTE_CONFIG.textSizeMd }),
    textSizeLg: normalizeTailwindToken({ utility: 'fontSize', breakpoint: 'lg', value: value?.textSizeLg, fallback: DEFAULT_QUOTE_CONFIG.textSizeLg }),
    authorSize: normalizeTailwindToken({ utility: 'fontSize', breakpoint: 'base', value: value?.authorSize, fallback: DEFAULT_QUOTE_CONFIG.authorSize }),
    authorSizeMd: normalizeTailwindToken({ utility: 'fontSize', breakpoint: 'md', value: value?.authorSizeMd, fallback: DEFAULT_QUOTE_CONFIG.authorSizeMd }),
    authorSizeLg: normalizeTailwindToken({ utility: 'fontSize', breakpoint: 'lg', value: value?.authorSizeLg, fallback: DEFAULT_QUOTE_CONFIG.authorSizeLg }),
    textFontFamily: normalizeTailwindToken({ utility: 'fontFamily', breakpoint: 'base', value: value?.textFontFamily, fallback: DEFAULT_QUOTE_CONFIG.textFontFamily }),
    textFontWeight: normalizeTailwindToken({ utility: 'fontWeight', breakpoint: 'base', value: value?.textFontWeight, fallback: DEFAULT_QUOTE_CONFIG.textFontWeight }),
    textTransform: normalizeTailwindToken({ utility: 'textTransform', breakpoint: 'base', value: value?.textTransform, fallback: DEFAULT_QUOTE_CONFIG.textTransform }),
    authorFontFamily: normalizeTailwindToken({ utility: 'fontFamily', breakpoint: 'base', value: value?.authorFontFamily, fallback: DEFAULT_QUOTE_CONFIG.authorFontFamily }),
    marginTop: normalizeTailwindToken({ utility: 'marginTop', breakpoint: 'base', value: value?.marginTop, fallback: DEFAULT_QUOTE_CONFIG.marginTop }),
    marginTopMd: normalizeTailwindToken({ utility: 'marginTop', breakpoint: 'md', value: value?.marginTopMd, fallback: DEFAULT_QUOTE_CONFIG.marginTopMd }),
    marginTopLg: normalizeTailwindToken({ utility: 'marginTop', breakpoint: 'lg', value: value?.marginTopLg, fallback: DEFAULT_QUOTE_CONFIG.marginTopLg }),
    marginBottom: normalizeTailwindToken({ utility: 'marginBottom', breakpoint: 'base', value: value?.marginBottom, fallback: DEFAULT_QUOTE_CONFIG.marginBottom }),
    marginBottomMd: normalizeTailwindToken({ utility: 'marginBottom', breakpoint: 'md', value: value?.marginBottomMd, fallback: DEFAULT_QUOTE_CONFIG.marginBottomMd }),
    marginBottomLg: normalizeTailwindToken({ utility: 'marginBottom', breakpoint: 'lg', value: value?.marginBottomLg, fallback: DEFAULT_QUOTE_CONFIG.marginBottomLg }),
    paddingTop: normalizeTailwindToken({ utility: 'paddingTop', breakpoint: 'base', value: value?.paddingTop, fallback: DEFAULT_QUOTE_CONFIG.paddingTop }),
    paddingTopMd: normalizeTailwindToken({ utility: 'paddingTop', breakpoint: 'md', value: value?.paddingTopMd, fallback: DEFAULT_QUOTE_CONFIG.paddingTopMd }),
    paddingTopLg: normalizeTailwindToken({ utility: 'paddingTop', breakpoint: 'lg', value: value?.paddingTopLg, fallback: DEFAULT_QUOTE_CONFIG.paddingTopLg }),
    paddingRight: normalizeTailwindToken({ utility: 'paddingRight', breakpoint: 'base', value: value?.paddingRight, fallback: DEFAULT_QUOTE_CONFIG.paddingRight }),
    paddingRightMd: normalizeTailwindToken({ utility: 'paddingRight', breakpoint: 'md', value: value?.paddingRightMd, fallback: DEFAULT_QUOTE_CONFIG.paddingRightMd }),
    paddingRightLg: normalizeTailwindToken({ utility: 'paddingRight', breakpoint: 'lg', value: value?.paddingRightLg, fallback: DEFAULT_QUOTE_CONFIG.paddingRightLg }),
    paddingBottom: normalizeTailwindToken({ utility: 'paddingBottom', breakpoint: 'base', value: value?.paddingBottom, fallback: DEFAULT_QUOTE_CONFIG.paddingBottom }),
    paddingBottomMd: normalizeTailwindToken({ utility: 'paddingBottom', breakpoint: 'md', value: value?.paddingBottomMd, fallback: DEFAULT_QUOTE_CONFIG.paddingBottomMd }),
    paddingBottomLg: normalizeTailwindToken({ utility: 'paddingBottom', breakpoint: 'lg', value: value?.paddingBottomLg, fallback: DEFAULT_QUOTE_CONFIG.paddingBottomLg }),
    paddingLeft: normalizeTailwindToken({ utility: 'paddingLeft', breakpoint: 'base', value: value?.paddingLeft, fallback: DEFAULT_QUOTE_CONFIG.paddingLeft }),
    paddingLeftMd: normalizeTailwindToken({ utility: 'paddingLeft', breakpoint: 'md', value: value?.paddingLeftMd, fallback: DEFAULT_QUOTE_CONFIG.paddingLeftMd }),
    paddingLeftLg: normalizeTailwindToken({ utility: 'paddingLeft', breakpoint: 'lg', value: value?.paddingLeftLg, fallback: DEFAULT_QUOTE_CONFIG.paddingLeftLg }),
  };
}

// ---------------------------------------------------------------------------
// Wall quote ROLE presets.
//
// The masonry wall (pages/wall.tsx) interleaves excerpts of the /about
// timeline. That timeline emits two fragment kinds per stage -- a short,
// punchy `line` and a long reflective `body` -- so the wall's quote nodes
// alternate "loud/short" and "quiet/long" by construction. Rather than style
// them by arbitrary per-index arithmetic (which encoded nothing and produced
// the random serif/sans flips, scattered quotation marks, and five unrelated
// pastel tints that overloaded the wall), each fragment maps to one of three
// intentional roles below. The typology falls out of the data: even index =>
// STATEMENT, odd index => PASSAGE, with exactly one editorially-chosen
// FEATURE carrying the only chromatic (palette-derived) treatment.
//
// Three roles -- not one (monotonous, loses the claim/elaboration rhythm) and
// not the ~10 prior variants (unchunkable) -- is the smallest set that gives
// the wall hierarchy while staying instantly groupable by Gestalt similarity.
// Each preset spreads over DEFAULT_QUOTE_CONFIG so unlisted knobs inherit the
// shared baseline.

/** STATEMENT -- the short `line`s (even wall indices): the loud display
 * accents. Serif, largest size, tight leading, a single opening quotation
 * mark (no trailing glyph), no author. Surface/ink are supplied per-quote by
 * the wall (the shared calm paper), so textColorSource stays 'inherit'. */
export const STATEMENT_QUOTE_OVERRIDES = {
  showQuotationMarks: true,
  showClosingQuotationMark: false,
  showAuthor: false,
  measureCh: 34,
  leading: 'leading-tight',
  textColorSource: 'inherit',
  gradientInkEnabled: false,
  textSize: 'text-3xl',
  textSizeMd: 'md:text-4xl',
  textSizeLg: 'lg:text-4xl',
  textFontFamily: 'font-serif',
  textFontWeight: 'font-normal',
  paddingTop: 'pt-8',
  paddingTopMd: 'md:pt-9',
  paddingTopLg: 'lg:pt-10',
  paddingRight: 'pr-6',
  paddingRightMd: 'md:pr-8',
  paddingRightLg: 'lg:pr-10',
  paddingBottom: 'pb-8',
  paddingBottomMd: 'md:pb-9',
  paddingBottomLg: 'lg:pb-10',
  paddingLeft: 'pl-6',
  paddingLeftMd: 'md:pl-8',
  paddingLeftLg: 'lg:pl-10',
} satisfies Partial<QuoteConfig>;
export const STATEMENT_QUOTE_CONFIG: QuoteConfig = { ...DEFAULT_QUOTE_CONFIG, ...STATEMENT_QUOTE_OVERRIDES };

/** PASSAGE -- the long `body`s (odd wall indices): the quiet reading prose.
 * Serif but at *reading* size (smaller than Statement, fixing the oversized-
 * paragraph load problem), opened-up leading and a ~60ch measure so a 40-90
 * word paragraph reads comfortably. Signed with a small, muted sans
 * attribution; no decorative marks. */
export const PASSAGE_QUOTE_OVERRIDES = {
  showQuotationMarks: false,
  showClosingQuotationMark: false,
  showAuthor: true,
  measureCh: 60,
  leading: 'leading-normal',
  textColorSource: 'inherit',
  gradientInkEnabled: false,
  textSize: 'text-lg',
  textSizeMd: 'md:text-xl',
  textSizeLg: 'lg:text-xl',
  textFontFamily: 'font-serif',
  textFontWeight: 'font-normal',
  authorFontFamily: 'font-sans',
  authorSize: 'text-sm',
  authorSizeMd: 'md:text-sm',
  authorSizeLg: 'lg:text-sm',
  paddingTop: 'pt-8',
  paddingTopMd: 'md:pt-10',
  paddingTopLg: 'lg:pt-12',
  paddingRight: 'pr-6',
  paddingRightMd: 'md:pr-8',
  paddingRightLg: 'lg:pr-10',
  paddingBottom: 'pb-8',
  paddingBottomMd: 'md:pb-10',
  paddingBottomLg: 'lg:pb-12',
  paddingLeft: 'pl-6',
  paddingLeftMd: 'md:pl-8',
  paddingLeftLg: 'lg:pl-10',
} satisfies Partial<QuoteConfig>;
export const PASSAGE_QUOTE_CONFIG: QuoteConfig = { ...DEFAULT_QUOTE_CONFIG, ...PASSAGE_QUOTE_OVERRIDES };

/** FEATURE -- the editorial fragment that receives the shared gradient ink.
 * This preset changes typography and marks while inheriting the base Quote's
 * compositing treatment. The host supplies the deck through coverFlowGradient. */
export const FEATURE_QUOTE_OVERRIDES = {
  showQuotationMarks: true,
  showClosingQuotationMark: false,
  showAuthor: false,
  measureCh: 40,
  leading: 'leading-tight',
  // Preserves the full-opacity opening mark this role has always rendered
  // in gradient-ink/blend mode -- previously forced by a global
  // `.blendContent .mark { opacity: 1 }` CSS rule (now removed in favor of
  // openingMarkOpacityPercent always being the single source of truth);
  // DEFAULT_QUOTE_CONFIG's own 68% default would otherwise visibly dim this
  // role's mark for the first time.
  openingMarkOpacityPercent: 100,
  textSize: 'text-2xl',
  textSizeMd: 'md:text-3xl',
  textSizeLg: 'lg:text-3xl',
  textFontFamily: 'font-serif',
  textFontWeight: 'font-bold',
  paddingTop: 'pt-9',
  paddingTopMd: 'md:pt-11',
  paddingTopLg: 'lg:pt-12',
  paddingRight: 'pr-7',
  paddingRightMd: 'md:pr-9',
  paddingRightLg: 'lg:pr-11',
  paddingBottom: 'pb-9',
  paddingBottomMd: 'md:pb-11',
  paddingBottomLg: 'lg:pb-12',
  paddingLeft: 'pl-7',
  paddingLeftMd: 'md:pl-9',
  paddingLeftLg: 'lg:pl-11',
} satisfies Partial<QuoteConfig>;
export const FEATURE_QUOTE_CONFIG: QuoteConfig = { ...DEFAULT_QUOTE_CONFIG, ...FEATURE_QUOTE_OVERRIDES };

// ---------------------------------------------------------------------------
// Device-tier preview.

export type QuoteBreakpointTier = 'base' | 'md' | 'lg';

/**
 * Returns a config where every tiered field (textSize, authorSize,
 * sourceHeadingFontSize, paddingX, paddingY -- each with its own base/Md/Lg
 * trio) is collapsed to
 * ONE tier's own resolved value across all three of its own breakpoint
 * slots -- e.g. pinning to 'lg' sets
 * textSize = textSizeMd = textSizeLg = (the Lg-equivalent token), so
 * Tailwind's base/md:/lg: classes all agree and the figure renders
 * identically at every real viewport width. This is what lets a host show
 * "what the desktop/tablet/mobile config looks like" side by side at one
 * shared physical size, instead of needing to actually resize the browser
 * three times to see each tier.
 *
 * translateTailwindTokenBreakpoint (components/Panel/config/tailwindFields.ts)
 * re-derives each tier's OWN correctly-prefixed token (e.g. `md:text-2xl`
 * for the Md slot) from the single chosen tier's value, rather than
 * assigning a wrongly-prefixed string into a slot that expects its own
 * breakpoint prefix.
 */
export function pinQuoteConfigToTier(config: QuoteConfig, tier: QuoteBreakpointTier): QuoteConfig {
  const pick = <TBase extends string, TMd extends string, TLg extends string>(
    base: TBase, md: TMd, lg: TLg,
  ) => (tier === 'lg' ? lg : tier === 'md' ? md : base);

  const textSizeAt = pick(config.textSize, config.textSizeMd, config.textSizeLg);
  const sourceHeadingFontSizeAt = pick(config.sourceHeadingFontSize, config.sourceHeadingFontSizeMd, config.sourceHeadingFontSizeLg);
  const authorSizeAt = pick(config.authorSize, config.authorSizeMd, config.authorSizeLg);
  const marginTopAt = pick(config.marginTop, config.marginTopMd, config.marginTopLg);
  const marginBottomAt = pick(config.marginBottom, config.marginBottomMd, config.marginBottomLg);
  const paddingTopAt = pick(config.paddingTop, config.paddingTopMd, config.paddingTopLg);
  const paddingRightAt = pick(config.paddingRight, config.paddingRightMd, config.paddingRightLg);
  const paddingBottomAt = pick(config.paddingBottom, config.paddingBottomMd, config.paddingBottomLg);
  const paddingLeftAt = pick(config.paddingLeft, config.paddingLeftMd, config.paddingLeftLg);
  const tierBreakpoint: QuoteBreakpointTier = tier;

  return {
    ...config,
    textSize: translateTailwindTokenBreakpoint('fontSize', tierBreakpoint, 'base', textSizeAt, config.textSize),
    textSizeMd: translateTailwindTokenBreakpoint('fontSize', tierBreakpoint, 'md', textSizeAt, config.textSizeMd),
    textSizeLg: translateTailwindTokenBreakpoint('fontSize', tierBreakpoint, 'lg', textSizeAt, config.textSizeLg),
    sourceHeadingFontSize: translateTailwindTokenBreakpoint('fontSize', tierBreakpoint, 'base', sourceHeadingFontSizeAt, config.sourceHeadingFontSize),
    sourceHeadingFontSizeMd: translateTailwindTokenBreakpoint('fontSize', tierBreakpoint, 'md', sourceHeadingFontSizeAt, config.sourceHeadingFontSizeMd),
    sourceHeadingFontSizeLg: translateTailwindTokenBreakpoint('fontSize', tierBreakpoint, 'lg', sourceHeadingFontSizeAt, config.sourceHeadingFontSizeLg),
    authorSize: translateTailwindTokenBreakpoint('fontSize', tierBreakpoint, 'base', authorSizeAt, config.authorSize),
    authorSizeMd: translateTailwindTokenBreakpoint('fontSize', tierBreakpoint, 'md', authorSizeAt, config.authorSizeMd),
    authorSizeLg: translateTailwindTokenBreakpoint('fontSize', tierBreakpoint, 'lg', authorSizeAt, config.authorSizeLg),
    marginTop: translateTailwindTokenBreakpoint('marginTop', tierBreakpoint, 'base', marginTopAt, config.marginTop),
    marginTopMd: translateTailwindTokenBreakpoint('marginTop', tierBreakpoint, 'md', marginTopAt, config.marginTopMd),
    marginTopLg: translateTailwindTokenBreakpoint('marginTop', tierBreakpoint, 'lg', marginTopAt, config.marginTopLg),
    marginBottom: translateTailwindTokenBreakpoint('marginBottom', tierBreakpoint, 'base', marginBottomAt, config.marginBottom),
    marginBottomMd: translateTailwindTokenBreakpoint('marginBottom', tierBreakpoint, 'md', marginBottomAt, config.marginBottomMd),
    marginBottomLg: translateTailwindTokenBreakpoint('marginBottom', tierBreakpoint, 'lg', marginBottomAt, config.marginBottomLg),
    paddingTop: translateTailwindTokenBreakpoint('paddingTop', tierBreakpoint, 'base', paddingTopAt, config.paddingTop),
    paddingTopMd: translateTailwindTokenBreakpoint('paddingTop', tierBreakpoint, 'md', paddingTopAt, config.paddingTopMd),
    paddingTopLg: translateTailwindTokenBreakpoint('paddingTop', tierBreakpoint, 'lg', paddingTopAt, config.paddingTopLg),
    paddingRight: translateTailwindTokenBreakpoint('paddingRight', tierBreakpoint, 'base', paddingRightAt, config.paddingRight),
    paddingRightMd: translateTailwindTokenBreakpoint('paddingRight', tierBreakpoint, 'md', paddingRightAt, config.paddingRightMd),
    paddingRightLg: translateTailwindTokenBreakpoint('paddingRight', tierBreakpoint, 'lg', paddingRightAt, config.paddingRightLg),
    paddingBottom: translateTailwindTokenBreakpoint('paddingBottom', tierBreakpoint, 'base', paddingBottomAt, config.paddingBottom),
    paddingBottomMd: translateTailwindTokenBreakpoint('paddingBottom', tierBreakpoint, 'md', paddingBottomAt, config.paddingBottomMd),
    paddingBottomLg: translateTailwindTokenBreakpoint('paddingBottom', tierBreakpoint, 'lg', paddingBottomAt, config.paddingBottomLg),
    paddingLeft: translateTailwindTokenBreakpoint('paddingLeft', tierBreakpoint, 'base', paddingLeftAt, config.paddingLeft),
    paddingLeftMd: translateTailwindTokenBreakpoint('paddingLeft', tierBreakpoint, 'md', paddingLeftAt, config.paddingLeftMd),
    paddingLeftLg: translateTailwindTokenBreakpoint('paddingLeft', tierBreakpoint, 'lg', paddingLeftAt, config.paddingLeftLg),
  };
}
