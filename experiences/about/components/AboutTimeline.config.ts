import type { CtaButtonMotionEasing } from '../../../components/CtaButton/config/registered';
import {
  GAP_OPTIONS,
  PADDING_TOP_OPTIONS,
  PADDING_TOP_WIDE_OPTIONS,
  PADDING_TOP_LG_OPTIONS,
  PADDING_RIGHT_OPTIONS,
  PADDING_RIGHT_WIDE_OPTIONS,
  PADDING_RIGHT_LG_OPTIONS,
  PADDING_BOTTOM_OPTIONS,
  PADDING_BOTTOM_WIDE_OPTIONS,
  PADDING_BOTTOM_LG_OPTIONS,
  PADDING_LEFT_OPTIONS,
  PADDING_LEFT_WIDE_OPTIONS,
  PADDING_LEFT_LG_OPTIONS,
  MARGIN_TOP_OPTIONS,
  MARGIN_TOP_WIDE_OPTIONS,
  MARGIN_TOP_LG_OPTIONS,
  MARGIN_RIGHT_OPTIONS,
  MARGIN_RIGHT_WIDE_OPTIONS,
  MARGIN_RIGHT_LG_OPTIONS,
  MARGIN_BOTTOM_OPTIONS,
  MARGIN_BOTTOM_WIDE_OPTIONS,
  MARGIN_BOTTOM_LG_OPTIONS,
  MARGIN_LEFT_OPTIONS,
  MARGIN_LEFT_WIDE_OPTIONS,
  MARGIN_LEFT_LG_OPTIONS,
  type GapClass,
  type PaddingTopClass,
  type PaddingTopWideClass,
  type PaddingTopLgClass,
  type PaddingRightClass,
  type PaddingRightWideClass,
  type PaddingRightLgClass,
  type PaddingBottomClass,
  type PaddingBottomWideClass,
  type PaddingBottomLgClass,
  type PaddingLeftClass,
  type PaddingLeftWideClass,
  type PaddingLeftLgClass,
  type MarginTopClass,
  type MarginTopWideClass,
  type MarginTopLgClass,
  type MarginRightClass,
  type MarginRightWideClass,
  type MarginRightLgClass,
  type MarginBottomClass,
  type MarginBottomWideClass,
  type MarginBottomLgClass,
  type MarginLeftClass,
  type MarginLeftWideClass,
  type MarginLeftLgClass,
} from '../../../components/tailwindSpacingScale';
import {
  FONT_SIZE_OPTIONS,
  FONT_WEIGHT_OPTIONS,
  MAX_WIDTH_OPTIONS,
  type FontSizeClass,
  type FontWeightClass,
  type MaxWidthClass,
} from '../../../components/tailwindTypographyScale';

/** 'accent' (default): the marker's fill/outline color tracks the active
 * slide's own resolved palette accent (INT-04, unchanged). 'custom' pins it
 * to a fixed color instead, independent of whichever slide is active — same
 * "derive vs. pick a fixed color" pair AboutMobileAccordion's own
 * affordanceColorMode already establishes for this codebase. 'text' instead
 * matches whatever the row's own title is currently rendering at (its own
 * active-state color, `AboutTimeline.tsx`'s own `resolvedRowTitleColorActive`)
 * — one ink for both the marker and the caption text. */
export type AboutTimelineMarkerColorMode = 'accent' | 'custom' | 'text';

/** Which side the marker/rule column sits on, and which way row text (and
 * the description above it) aligns — a single, component-owned toggle, not
 * a per-breakpoint one: this timeline is desktop-only to begin with (see
 * AboutTimeline.tsx's own doc comment), so there is no narrower tier for a
 * second value to ever apply to. */
export type AboutTimelineAlignment = 'left' | 'right';
export type AboutTimelineAppendixSeparator = '·' | '⋅';
/** @deprecated Use `AboutTimelineAppendixSeparator`. */
export type AboutTimelineCategorySeparator = AboutTimelineAppendixSeparator;
/** The two intentional editorial families available to a timeline item's
 * title and supporting line. Kept separate so a page can establish
 * hierarchy without creating a second row component. */
export type AboutTimelineItemFontFamily = 'font-sans' | 'font-serif';

/** Square icon-style dimension catalog for the marker dot — same literal
 * "complete w-N h-N combo per option" shape
 * AFFORDANCE_DIMENSION_OPTIONS (tailwindSpacingScale.ts) already uses for
 * AboutMobileAccordion's own disclosure affordance, but kept as this
 * component's own local copy rather than widening that shared catalog: this
 * marker's own tuned default (24px) sits above that catalog's own 20px
 * ceiling — copy+rename locally instead of widening a helper shared with
 * other pages' own consumers of the same catalog. */
export const MARKER_SIZE_OPTIONS = [
  { label: '8px', value: 'w-2 h-2' },
  { label: '10px', value: 'w-2.5 h-2.5' },
  { label: '12px', value: 'w-3 h-3' },
  { label: '16px', value: 'w-4 h-4' },
  { label: '20px', value: 'w-5 h-5' },
  { label: '24px', value: 'w-6 h-6' },
  { label: '28px', value: 'w-7 h-7' },
  { label: '32px', value: 'w-8 h-8' },
] as const;
export type AboutTimelineMarkerSizeClass = typeof MARKER_SIZE_OPTIONS[number]['value'];

/** Thickness of the hairline vertical rule — Tailwind's own sub-4px width
 * steps (no shared "hairline width" catalog exists yet for this codebase to
 * reuse; local here rather than adding one to the shared file for a single
 * consumer). */
export const RULE_WEIGHT_OPTIONS = [
  { label: '1px', value: 'w-px' },
  { label: '2px', value: 'w-0.5' },
  { label: '4px', value: 'w-1' },
] as const;
export type AboutTimelineRuleWeightClass = typeof RULE_WEIGHT_OPTIONS[number]['value'];

export const APPENDIX_SEPARATOR_OPTIONS = [
  { label: 'MIDDLE DOT', value: '·' },
  { label: 'DOT OPERATOR', value: '⋅' },
] as const;
/** @deprecated Use `APPENDIX_SEPARATOR_OPTIONS`. */
export const CATEGORY_SEPARATOR_OPTIONS = APPENDIX_SEPARATOR_OPTIONS;

/**
 * about-IA-timeline-copy-rework (CMP-03) — component-owned config for
 * `AboutTimeline`/`AboutTimelineRow`, mirroring `AboutMobileAccordion.config
 * .ts`'s own shape exactly (a single flat config type + `DEFAULT_*` +
 * `normalize*`, no tabs/breakpoint split — this component is desktop-only,
 * see `AboutTimeline.tsx`'s own doc comment).
 *
 * Every discrete/spacing/sizing field below stores a literal, JIT-visible
 * Tailwind class — never a raw px number assembled into an inline style —
 * per this repo's own Tailwind-only styling convention (see e.g.
 * AboutMobileAccordion.config.ts's affordancePadding/
 * -BorderThicknessClassName/-DimensionClassName for the same pattern
 * already established one file over). Genuine exceptions, matching the
 * sitewide convention for these specific categories: opacity (no Tailwind
 * `opacity-N` catalog exists anywhere in this codebase's config scopes),
 * duration (`transitionDurationMs`, never a Tailwind `duration-*` class in
 * any panel.ts here), and contrast ratio (`*MinContrast`, not a CSS/Tailwind
 * concept at all) — all three stay plain numbers, matching every sibling
 * field of the same kind elsewhere (e.g. AbstractEditorialHeroConfig's own
 * `*MinContrast`/`ctaHoverDurationMs`/every `*Opacity` field).
 *
 * Title (row caption) and description (row supporting line) opacity are now
 * both fully component-owned, each with its own active/inactive pair —
 * `rowTitleOpacityActive`/`-Inactive` supersede an earlier version that
 * instead reused `dockLayoutConfig.minimalModeTextDimOpacity`/
 * `-TextEmphasisOpacity` verbatim via props (INT-03), so this component no
 * longer depends on the dock's own dimming values to state its own active
 * row.
 *
 * The three text objects this component renders — the lead-in `description`
 * above the rows, a row's own title (caption), and a row's own supporting
 * line — each get an independent padding/margin box (four literal Tailwind
 * classes per side, this repo's shared per-side spacing catalogs) so any one
 * of the three can be nudged without affecting the other two or the
 * component's own outer box.
 *
 * Font weight is deliberately never a state signal on this component
 * (operator fix): the only thing that tells an end user which row is
 * active is color/opacity (marker fill switching on, row text brightening)
 * — every row renders at one fixed weight regardless of active state.
 * `rowTitleFontWeightClassName` (opt-in, default `font-normal`) picks what
 * that one fixed weight is — a static appearance choice applied identically
 * to every row, not a per-state signal, so this rule still holds.
 *
 * `alignment` supersedes the page-driven text-align wiring an earlier pass
 * threaded in from `splitColumnLayoutConfig.narrowColumnTextAlign*`
 * (PolymorphicLayout.config.ts) — that only ever flipped text-align, never
 * the marker/rule column itself, so a "right" page alignment still left the
 * marker stranded on the left. This component now owns its own complete
 * left/right presentation (marker column side, rule side, row text-align,
 * and the description's own indent) as a single independent toggle, not a
 * value borrowed from the page's own column config.
 */
export type AboutTimelineConfig = {
  /** Caps the whole block's (description + rows together) own width — a
   * time-navigation device reads worse the wider its text lines run, so
   * this stops it stretching edge-to-edge on wide viewports/columns rather
   * than relying on the page's own column width alone. Literal Tailwind
   * `max-w-*` class, this repo's shared rem-based legibility scale
   * (`tailwindTypographyScale.ts`'s own `MAX_WIDTH_OPTIONS` — the same
   * catalog `AbstractEditorialHero.config.ts`'s `paragraphMaxWidth` already
   * draws from) rather than a raw px value or a percentage: rem tracks the
   * reader's own root font size, which is what keeps a measure legible
   * across zoom levels/user font-size overrides, unlike a fixed px cap or a
   * percentage-of-parent (`tailwindWidthScale.ts`'s own catalog, sized for
   * column-relative siblings, not an absolute reading-width cap). */
  maxWidthClassName: MaxWidthClass;
  /** Vertical gap between rows — literal Tailwind class, this repo's shared
   * spacing scale. */
  rowGap: GapClass;
  /** Diameter of the marker dot — literal `w-N h-N` combo class. */
  markerSizeClassName: AboutTimelineMarkerSizeClass;
  /** On (default): renders each row's circular marker. Off removes the
   * marker; when the rule is also off, the marker gutter is released too. */
  markerVisible: boolean;
  /** Maximum number of selected rows. The current selection model supports
   * zero or one: zero turns the component into a hoverable, traversable list
   * with no active row. */
  maxActiveRows: number;
  /** On (default): renders the hairline vertical rule the markers sit on.
   * Off: rule omitted entirely (rows still show their own marker). */
  ruleVisible: boolean;
  /** Thickness of the hairline vertical rule the markers sit on — literal
   * `w-*` class. Only meaningful while `ruleVisible` is on. */
  ruleWeightClassName: AboutTimelineRuleWeightClass;
  /** See `AboutTimelineMarkerColorMode`'s own doc comment. */
  markerColorMode: AboutTimelineMarkerColorMode;
  /** Only read while `markerColorMode` is 'custom'. */
  markerCustomColor: string;
  /** Opacity of an inactive (hollow) marker's own outline. */
  markerIdleOpacity: number;
  /** Opacity of the active (filled) marker — paired with the fill itself
   * switching on, never color alone (A11Y-04). */
  markerActiveOpacity: number;
  /** Off (default): the marker's fill is the flat `markerColor`/
   * `markerColorMode` behavior above, unchanged. On: the marker's fill
   * renders the same `LiquidGradientAdapter` WebGL gradient mesh the active
   * dock slide (desktop) / expanded accordion item (mobile) already use,
   * clipped to the marker's own circle, instead of a flat color — one
   * frozen (`activity: 'frozen'`, no continuous render loop; see
   * `AboutMobileAccordionItem.tsx`'s own `STATIC_GRADIENT_PERFORMANCE_CONFIG`
   * for the identical single-render-per-change pattern already used one
   * file over) WebGL instance per row. `markerColorMode`/`markerCustomColor`
   * keep applying to the ring/outline either way — this only changes what
   * fills the inside, so active-vs-inactive still reads via the same
   * fill-toggle mechanism (A11Y-04). Desktop-only, matching this component's
   * own existing desktop-only scope. See PLAN-ABOUT-TIMELINE-GRADIENT-
   * MARKER.md for the full feasibility writeup. */
  markerGradientEnabled: boolean;
  /** Only read while `markerGradientEnabled` is on. Overrides the shader's
   * own spatial-frequency (`uScale`) uniform for marker instances only, via
   * `applySliderGradientUniforms`'s existing `paletteScale` override
   * parameter (`AbstractPostDock/helpers/webgl.ts`) — independent of the
   * dock's own `shaderColorScale`, never written back to the shared dock
   * config. Counterintuitively (confirmed via live visual check at this
   * component's actual marker size, not assumed from the shader math alone):
   * LOW values (toward this field's own floor) sample so much of the
   * pattern's spatial frequency per marker-sized pixel that it aliases into
   * a flat, near-uniform averaged color once combined with the canvas's own
   * softness blur — no visible structure at all, the opposite of "denser."
   * Values toward the HIGH end (this field's own ceiling, which matches the
   * dock's own existing `uScale` ceiling — see below) instead sample a much
   * narrower, smoother slice of the mesh, which reads as a clean, legible
   * two-tone color sweep across the marker's small circle — the useful
   * range for THIS component sits opposite of where it would for a
   * full-size canvas. Clamped `[0.5, 4]` in `normalizeAboutTimelineConfig`
   * — deliberately the same range as the dock's own `uScale` clamp
   * (`AbstractPostDock/helpers/webgl.ts`, untouched by this feature): values
   * below 0.5 are clamped there regardless of what this field says, so
   * offering a wider range here would silently mislead an operator into
   * thinking a lower value does something it doesn't. Retune the default
   * here (never in `webgl.ts`, and never `shaderColorScale`) if
   * `markerSizeClassName` changes enough to change what reads well. */
  markerGradientScale: number;
  /** See `AboutTimelineAlignment`'s own doc comment. */
  alignment: AboutTimelineAlignment;
  /** WCAG contrast ratio the row's own title (caption) text must clear
   * against the column's own resolved background color while its row is
   * active. Independently configurable from the inactive target below —
   * an active row's title is meant to read as the brightest text on the
   * page. */
  rowTitleMinContrastActive: number;
  /** Same as `rowTitleMinContrastActive` above, applied while the row is
   * inactive — deliberately a separate, typically lower target so an
   * inactive title can read as genuinely de-emphasized (a color closer to
   * the background), not just a dimmer opacity of the same color. */
  rowTitleMinContrastInactive: number;
  /** Same active/inactive contrast pair as `rowTitleMinContrastActive`/
   * `-Inactive` above, applied to the row's own supporting line instead of
   * its title. */
  rowDescriptionMinContrastActive: number;
  rowDescriptionMinContrastInactive: number;
  /** Whether the row's optional supporting line is rendered. This affects
   * item descriptions only, never the separate lead-in timeline description. */
  rowDescriptionVisible: boolean;
  /** Font family for a row's title. */
  rowTitleFontFamily: AboutTimelineItemFontFamily;
  /** Font family for a row's supporting line. */
  rowDescriptionFontFamily: AboutTimelineItemFontFamily;
  /** Font weight of a row's own title (caption) — literal Tailwind
   * `font-*` class, applied identically regardless of active/inactive state
   * (see this type's own doc comment on font weight never being a state
   * signal). Opt-in: defaults to `font-normal`, the same weight this
   * component always rendered at before this field existed. */
  rowTitleFontWeightClassName: FontWeightClass;
  /** Font size of a row's own title (caption) — literal Tailwind `text-*`
   * class, independent of the supporting line's own size below and of the
   * lead-in `descriptionFontSizeClassName` further down (a different kind of
   * object, see that field's own doc comment). */
  rowTitleFontSizeClassName: FontSizeClass;
  /** Font size of a row's own supporting line — independent of the title's
   * own size above. */
  rowDescriptionFontSizeClassName: FontSizeClass;
  /** Opacity of a row's own title (caption) while its row is active —
   * independent of the supporting line's own opacity below. */
  rowTitleOpacityActive: number;
  /** Same as `rowTitleOpacityActive` above, applied while the row is
   * inactive. */
  rowTitleOpacityInactive: number;
  /** Opacity of the row's own supporting line while its row is active —
   * independent of the title's own opacity above. */
  rowDescriptionOpacityActive: number;
  /** Same as `rowDescriptionOpacityActive` above, applied while the row is
   * inactive. */
  rowDescriptionOpacityInactive: number;
  /** Opacity the hovered row's own marker rises to during pointer hover
   * (after `hoverDelayMs` elapses) — independent of `markerActiveOpacity`
   * above, so the hover pop can be tuned separately from the plain
   * "this row is selected" fill opacity. Every OTHER row (not the hovered
   * one, including the actually-selected row if it isn't what's being
   * hovered) falls back to its full inactive bundle — color and opacity,
   * title/description/marker alike — for the duration of the hover; see
   * `AboutTimeline.tsx`'s own `isHoveredRow`/`visuallyActive` derivation. */
  hoverMarkerOpacity: number;
  /** Same hover-pop treatment as `hoverMarkerOpacity` above, applied to the
   * hovered row's own title (caption) opacity instead. */
  hoverTitleOpacity: number;
  /** Opacity of the hovered row's supporting line. */
  hoverDescriptionOpacity: number;
  /** Delay, in milliseconds, between the pointer entering a row and that
   * row's hover state actually taking effect — leaving before this elapses
   * cancels it outright (no delay on the way out, only on the way in). */
  hoverDelayMs: number;
  /** Off by default: optional row metadata is omitted. On: a row with an
   * `appendix` value reveals it inline after the title once the row's hover
   * state is active, or when the row receives keyboard focus. */
  rowAppendixEnabled: boolean;
  /** Separator inserted between the title and its appendix. */
  rowAppendixSeparator: AboutTimelineAppendixSeparator;
  /** Font family used by the appendix independently of the title. */
  rowAppendixFontFamily: AboutTimelineItemFontFamily;
  /** Font size used by the appendix independently of the title and row
   * description. */
  rowAppendixFontSizeClassName: FontSizeClass;
  /** Additional delay after hover activation before the appendix appears. */
  rowAppendixRevealDelayMs: number;
  /** Opacity the appendix renders at once revealed (hover or keyboard
   * focus) — independent of `rowDescriptionOpacityActive`/`-Inactive`/
   * `hoverDescriptionOpacity` above. The appendix has no active/inactive
   * state of its own to begin with (it's either hidden at `opacity: 0`,
   * `AboutTimeline.module.css`'s own base rule, or revealed at this value,
   * that same module's own `[data-appendix-visible='true']` rule), so a
   * single value is enough — matching `descriptionOpacity`'s own "no
   * active/inactive state" shape above, not the row title/description
   * active/inactive pairs. */
  rowAppendixOpacity: number;
  /** @deprecated Compatibility aliases for copied page configs. */
  rowCategoryEnabled?: boolean;
  rowCategorySeparator?: AboutTimelineCategorySeparator;
  rowCategoryRevealDelayMs?: number;
  /** Padding around a row's own title (caption) specifically — four
   * independent literal Tailwind classes per property, this repo's shared
   * per-side spacing catalogs, tiered by breakpoint (operator ask) — same
   * MOBILE/TABLET/DESKTOP tabbed device-size switcher established
   * elsewhere in this config system (see e.g. AbstractPostDockLayoutConfig's
   * own minimalModeContentPaddingTop/-Wide/-Lg). This field is the
   * mobile/base tier — margin (below) is tiered the same way, for the same
   * reason (operator fix: leaving margin single-tier while padding was
   * tiered left it visually inside the same tabs without being scoped to
   * them). */
  rowTitlePaddingTopClassName: PaddingTopClass;
  rowTitlePaddingRightClassName: PaddingRightClass;
  rowTitlePaddingBottomClassName: PaddingBottomClass;
  rowTitlePaddingLeftClassName: PaddingLeftClass;
  /** Same four fields above, `md:`-prefixed — applied ≥ 768px. */
  rowTitlePaddingTopWideClassName: PaddingTopWideClass;
  rowTitlePaddingRightWideClassName: PaddingRightWideClass;
  rowTitlePaddingBottomWideClassName: PaddingBottomWideClass;
  rowTitlePaddingLeftWideClassName: PaddingLeftWideClass;
  /** Same four fields above, `lg:`-prefixed — applied ≥ 1024px. */
  rowTitlePaddingTopLgClassName: PaddingTopLgClass;
  rowTitlePaddingRightLgClassName: PaddingRightLgClass;
  rowTitlePaddingBottomLgClassName: PaddingBottomLgClass;
  rowTitlePaddingLeftLgClassName: PaddingLeftLgClass;
  /** Margin around a row's own title (caption) — tiered by breakpoint the
   * same way as padding above (operator fix: an earlier version left every
   * margin field single-tier while padding was tiered, which visually sat
   * inside the same MOBILE/TABLET/DESKTOP tabs without actually being
   * scoped to them — changing it while on one tab silently "leaked" onto
   * every other tab, since it was really one shared field the whole time.
   * Margin is now a real per-tier field like padding, eliminating that). */
  rowTitleMarginTopClassName: MarginTopClass;
  rowTitleMarginRightClassName: MarginRightClass;
  rowTitleMarginBottomClassName: MarginBottomClass;
  rowTitleMarginLeftClassName: MarginLeftClass;
  /** Same four fields above, `md:`-prefixed — applied ≥ 768px. */
  rowTitleMarginTopWideClassName: MarginTopWideClass;
  rowTitleMarginRightWideClassName: MarginRightWideClass;
  rowTitleMarginBottomWideClassName: MarginBottomWideClass;
  rowTitleMarginLeftWideClassName: MarginLeftWideClass;
  /** Same four fields above, `lg:`-prefixed — applied ≥ 1024px. */
  rowTitleMarginTopLgClassName: MarginTopLgClass;
  rowTitleMarginRightLgClassName: MarginRightLgClass;
  rowTitleMarginBottomLgClassName: MarginBottomLgClass;
  rowTitleMarginLeftLgClassName: MarginLeftLgClass;
  /** Padding around a row's own supporting line specifically — independent
   * of the title's own box above, tiered by breakpoint the same way. */
  rowDescriptionPaddingTopClassName: PaddingTopClass;
  rowDescriptionPaddingRightClassName: PaddingRightClass;
  rowDescriptionPaddingBottomClassName: PaddingBottomClass;
  rowDescriptionPaddingLeftClassName: PaddingLeftClass;
  /** Same four fields above, `md:`-prefixed — applied ≥ 768px. */
  rowDescriptionPaddingTopWideClassName: PaddingTopWideClass;
  rowDescriptionPaddingRightWideClassName: PaddingRightWideClass;
  rowDescriptionPaddingBottomWideClassName: PaddingBottomWideClass;
  rowDescriptionPaddingLeftWideClassName: PaddingLeftWideClass;
  /** Same four fields above, `lg:`-prefixed — applied ≥ 1024px. */
  rowDescriptionPaddingTopLgClassName: PaddingTopLgClass;
  rowDescriptionPaddingRightLgClassName: PaddingRightLgClass;
  rowDescriptionPaddingBottomLgClassName: PaddingBottomLgClass;
  rowDescriptionPaddingLeftLgClassName: PaddingLeftLgClass;
  /** Margin around a row's own supporting line — tiered by breakpoint the
   * same way as the title's own margin above. */
  rowDescriptionMarginTopClassName: MarginTopClass;
  rowDescriptionMarginRightClassName: MarginRightClass;
  rowDescriptionMarginBottomClassName: MarginBottomClass;
  rowDescriptionMarginLeftClassName: MarginLeftClass;
  /** Same four fields above, `md:`-prefixed — applied ≥ 768px. */
  rowDescriptionMarginTopWideClassName: MarginTopWideClass;
  rowDescriptionMarginRightWideClassName: MarginRightWideClass;
  rowDescriptionMarginBottomWideClassName: MarginBottomWideClass;
  rowDescriptionMarginLeftWideClassName: MarginLeftWideClass;
  /** Same four fields above, `lg:`-prefixed — applied ≥ 1024px. */
  rowDescriptionMarginTopLgClassName: MarginTopLgClass;
  rowDescriptionMarginRightLgClassName: MarginRightLgClass;
  rowDescriptionMarginBottomLgClassName: MarginBottomLgClass;
  rowDescriptionMarginLeftLgClassName: MarginLeftLgClass;
  /** Outer padding around the whole timeline block (description + rows
   * together) — four independent literal Tailwind classes, this repo's
   * shared per-side spacing catalogs (tailwindSpacingScale.ts), tiered by
   * breakpoint the same way. */
  paddingTopClassName: PaddingTopClass;
  paddingRightClassName: PaddingRightClass;
  paddingBottomClassName: PaddingBottomClass;
  paddingLeftClassName: PaddingLeftClass;
  /** Same four fields above, `md:`-prefixed — applied ≥ 768px. */
  paddingTopWideClassName: PaddingTopWideClass;
  paddingRightWideClassName: PaddingRightWideClass;
  paddingBottomWideClassName: PaddingBottomWideClass;
  paddingLeftWideClassName: PaddingLeftWideClass;
  /** Same four fields above, `lg:`-prefixed — applied ≥ 1024px. */
  paddingTopLgClassName: PaddingTopLgClass;
  paddingRightLgClassName: PaddingRightLgClass;
  paddingBottomLgClassName: PaddingBottomLgClass;
  paddingLeftLgClassName: PaddingLeftLgClass;
  /** Outer margin around the whole timeline block — tiered by breakpoint
   * the same way as outer padding above. */
  marginTopClassName: MarginTopClass;
  marginRightClassName: MarginRightClass;
  marginBottomClassName: MarginBottomClass;
  marginLeftClassName: MarginLeftClass;
  /** Same four fields above, `md:`-prefixed — applied ≥ 768px. */
  marginTopWideClassName: MarginTopWideClass;
  marginRightWideClassName: MarginRightWideClass;
  marginBottomWideClassName: MarginBottomWideClass;
  marginLeftWideClassName: MarginLeftWideClass;
  /** Same four fields above, `lg:`-prefixed — applied ≥ 1024px. */
  marginTopLgClassName: MarginTopLgClass;
  marginRightLgClassName: MarginRightLgClass;
  marginBottomLgClassName: MarginBottomLgClass;
  marginLeftLgClassName: MarginLeftLgClass;
  /** Padding around the lead-in description text above the rows —
   * independent of the outer block box above and of the per-row title/
   * description boxes above, tiered by breakpoint the same way. The indent
   * side (whichever of left/right matches `alignment`) combines with the
   * structural marker-offset via CSS custom properties + media queries in
   * AboutTimeline.module.css (`.description[data-alignment]`'s own rules)
   * rather than a plain class, at every tier — see AboutTimeline.tsx's own
   * `descriptionIndentStyle` for why (a plain class on that side would
   * collide with the module's own structural padding rule on the same
   * property). */
  descriptionPaddingTopClassName: PaddingTopClass;
  descriptionPaddingRightClassName: PaddingRightClass;
  descriptionPaddingBottomClassName: PaddingBottomClass;
  descriptionPaddingLeftClassName: PaddingLeftClass;
  /** Same four fields above, `md:`-prefixed — applied ≥ 768px. */
  descriptionPaddingTopWideClassName: PaddingTopWideClass;
  descriptionPaddingRightWideClassName: PaddingRightWideClass;
  descriptionPaddingBottomWideClassName: PaddingBottomWideClass;
  descriptionPaddingLeftWideClassName: PaddingLeftWideClass;
  /** Same four fields above, `lg:`-prefixed — applied ≥ 1024px. */
  descriptionPaddingTopLgClassName: PaddingTopLgClass;
  descriptionPaddingRightLgClassName: PaddingRightLgClass;
  descriptionPaddingBottomLgClassName: PaddingBottomLgClass;
  descriptionPaddingLeftLgClassName: PaddingLeftLgClass;
  /** Margin around the lead-in description text — tiered by breakpoint the
   * same way as its own padding above. */
  descriptionMarginTopClassName: MarginTopClass;
  descriptionMarginRightClassName: MarginRightClass;
  descriptionMarginBottomClassName: MarginBottomClass;
  descriptionMarginLeftClassName: MarginLeftClass;
  /** Same four fields above, `md:`-prefixed — applied ≥ 768px. */
  descriptionMarginTopWideClassName: MarginTopWideClass;
  descriptionMarginRightWideClassName: MarginRightWideClass;
  descriptionMarginBottomWideClassName: MarginBottomWideClass;
  descriptionMarginLeftWideClassName: MarginLeftWideClass;
  /** Same four fields above, `lg:`-prefixed — applied ≥ 1024px. */
  descriptionMarginTopLgClassName: MarginTopLgClass;
  descriptionMarginRightLgClassName: MarginRightLgClass;
  descriptionMarginBottomLgClassName: MarginBottomLgClass;
  descriptionMarginLeftLgClassName: MarginLeftLgClass;
  /** Font size of the description text — literal Tailwind `text-*` class,
   * independent of `rowTitleFontSizeClassName`/`rowDescriptionFontSizeClassName`
   * above, since the description is a different kind of object (a lead-in
   * sentence, not a row). */
  descriptionFontSizeClassName: FontSizeClass;
  /** Lead-in copy rendered above the timeline rows. An empty string omits it. */
  description: string;
  /** Opacity of the lead-in description text — this element has no active/
   * inactive state of its own, so a single value (unlike the per-row title/
   * description opacity pairs above). */
  descriptionOpacity: number;
  /** WCAG contrast ratio the lead-in description text (above the rows) must
   * clear against the column's own resolved background color — its own
   * independently configurable target, distinct from `rowDescriptionMinContrast
   * Active`/`-Inactive` above (a per-row supporting line, not this one
   * lead-in sentence, and this element has no active/inactive state of its
   * own to begin with). Same 1-21 range/semantics as every other
   * *MinContrast field in this codebase. */
  descriptionMinContrast: number;
  /** Duration of the marker fill/opacity transition and the row text's own
   * opacity transition as the active row changes. */
  transitionDurationMs: number;
  transitionEasing: CtaButtonMotionEasing;
};

export const DEFAULT_ABOUT_TIMELINE_CONFIG = {
  maxWidthClassName: 'max-w-sm',
  rowGap: 'gap-8',
  markerSizeClassName: 'w-6 h-6',
  markerVisible: true,
  maxActiveRows: 1,
  ruleVisible: false,
  ruleWeightClassName: 'w-px',
  markerColorMode: 'custom',
  markerCustomColor: '#6c5351',
  markerIdleOpacity: 0.11,
  markerActiveOpacity: 0.9,
  // Opt-in: off by default, zero visual change until an operator turns
  // this on (PLAN-ABOUT-TIMELINE-GRADIENT-MARKER.md).
  markerGradientEnabled: true,
  // Prototype-tuned (PLAN-ABOUT-TIMELINE-GRADIENT-MARKER.md §6, confirmed
  // via live screenshot at the default 24px `w-6 h-6` marker size): a clean,
  // legible two-tone color sweep — the dock's own 0.5 default washes out to
  // a flat averaged color at this small a canvas (see markerGradientScale's
  // own doc comment for why the useful direction is inverted from what the
  // shader math alone would suggest).
  markerGradientScale: 4,
  alignment: 'left',
  rowTitleMinContrastActive: 5.1,
  rowTitleMinContrastInactive: 4,
  rowDescriptionMinContrastActive: 5,
  rowDescriptionMinContrastInactive: 4,
  rowDescriptionVisible: true,
  rowTitleFontFamily: 'font-sans',
  rowDescriptionFontFamily: 'font-sans',
  rowTitleFontWeightClassName: 'font-medium',
  rowTitleFontSizeClassName: 'text-sm',
  rowDescriptionFontSizeClassName: 'text-sm',
  rowTitleOpacityActive: 1,
  rowTitleOpacityInactive: 0.7,
  rowDescriptionOpacityActive: 0.8,
  rowDescriptionOpacityInactive: 0.6,
  hoverMarkerOpacity: 1,
  hoverTitleOpacity: 1,
  hoverDescriptionOpacity: 1,
  hoverDelayMs: 150,
  rowAppendixEnabled: false,
  rowAppendixSeparator: '·',
  rowAppendixFontFamily: 'font-sans',
  rowAppendixFontSizeClassName: 'text-sm',
  rowAppendixRevealDelayMs: 180,
  // 1 — matches AboutTimeline.module.css's own pre-existing
  // `var(--about-timeline-appendix-opacity, 1)` fallback, so introducing
  // this field is zero visual change for every existing page until an
  // operator tunes it.
  rowAppendixOpacity: 1,
  rowTitlePaddingTopClassName: 'pt-0',
  rowTitlePaddingRightClassName: 'pr-0',
  rowTitlePaddingBottomClassName: 'pb-0',
  rowTitlePaddingLeftClassName: 'pl-0',
  rowTitlePaddingTopWideClassName: 'md:pt-0',
  rowTitlePaddingRightWideClassName: 'md:pr-0',
  rowTitlePaddingBottomWideClassName: 'md:pb-0',
  rowTitlePaddingLeftWideClassName: 'md:pl-0',
  rowTitlePaddingTopLgClassName: 'lg:pt-0',
  rowTitlePaddingRightLgClassName: 'lg:pr-0',
  rowTitlePaddingBottomLgClassName: 'lg:pb-0',
  rowTitlePaddingLeftLgClassName: 'lg:pl-0',
  rowTitleMarginTopClassName: 'mt-0',
  rowTitleMarginRightClassName: 'mr-0',
  rowTitleMarginBottomClassName: 'mb-0',
  rowTitleMarginLeftClassName: 'ml-0',
  rowTitleMarginTopWideClassName: 'md:mt-0',
  rowTitleMarginRightWideClassName: 'md:mr-0',
  rowTitleMarginBottomWideClassName: 'md:mb-0',
  rowTitleMarginLeftWideClassName: 'md:ml-0',
  rowTitleMarginTopLgClassName: 'lg:mt-0',
  rowTitleMarginRightLgClassName: 'lg:mr-0',
  rowTitleMarginBottomLgClassName: 'lg:mb-0',
  rowTitleMarginLeftLgClassName: 'lg:ml-0',
  rowDescriptionPaddingTopClassName: 'pt-0',
  rowDescriptionPaddingRightClassName: 'pr-0',
  rowDescriptionPaddingBottomClassName: 'pb-0',
  rowDescriptionPaddingLeftClassName: 'pl-0',
  rowDescriptionPaddingTopWideClassName: 'md:pt-0',
  rowDescriptionPaddingRightWideClassName: 'md:pr-0',
  rowDescriptionPaddingBottomWideClassName: 'md:pb-0',
  rowDescriptionPaddingLeftWideClassName: 'md:pl-0',
  rowDescriptionPaddingTopLgClassName: 'lg:pt-0',
  rowDescriptionPaddingRightLgClassName: 'lg:pr-0',
  rowDescriptionPaddingBottomLgClassName: 'lg:pb-0',
  rowDescriptionPaddingLeftLgClassName: 'lg:pl-0',
  rowDescriptionMarginTopClassName: 'mt-0',
  rowDescriptionMarginRightClassName: 'mr-0',
  rowDescriptionMarginBottomClassName: 'mb-0',
  rowDescriptionMarginLeftClassName: 'ml-0',
  rowDescriptionMarginTopWideClassName: 'md:mt-0',
  rowDescriptionMarginRightWideClassName: 'md:mr-0',
  rowDescriptionMarginBottomWideClassName: 'md:mb-0',
  rowDescriptionMarginLeftWideClassName: 'md:ml-0',
  rowDescriptionMarginTopLgClassName: 'lg:mt-0',
  rowDescriptionMarginRightLgClassName: 'lg:mr-0',
  rowDescriptionMarginBottomLgClassName: 'lg:mb-0',
  rowDescriptionMarginLeftLgClassName: 'lg:ml-0',
  paddingTopClassName: 'pt-0',
  paddingRightClassName: 'pr-0',
  paddingBottomClassName: 'pb-0',
  paddingLeftClassName: 'pl-0',
  paddingTopWideClassName: 'md:pt-0',
  paddingRightWideClassName: 'md:pr-0',
  paddingBottomWideClassName: 'md:pb-0',
  paddingLeftWideClassName: 'md:pl-0',
  paddingTopLgClassName: 'lg:pt-0',
  paddingRightLgClassName: 'lg:pr-0',
  paddingBottomLgClassName: 'lg:pb-0',
  paddingLeftLgClassName: 'lg:pl-0',
  marginTopClassName: 'mt-0',
  marginRightClassName: 'mr-0',
  marginBottomClassName: 'mb-0',
  marginLeftClassName: 'ml-0',
  marginTopWideClassName: 'md:mt-0',
  marginRightWideClassName: 'md:mr-0',
  marginBottomWideClassName: 'md:mb-0',
  marginLeftWideClassName: 'md:ml-0',
  marginTopLgClassName: 'lg:mt-7',
  marginRightLgClassName: 'lg:mr-0',
  marginBottomLgClassName: 'lg:mb-0',
  marginLeftLgClassName: 'lg:ml-0',
  descriptionPaddingTopClassName: 'pt-3',
  descriptionPaddingRightClassName: 'pr-0',
  descriptionPaddingBottomClassName: 'pb-10',
  descriptionPaddingLeftClassName: 'pl-0',
  descriptionPaddingTopWideClassName: 'md:pt-0',
  descriptionPaddingRightWideClassName: 'md:pr-0',
  descriptionPaddingBottomWideClassName: 'md:pb-10',
  descriptionPaddingLeftWideClassName: 'md:pl-0',
  descriptionPaddingTopLgClassName: 'lg:pt-3',
  descriptionPaddingRightLgClassName: 'lg:pr-0',
  descriptionPaddingBottomLgClassName: 'lg:pb-10',
  descriptionPaddingLeftLgClassName: 'lg:pl-0',
  descriptionMarginTopClassName: 'mt-0',
  descriptionMarginRightClassName: 'mr-0',
  descriptionMarginBottomClassName: 'mb-0',
  descriptionMarginLeftClassName: 'ml-0',
  descriptionMarginTopWideClassName: 'md:mt-0',
  descriptionMarginRightWideClassName: 'md:mr-0',
  descriptionMarginBottomWideClassName: 'md:mb-0',
  descriptionMarginLeftWideClassName: 'md:ml-0',
  descriptionMarginTopLgClassName: 'lg:mt-0',
  descriptionMarginRightLgClassName: 'lg:mr-0',
  descriptionMarginBottomLgClassName: 'lg:mb-0',
  descriptionMarginLeftLgClassName: 'lg:ml-0',
  descriptionFontSizeClassName: 'text-base',
  description: 'More than a decade of consulting and contract work, in the order it happened.',
  descriptionOpacity: 1,
  descriptionMinContrast: 4.5,
  transitionDurationMs: 550,
  transitionEasing: 'gentle',
} satisfies AboutTimelineConfig;

const GAP_VALUES: ReadonlyArray<GapClass> = GAP_OPTIONS.map(option => option.value);
const MARKER_SIZE_VALUES: ReadonlyArray<AboutTimelineMarkerSizeClass> =
  MARKER_SIZE_OPTIONS.map(option => option.value);
const RULE_WEIGHT_VALUES: ReadonlyArray<AboutTimelineRuleWeightClass> =
  RULE_WEIGHT_OPTIONS.map(option => option.value);
const PADDING_TOP_VALUES: ReadonlyArray<PaddingTopClass> = PADDING_TOP_OPTIONS.map(option => option.value);
const PADDING_TOP_WIDE_VALUES: ReadonlyArray<PaddingTopWideClass> = PADDING_TOP_WIDE_OPTIONS.map(option => option.value);
const PADDING_TOP_LG_VALUES: ReadonlyArray<PaddingTopLgClass> = PADDING_TOP_LG_OPTIONS.map(option => option.value);
const PADDING_RIGHT_VALUES: ReadonlyArray<PaddingRightClass> = PADDING_RIGHT_OPTIONS.map(option => option.value);
const PADDING_RIGHT_WIDE_VALUES: ReadonlyArray<PaddingRightWideClass> =
  PADDING_RIGHT_WIDE_OPTIONS.map(option => option.value);
const PADDING_RIGHT_LG_VALUES: ReadonlyArray<PaddingRightLgClass> =
  PADDING_RIGHT_LG_OPTIONS.map(option => option.value);
const PADDING_BOTTOM_VALUES: ReadonlyArray<PaddingBottomClass> = PADDING_BOTTOM_OPTIONS.map(option => option.value);
const PADDING_BOTTOM_WIDE_VALUES: ReadonlyArray<PaddingBottomWideClass> =
  PADDING_BOTTOM_WIDE_OPTIONS.map(option => option.value);
const PADDING_BOTTOM_LG_VALUES: ReadonlyArray<PaddingBottomLgClass> =
  PADDING_BOTTOM_LG_OPTIONS.map(option => option.value);
const PADDING_LEFT_VALUES: ReadonlyArray<PaddingLeftClass> = PADDING_LEFT_OPTIONS.map(option => option.value);
const PADDING_LEFT_WIDE_VALUES: ReadonlyArray<PaddingLeftWideClass> =
  PADDING_LEFT_WIDE_OPTIONS.map(option => option.value);
const PADDING_LEFT_LG_VALUES: ReadonlyArray<PaddingLeftLgClass> =
  PADDING_LEFT_LG_OPTIONS.map(option => option.value);
const MARGIN_TOP_VALUES: ReadonlyArray<MarginTopClass> = MARGIN_TOP_OPTIONS.map(option => option.value);
const MARGIN_TOP_WIDE_VALUES: ReadonlyArray<MarginTopWideClass> = MARGIN_TOP_WIDE_OPTIONS.map(option => option.value);
const MARGIN_TOP_LG_VALUES: ReadonlyArray<MarginTopLgClass> = MARGIN_TOP_LG_OPTIONS.map(option => option.value);
const MARGIN_RIGHT_VALUES: ReadonlyArray<MarginRightClass> = MARGIN_RIGHT_OPTIONS.map(option => option.value);
const MARGIN_RIGHT_WIDE_VALUES: ReadonlyArray<MarginRightWideClass> =
  MARGIN_RIGHT_WIDE_OPTIONS.map(option => option.value);
const MARGIN_RIGHT_LG_VALUES: ReadonlyArray<MarginRightLgClass> = MARGIN_RIGHT_LG_OPTIONS.map(option => option.value);
const MARGIN_BOTTOM_VALUES: ReadonlyArray<MarginBottomClass> = MARGIN_BOTTOM_OPTIONS.map(option => option.value);
const MARGIN_BOTTOM_WIDE_VALUES: ReadonlyArray<MarginBottomWideClass> =
  MARGIN_BOTTOM_WIDE_OPTIONS.map(option => option.value);
const MARGIN_BOTTOM_LG_VALUES: ReadonlyArray<MarginBottomLgClass> =
  MARGIN_BOTTOM_LG_OPTIONS.map(option => option.value);
const MARGIN_LEFT_VALUES: ReadonlyArray<MarginLeftClass> = MARGIN_LEFT_OPTIONS.map(option => option.value);
const MARGIN_LEFT_WIDE_VALUES: ReadonlyArray<MarginLeftWideClass> =
  MARGIN_LEFT_WIDE_OPTIONS.map(option => option.value);
const MARGIN_LEFT_LG_VALUES: ReadonlyArray<MarginLeftLgClass> = MARGIN_LEFT_LG_OPTIONS.map(option => option.value);
const MAX_WIDTH_VALUES: ReadonlyArray<MaxWidthClass> = MAX_WIDTH_OPTIONS.map(option => option.value);
const FONT_SIZE_VALUES: ReadonlyArray<FontSizeClass> = FONT_SIZE_OPTIONS.map(option => option.value);
const FONT_WEIGHT_VALUES: ReadonlyArray<FontWeightClass> = FONT_WEIGHT_OPTIONS.map(option => option.value);
const ITEM_FONT_FAMILIES: ReadonlyArray<AboutTimelineItemFontFamily> = ['font-sans', 'font-serif'];
const MOTION_EASINGS: ReadonlyArray<CtaButtonMotionEasing> = [
  'linear', 'standard', 'expressive', 'viscous', 'gentle',
];
const MARKER_COLOR_MODES: ReadonlyArray<AboutTimelineMarkerColorMode> = ['accent', 'custom', 'text'];
const ALIGNMENTS: ReadonlyArray<AboutTimelineAlignment> = ['left', 'right'];
const APPENDIX_SEPARATORS: ReadonlyArray<AboutTimelineAppendixSeparator> =
  APPENDIX_SEPARATOR_OPTIONS.map(option => option.value);

const token = <T extends string>(value: string, values: ReadonlyArray<T>, fallback: T) => (
  values.includes(value as T) ? value as T : fallback
);
const clampRange = (value: number, min: number, max: number, fallback: number) => (
  Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback
);

export function normalizeAboutTimelineConfig(
  config: Partial<AboutTimelineConfig> | undefined,
): AboutTimelineConfig {
  const raw = config ?? {};
  const base = { ...DEFAULT_ABOUT_TIMELINE_CONFIG, ...(config ?? {}) };
  const D = DEFAULT_ABOUT_TIMELINE_CONFIG;
  return {
    maxWidthClassName: token(base.maxWidthClassName, MAX_WIDTH_VALUES, D.maxWidthClassName),
    rowGap: token(base.rowGap, GAP_VALUES, D.rowGap),
    markerSizeClassName: token(base.markerSizeClassName, MARKER_SIZE_VALUES, D.markerSizeClassName),
    markerVisible: base.markerVisible !== false,
    maxActiveRows: Number.isFinite(base.maxActiveRows)
      ? Math.min(1, Math.max(0, Math.round(base.maxActiveRows)))
      : D.maxActiveRows,
    ruleVisible: base.ruleVisible !== false,
    ruleWeightClassName: token(base.ruleWeightClassName, RULE_WEIGHT_VALUES, D.ruleWeightClassName),
    markerColorMode: token(base.markerColorMode, MARKER_COLOR_MODES, D.markerColorMode),
    markerCustomColor: typeof base.markerCustomColor === 'string' && base.markerCustomColor.length > 0
      ? base.markerCustomColor
      : D.markerCustomColor,
    markerIdleOpacity: clampRange(base.markerIdleOpacity, 0, 1, D.markerIdleOpacity),
    markerActiveOpacity: clampRange(base.markerActiveOpacity, 0, 1, D.markerActiveOpacity),
    markerGradientEnabled: base.markerGradientEnabled === true,
    markerGradientScale: clampRange(base.markerGradientScale, 0.5, 4, D.markerGradientScale),
    alignment: token(base.alignment, ALIGNMENTS, D.alignment),
    rowTitleMinContrastActive: clampRange(
      base.rowTitleMinContrastActive, 1, 21, D.rowTitleMinContrastActive,
    ),
    rowTitleMinContrastInactive: clampRange(
      base.rowTitleMinContrastInactive, 1, 21, D.rowTitleMinContrastInactive,
    ),
    rowDescriptionMinContrastActive: clampRange(
      base.rowDescriptionMinContrastActive, 1, 21, D.rowDescriptionMinContrastActive,
    ),
    rowDescriptionMinContrastInactive: clampRange(
      base.rowDescriptionMinContrastInactive, 1, 21, D.rowDescriptionMinContrastInactive,
    ),
    rowDescriptionVisible: base.rowDescriptionVisible !== false,
    rowTitleFontFamily: token(base.rowTitleFontFamily, ITEM_FONT_FAMILIES, D.rowTitleFontFamily),
    rowDescriptionFontFamily: token(
      base.rowDescriptionFontFamily, ITEM_FONT_FAMILIES, D.rowDescriptionFontFamily,
    ),
    rowTitleFontWeightClassName: token(
      base.rowTitleFontWeightClassName, FONT_WEIGHT_VALUES, D.rowTitleFontWeightClassName,
    ),
    rowTitleFontSizeClassName: token(
      base.rowTitleFontSizeClassName, FONT_SIZE_VALUES, D.rowTitleFontSizeClassName,
    ),
    rowDescriptionFontSizeClassName: token(
      base.rowDescriptionFontSizeClassName, FONT_SIZE_VALUES, D.rowDescriptionFontSizeClassName,
    ),
    rowTitleOpacityActive: clampRange(base.rowTitleOpacityActive, 0, 1, D.rowTitleOpacityActive),
    rowTitleOpacityInactive: clampRange(base.rowTitleOpacityInactive, 0, 1, D.rowTitleOpacityInactive),
    rowDescriptionOpacityActive: clampRange(
      base.rowDescriptionOpacityActive, 0, 1, D.rowDescriptionOpacityActive,
    ),
    rowDescriptionOpacityInactive: clampRange(
      base.rowDescriptionOpacityInactive, 0, 1, D.rowDescriptionOpacityInactive,
    ),
    hoverMarkerOpacity: clampRange(base.hoverMarkerOpacity, 0, 1, D.hoverMarkerOpacity),
    hoverTitleOpacity: clampRange(base.hoverTitleOpacity, 0, 1, D.hoverTitleOpacity),
    hoverDescriptionOpacity: clampRange(
      base.hoverDescriptionOpacity, 0, 1, D.hoverDescriptionOpacity,
    ),
    hoverDelayMs: clampRange(base.hoverDelayMs, 0, 2000, D.hoverDelayMs),
    rowAppendixEnabled: typeof raw.rowAppendixEnabled === 'boolean'
      ? raw.rowAppendixEnabled
      : typeof raw.rowCategoryEnabled === 'boolean'
        ? raw.rowCategoryEnabled
        : D.rowAppendixEnabled,
    rowAppendixSeparator: token(
      raw.rowAppendixSeparator ?? raw.rowCategorySeparator ?? D.rowAppendixSeparator,
      APPENDIX_SEPARATORS,
      D.rowAppendixSeparator,
    ),
    rowAppendixFontFamily: token(
      base.rowAppendixFontFamily, ITEM_FONT_FAMILIES, D.rowAppendixFontFamily,
    ),
    rowAppendixFontSizeClassName: token(
      base.rowAppendixFontSizeClassName, FONT_SIZE_VALUES, D.rowAppendixFontSizeClassName,
    ),
    rowAppendixRevealDelayMs: clampRange(
      raw.rowAppendixRevealDelayMs ?? raw.rowCategoryRevealDelayMs ?? D.rowAppendixRevealDelayMs,
      0,
      2000,
      D.rowAppendixRevealDelayMs,
    ),
    rowAppendixOpacity: clampRange(base.rowAppendixOpacity, 0, 1, D.rowAppendixOpacity),
    rowTitlePaddingTopClassName: token(
      base.rowTitlePaddingTopClassName, PADDING_TOP_VALUES, D.rowTitlePaddingTopClassName,
    ),
    rowTitlePaddingRightClassName: token(
      base.rowTitlePaddingRightClassName, PADDING_RIGHT_VALUES, D.rowTitlePaddingRightClassName,
    ),
    rowTitlePaddingBottomClassName: token(
      base.rowTitlePaddingBottomClassName, PADDING_BOTTOM_VALUES, D.rowTitlePaddingBottomClassName,
    ),
    rowTitlePaddingLeftClassName: token(
      base.rowTitlePaddingLeftClassName, PADDING_LEFT_VALUES, D.rowTitlePaddingLeftClassName,
    ),
    rowTitlePaddingTopWideClassName: token(
      base.rowTitlePaddingTopWideClassName, PADDING_TOP_WIDE_VALUES, D.rowTitlePaddingTopWideClassName,
    ),
    rowTitlePaddingRightWideClassName: token(
      base.rowTitlePaddingRightWideClassName, PADDING_RIGHT_WIDE_VALUES, D.rowTitlePaddingRightWideClassName,
    ),
    rowTitlePaddingBottomWideClassName: token(
      base.rowTitlePaddingBottomWideClassName, PADDING_BOTTOM_WIDE_VALUES, D.rowTitlePaddingBottomWideClassName,
    ),
    rowTitlePaddingLeftWideClassName: token(
      base.rowTitlePaddingLeftWideClassName, PADDING_LEFT_WIDE_VALUES, D.rowTitlePaddingLeftWideClassName,
    ),
    rowTitlePaddingTopLgClassName: token(
      base.rowTitlePaddingTopLgClassName, PADDING_TOP_LG_VALUES, D.rowTitlePaddingTopLgClassName,
    ),
    rowTitlePaddingRightLgClassName: token(
      base.rowTitlePaddingRightLgClassName, PADDING_RIGHT_LG_VALUES, D.rowTitlePaddingRightLgClassName,
    ),
    rowTitlePaddingBottomLgClassName: token(
      base.rowTitlePaddingBottomLgClassName, PADDING_BOTTOM_LG_VALUES, D.rowTitlePaddingBottomLgClassName,
    ),
    rowTitlePaddingLeftLgClassName: token(
      base.rowTitlePaddingLeftLgClassName, PADDING_LEFT_LG_VALUES, D.rowTitlePaddingLeftLgClassName,
    ),
    rowTitleMarginTopClassName: token(
      base.rowTitleMarginTopClassName, MARGIN_TOP_VALUES, D.rowTitleMarginTopClassName,
    ),
    rowTitleMarginRightClassName: token(
      base.rowTitleMarginRightClassName, MARGIN_RIGHT_VALUES, D.rowTitleMarginRightClassName,
    ),
    rowTitleMarginBottomClassName: token(
      base.rowTitleMarginBottomClassName, MARGIN_BOTTOM_VALUES, D.rowTitleMarginBottomClassName,
    ),
    rowTitleMarginLeftClassName: token(
      base.rowTitleMarginLeftClassName, MARGIN_LEFT_VALUES, D.rowTitleMarginLeftClassName,
    ),
    rowTitleMarginTopWideClassName: token(
      base.rowTitleMarginTopWideClassName, MARGIN_TOP_WIDE_VALUES, D.rowTitleMarginTopWideClassName,
    ),
    rowTitleMarginRightWideClassName: token(
      base.rowTitleMarginRightWideClassName, MARGIN_RIGHT_WIDE_VALUES, D.rowTitleMarginRightWideClassName,
    ),
    rowTitleMarginBottomWideClassName: token(
      base.rowTitleMarginBottomWideClassName, MARGIN_BOTTOM_WIDE_VALUES, D.rowTitleMarginBottomWideClassName,
    ),
    rowTitleMarginLeftWideClassName: token(
      base.rowTitleMarginLeftWideClassName, MARGIN_LEFT_WIDE_VALUES, D.rowTitleMarginLeftWideClassName,
    ),
    rowTitleMarginTopLgClassName: token(
      base.rowTitleMarginTopLgClassName, MARGIN_TOP_LG_VALUES, D.rowTitleMarginTopLgClassName,
    ),
    rowTitleMarginRightLgClassName: token(
      base.rowTitleMarginRightLgClassName, MARGIN_RIGHT_LG_VALUES, D.rowTitleMarginRightLgClassName,
    ),
    rowTitleMarginBottomLgClassName: token(
      base.rowTitleMarginBottomLgClassName, MARGIN_BOTTOM_LG_VALUES, D.rowTitleMarginBottomLgClassName,
    ),
    rowTitleMarginLeftLgClassName: token(
      base.rowTitleMarginLeftLgClassName, MARGIN_LEFT_LG_VALUES, D.rowTitleMarginLeftLgClassName,
    ),
    rowDescriptionPaddingTopClassName: token(
      base.rowDescriptionPaddingTopClassName, PADDING_TOP_VALUES, D.rowDescriptionPaddingTopClassName,
    ),
    rowDescriptionPaddingRightClassName: token(
      base.rowDescriptionPaddingRightClassName, PADDING_RIGHT_VALUES, D.rowDescriptionPaddingRightClassName,
    ),
    rowDescriptionPaddingBottomClassName: token(
      base.rowDescriptionPaddingBottomClassName, PADDING_BOTTOM_VALUES, D.rowDescriptionPaddingBottomClassName,
    ),
    rowDescriptionPaddingLeftClassName: token(
      base.rowDescriptionPaddingLeftClassName, PADDING_LEFT_VALUES, D.rowDescriptionPaddingLeftClassName,
    ),
    rowDescriptionPaddingTopWideClassName: token(
      base.rowDescriptionPaddingTopWideClassName, PADDING_TOP_WIDE_VALUES, D.rowDescriptionPaddingTopWideClassName,
    ),
    rowDescriptionPaddingRightWideClassName: token(
      base.rowDescriptionPaddingRightWideClassName,
      PADDING_RIGHT_WIDE_VALUES,
      D.rowDescriptionPaddingRightWideClassName,
    ),
    rowDescriptionPaddingBottomWideClassName: token(
      base.rowDescriptionPaddingBottomWideClassName,
      PADDING_BOTTOM_WIDE_VALUES,
      D.rowDescriptionPaddingBottomWideClassName,
    ),
    rowDescriptionPaddingLeftWideClassName: token(
      base.rowDescriptionPaddingLeftWideClassName, PADDING_LEFT_WIDE_VALUES, D.rowDescriptionPaddingLeftWideClassName,
    ),
    rowDescriptionPaddingTopLgClassName: token(
      base.rowDescriptionPaddingTopLgClassName, PADDING_TOP_LG_VALUES, D.rowDescriptionPaddingTopLgClassName,
    ),
    rowDescriptionPaddingRightLgClassName: token(
      base.rowDescriptionPaddingRightLgClassName, PADDING_RIGHT_LG_VALUES, D.rowDescriptionPaddingRightLgClassName,
    ),
    rowDescriptionPaddingBottomLgClassName: token(
      base.rowDescriptionPaddingBottomLgClassName, PADDING_BOTTOM_LG_VALUES, D.rowDescriptionPaddingBottomLgClassName,
    ),
    rowDescriptionPaddingLeftLgClassName: token(
      base.rowDescriptionPaddingLeftLgClassName, PADDING_LEFT_LG_VALUES, D.rowDescriptionPaddingLeftLgClassName,
    ),
    rowDescriptionMarginTopClassName: token(
      base.rowDescriptionMarginTopClassName, MARGIN_TOP_VALUES, D.rowDescriptionMarginTopClassName,
    ),
    rowDescriptionMarginRightClassName: token(
      base.rowDescriptionMarginRightClassName, MARGIN_RIGHT_VALUES, D.rowDescriptionMarginRightClassName,
    ),
    rowDescriptionMarginBottomClassName: token(
      base.rowDescriptionMarginBottomClassName, MARGIN_BOTTOM_VALUES, D.rowDescriptionMarginBottomClassName,
    ),
    rowDescriptionMarginLeftClassName: token(
      base.rowDescriptionMarginLeftClassName, MARGIN_LEFT_VALUES, D.rowDescriptionMarginLeftClassName,
    ),
    rowDescriptionMarginTopWideClassName: token(
      base.rowDescriptionMarginTopWideClassName, MARGIN_TOP_WIDE_VALUES, D.rowDescriptionMarginTopWideClassName,
    ),
    rowDescriptionMarginRightWideClassName: token(
      base.rowDescriptionMarginRightWideClassName, MARGIN_RIGHT_WIDE_VALUES, D.rowDescriptionMarginRightWideClassName,
    ),
    rowDescriptionMarginBottomWideClassName: token(
      base.rowDescriptionMarginBottomWideClassName,
      MARGIN_BOTTOM_WIDE_VALUES,
      D.rowDescriptionMarginBottomWideClassName,
    ),
    rowDescriptionMarginLeftWideClassName: token(
      base.rowDescriptionMarginLeftWideClassName, MARGIN_LEFT_WIDE_VALUES, D.rowDescriptionMarginLeftWideClassName,
    ),
    rowDescriptionMarginTopLgClassName: token(
      base.rowDescriptionMarginTopLgClassName, MARGIN_TOP_LG_VALUES, D.rowDescriptionMarginTopLgClassName,
    ),
    rowDescriptionMarginRightLgClassName: token(
      base.rowDescriptionMarginRightLgClassName, MARGIN_RIGHT_LG_VALUES, D.rowDescriptionMarginRightLgClassName,
    ),
    rowDescriptionMarginBottomLgClassName: token(
      base.rowDescriptionMarginBottomLgClassName, MARGIN_BOTTOM_LG_VALUES, D.rowDescriptionMarginBottomLgClassName,
    ),
    rowDescriptionMarginLeftLgClassName: token(
      base.rowDescriptionMarginLeftLgClassName, MARGIN_LEFT_LG_VALUES, D.rowDescriptionMarginLeftLgClassName,
    ),
    paddingTopClassName: token(base.paddingTopClassName, PADDING_TOP_VALUES, D.paddingTopClassName),
    paddingRightClassName: token(base.paddingRightClassName, PADDING_RIGHT_VALUES, D.paddingRightClassName),
    paddingBottomClassName: token(base.paddingBottomClassName, PADDING_BOTTOM_VALUES, D.paddingBottomClassName),
    paddingLeftClassName: token(base.paddingLeftClassName, PADDING_LEFT_VALUES, D.paddingLeftClassName),
    paddingTopWideClassName: token(base.paddingTopWideClassName, PADDING_TOP_WIDE_VALUES, D.paddingTopWideClassName),
    paddingRightWideClassName: token(
      base.paddingRightWideClassName, PADDING_RIGHT_WIDE_VALUES, D.paddingRightWideClassName,
    ),
    paddingBottomWideClassName: token(
      base.paddingBottomWideClassName, PADDING_BOTTOM_WIDE_VALUES, D.paddingBottomWideClassName,
    ),
    paddingLeftWideClassName: token(
      base.paddingLeftWideClassName, PADDING_LEFT_WIDE_VALUES, D.paddingLeftWideClassName,
    ),
    paddingTopLgClassName: token(base.paddingTopLgClassName, PADDING_TOP_LG_VALUES, D.paddingTopLgClassName),
    paddingRightLgClassName: token(base.paddingRightLgClassName, PADDING_RIGHT_LG_VALUES, D.paddingRightLgClassName),
    paddingBottomLgClassName: token(
      base.paddingBottomLgClassName, PADDING_BOTTOM_LG_VALUES, D.paddingBottomLgClassName,
    ),
    paddingLeftLgClassName: token(base.paddingLeftLgClassName, PADDING_LEFT_LG_VALUES, D.paddingLeftLgClassName),
    marginTopClassName: token(base.marginTopClassName, MARGIN_TOP_VALUES, D.marginTopClassName),
    marginRightClassName: token(base.marginRightClassName, MARGIN_RIGHT_VALUES, D.marginRightClassName),
    marginBottomClassName: token(base.marginBottomClassName, MARGIN_BOTTOM_VALUES, D.marginBottomClassName),
    marginLeftClassName: token(base.marginLeftClassName, MARGIN_LEFT_VALUES, D.marginLeftClassName),
    marginTopWideClassName: token(base.marginTopWideClassName, MARGIN_TOP_WIDE_VALUES, D.marginTopWideClassName),
    marginRightWideClassName: token(
      base.marginRightWideClassName, MARGIN_RIGHT_WIDE_VALUES, D.marginRightWideClassName,
    ),
    marginBottomWideClassName: token(
      base.marginBottomWideClassName, MARGIN_BOTTOM_WIDE_VALUES, D.marginBottomWideClassName,
    ),
    marginLeftWideClassName: token(base.marginLeftWideClassName, MARGIN_LEFT_WIDE_VALUES, D.marginLeftWideClassName),
    marginTopLgClassName: token(base.marginTopLgClassName, MARGIN_TOP_LG_VALUES, D.marginTopLgClassName),
    marginRightLgClassName: token(base.marginRightLgClassName, MARGIN_RIGHT_LG_VALUES, D.marginRightLgClassName),
    marginBottomLgClassName: token(base.marginBottomLgClassName, MARGIN_BOTTOM_LG_VALUES, D.marginBottomLgClassName),
    marginLeftLgClassName: token(base.marginLeftLgClassName, MARGIN_LEFT_LG_VALUES, D.marginLeftLgClassName),
    descriptionPaddingTopClassName: token(
      base.descriptionPaddingTopClassName, PADDING_TOP_VALUES, D.descriptionPaddingTopClassName,
    ),
    descriptionPaddingRightClassName: token(
      base.descriptionPaddingRightClassName, PADDING_RIGHT_VALUES, D.descriptionPaddingRightClassName,
    ),
    descriptionPaddingBottomClassName: token(
      base.descriptionPaddingBottomClassName, PADDING_BOTTOM_VALUES, D.descriptionPaddingBottomClassName,
    ),
    descriptionPaddingLeftClassName: token(
      base.descriptionPaddingLeftClassName, PADDING_LEFT_VALUES, D.descriptionPaddingLeftClassName,
    ),
    descriptionPaddingTopWideClassName: token(
      base.descriptionPaddingTopWideClassName, PADDING_TOP_WIDE_VALUES, D.descriptionPaddingTopWideClassName,
    ),
    descriptionPaddingRightWideClassName: token(
      base.descriptionPaddingRightWideClassName, PADDING_RIGHT_WIDE_VALUES, D.descriptionPaddingRightWideClassName,
    ),
    descriptionPaddingBottomWideClassName: token(
      base.descriptionPaddingBottomWideClassName,
      PADDING_BOTTOM_WIDE_VALUES,
      D.descriptionPaddingBottomWideClassName,
    ),
    descriptionPaddingLeftWideClassName: token(
      base.descriptionPaddingLeftWideClassName, PADDING_LEFT_WIDE_VALUES, D.descriptionPaddingLeftWideClassName,
    ),
    descriptionPaddingTopLgClassName: token(
      base.descriptionPaddingTopLgClassName, PADDING_TOP_LG_VALUES, D.descriptionPaddingTopLgClassName,
    ),
    descriptionPaddingRightLgClassName: token(
      base.descriptionPaddingRightLgClassName, PADDING_RIGHT_LG_VALUES, D.descriptionPaddingRightLgClassName,
    ),
    descriptionPaddingBottomLgClassName: token(
      base.descriptionPaddingBottomLgClassName, PADDING_BOTTOM_LG_VALUES, D.descriptionPaddingBottomLgClassName,
    ),
    descriptionPaddingLeftLgClassName: token(
      base.descriptionPaddingLeftLgClassName, PADDING_LEFT_LG_VALUES, D.descriptionPaddingLeftLgClassName,
    ),
    descriptionMarginTopClassName: token(
      base.descriptionMarginTopClassName, MARGIN_TOP_VALUES, D.descriptionMarginTopClassName,
    ),
    descriptionMarginRightClassName: token(
      base.descriptionMarginRightClassName, MARGIN_RIGHT_VALUES, D.descriptionMarginRightClassName,
    ),
    descriptionMarginBottomClassName: token(
      base.descriptionMarginBottomClassName, MARGIN_BOTTOM_VALUES, D.descriptionMarginBottomClassName,
    ),
    descriptionMarginLeftClassName: token(
      base.descriptionMarginLeftClassName, MARGIN_LEFT_VALUES, D.descriptionMarginLeftClassName,
    ),
    descriptionMarginTopWideClassName: token(
      base.descriptionMarginTopWideClassName, MARGIN_TOP_WIDE_VALUES, D.descriptionMarginTopWideClassName,
    ),
    descriptionMarginRightWideClassName: token(
      base.descriptionMarginRightWideClassName, MARGIN_RIGHT_WIDE_VALUES, D.descriptionMarginRightWideClassName,
    ),
    descriptionMarginBottomWideClassName: token(
      base.descriptionMarginBottomWideClassName, MARGIN_BOTTOM_WIDE_VALUES, D.descriptionMarginBottomWideClassName,
    ),
    descriptionMarginLeftWideClassName: token(
      base.descriptionMarginLeftWideClassName, MARGIN_LEFT_WIDE_VALUES, D.descriptionMarginLeftWideClassName,
    ),
    descriptionMarginTopLgClassName: token(
      base.descriptionMarginTopLgClassName, MARGIN_TOP_LG_VALUES, D.descriptionMarginTopLgClassName,
    ),
    descriptionMarginRightLgClassName: token(
      base.descriptionMarginRightLgClassName, MARGIN_RIGHT_LG_VALUES, D.descriptionMarginRightLgClassName,
    ),
    descriptionMarginBottomLgClassName: token(
      base.descriptionMarginBottomLgClassName, MARGIN_BOTTOM_LG_VALUES, D.descriptionMarginBottomLgClassName,
    ),
    descriptionMarginLeftLgClassName: token(
      base.descriptionMarginLeftLgClassName, MARGIN_LEFT_LG_VALUES, D.descriptionMarginLeftLgClassName,
    ),
    descriptionFontSizeClassName: token(
      base.descriptionFontSizeClassName, FONT_SIZE_VALUES, D.descriptionFontSizeClassName,
    ),
    description: typeof base.description === 'string' ? base.description : D.description,
    descriptionOpacity: clampRange(base.descriptionOpacity, 0, 1, D.descriptionOpacity),
    descriptionMinContrast: clampRange(base.descriptionMinContrast, 1, 21, D.descriptionMinContrast),
    transitionDurationMs: clampRange(base.transitionDurationMs, 0, 1000, D.transitionDurationMs),
    transitionEasing: token(base.transitionEasing, MOTION_EASINGS, D.transitionEasing),
  };
}
