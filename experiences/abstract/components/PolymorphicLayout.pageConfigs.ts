import {
  DEFAULT_POLYMORPHIC_LAYOUT_CONFIG,
  type PolymorphicLayoutConfig,
} from './PolymorphicLayout.config';

/**
 * Every page's own complete `PolymorphicLayoutConfig` instance, co-located
 * here next to the shared type they're all instances of — per
 * PLAN-CONFIG-SCOPE-PAGE-OWNERSHIP.md's own "Round 1" ruling (its
 * `SplitColumnLayout.config.ts` reference implementation, mirrored in
 * `experiences/abstract/components/SplitColumnLayout/config/registered.ts`):
 * scattering the instances of one shared type across N independent page
 * files makes it easy to update one page and genuinely forget another —
 * there is no single place to see every page's value together when this
 * type's own shape changes. Extracted into this sibling file, not appended
 * to `PolymorphicLayout.config.ts` itself, because that file is already
 * ~2200 lines — the same "sibling `.pageConfigs.ts` once the file would
 * otherwise get crowded" fallback the doctrine's own text names.
 *
 * `PolymorphicLayout.pageConfigs.test.ts` is the structural consistency
 * guard: it asserts the set of `definePageConfigScope`-built panel exports
 * (`pages/abstract.panel.ts`, `pages/about.panel.ts`,
 * `pages/posts-lab/postLab.panel.ts`) matches the set of page-config
 * constants exported here, in both directions.
 *
 * Nobody spreads another page's value, and nobody spreads
 * `DEFAULT_POLYMORPHIC_LAYOUT_CONFIG` into these — each is fully
 * independent, `satisfies`-checked on its own. Each page's own `.config.ts`
 * re-exports its own constant by name so no other file's import path needs
 * to change (`pages/abstract.config.ts`'s own
 * `ABSTRACT_POLYMORPHIC_LAYOUT_CONFIG`, `pages/about.config.ts`'s own
 * `ABOUT_POLYMORPHIC_LAYOUT_CONFIG`, `pages/posts-lab/postLab.config.ts`'s
 * own `DEFAULT_POST_LAB_PAGE_LAYOUT_CONFIG`).
 */

// STOP — before pasting a component-config-update/v1 payload's `config:`
// block into this object: confirm the payload's own `target_symbol` line
// reads EXACTLY `ABSTRACT_POLYMORPHIC_LAYOUT_CONFIG`, not
// `ABOUT_POLYMORPHIC_LAYOUT_CONFIG` below. Both objects share the identical
// field set/names (same `PolymorphicLayoutConfig` type) — a field-name
// search alone (e.g. grepping for `narrowColumnCustomColor:`) will match
// BOTH blocks, and pasting into the wrong one has already happened twice:
// once on 2026-08-24 (see narrowColumnCustomColorLg's own doc comment
// further down, and pages/about.tsx's wideColumnStyle doc comment, for
// that incident's full account), and again in a later session (color
// fields meant for `/about` landed here instead, visually changing
// `/abstract`'s own narrow column while `/about`'s own panel silently kept
// showing its stale pre-update value — both symptoms traced back to this
// exact mistake, not a wiring bug in either page). Locate the target
// symbol's own `export const NAME = {` line FIRST, always, before
// searching for the field(s) the payload names.
//
// PLAN-POLYMORPHIC-LAYOUT-PAGE-CONFIG-PARITY.md: relocated verbatim from
// pages/abstract.config.ts (no value changes) — see that file's own
// preserved doc comment above the export for the full per-field reasoning
// (padding provenance, narrowColumnContentAlign*'s own AbstractEditorialHero
// indirection, etc.), kept there rather than duplicated here since it's
// specific to /abstract's own render call site, not this constant's own
// definition.
export const ABSTRACT_POLYMORPHIC_LAYOUT_CONFIG: PolymorphicLayoutConfig = {
  wideColumnSide: 'right',
  narrowColumnWidthTierMd: '38/62',
  narrowColumnWidthTierLg: '38/62',
  stackedColumnOrder: 'narrowFirst',
  wideColumnHeaderBehavior: 'float',
  narrowColumnHeaderBehavior: 'float',
  legibilityScrimEnabled: false,
  wideColumnClearsFloatingHeader: false,
  wideColumnClearsFloatingHeaderWide: false,
  wideColumnClearsFloatingHeaderLg: false,
  narrowColumnClearsFloatingHeader: false,
  narrowColumnClearsFloatingHeaderWide: true,
  narrowColumnClearsFloatingHeaderLg: true,
  colorSource: 'custom',
  wideColumnCustomColor: '#cbcbe1',
  narrowColumnCustomColor: '#cbcbe1',
  wideColumnSurfaceOffset: 0,
  narrowColumnSurfaceOffset: 0,
  headerSplitBandEnabled: true,
  splitBandLeftMode: 'syncWithColumnBelow',
  splitBandLeftCustomColor: '#0e1230',
  splitBandLeftModeWide: 'custom',
  splitBandLeftModeLg: 'custom',
  splitBandRightMode: 'syncWithColumnBelow',
  splitBandRightCustomColor: '#0e1230',
  // Regression history (nav text rendering as washed-out gray/near-
  // invisible on wider devices — BUG-012, BUGS-AUDIT-POLYMORPHIC-LAYOUT-
  // CARD-STACK.md): the actual defect was never these mode values
  // themselves — it was SiteHeader.tsx's own rightSegmentActualColor
  // falling back to pageSurfaceConfig.color (this page's light '#dadbe2')
  // whenever the resolved band color is 'transparent', instead of the
  // right/wide column's own real, physically-visible background. Two
  // earlier fix attempts (commit 38b77d9, then a follow-up that forced
  // splitBandRightModeLg to 'syncWithColumnBelow' too) both worked around
  // that by forcing this field off 'transparent' entirely — which fixed the
  // symptom but silently removed 'transparent' as a real, supported choice
  // for this segment, the opposite of what's wanted here (operator ask:
  // "I need this segment to support the transparent option and still have
  // the correct text color"). The actual fix now lives in SiteHeader.tsx —
  // rightSegmentActualColor falls back to a new physicalRightColumnColor
  // prop (the column's real color, independent of the band) instead of
  // pageSurfaceConfig.color — so 'transparent' is correct and safe here
  // again at every tier, matching what this field always should have meant.
  splitBandRightModeWide: 'transparent',
  splitBandRightModeLg: 'transparent',
  contentContainer: 'bounded',
  wideColumnContentContainer: 'bounded',
  narrowColumnContentContainer: 'bounded',
  headerScrollBehavior: 'static',
  headerScrollBehaviorWide: 'fixed',
  headerScrollBehaviorLg: 'fixed',
  narrowColumnContentAlign: 'items-center',
  narrowColumnContentAlignWide: 'items-end',
  narrowColumnContentAlignLg: 'items-end',
  narrowColumnContentWidth: 'auto',
  narrowColumnContentWidthWide: 'md:max-w-[100%]',
  narrowColumnContentWidthLg: 'lg:max-w-[100%]',
  narrowColumnContentMaxWidth: 'none',
  narrowColumnContentMaxWidthWide: 'none',
  narrowColumnContentMaxWidthLg: 'none',
  narrowColumnTextAlign: 'text-left',
  narrowColumnTextAlignWide: 'md:text-right',
  narrowColumnTextAlignLg: 'lg:text-right',
  wideColumnContentAlign: 'items-end',
  wideColumnContentAlignWide: 'items-end',
  wideColumnContentAlignLg: 'items-end',
  wideColumnContentWidth: 'auto',
  wideColumnContentWidthWide: 'md:max-w-[100%]',
  wideColumnContentWidthLg: 'match-narrow-column',
  wideColumnContentMaxWidth: 'none',
  wideColumnContentMaxWidthWide: 'none',
  wideColumnContentMaxWidthLg: 'none',
  wideColumnTextAlign: 'text-left',
  wideColumnTextAlignWide: 'md:text-left',
  wideColumnTextAlignLg: 'lg:text-left',
  narrowColumnContentVerticalAlign: 'justify-center',
  narrowColumnContentVerticalAlignWide: 'md:justify-center',
  narrowColumnContentVerticalAlignLg: 'lg:justify-center',
  wideColumnContentVerticalAlign: 'justify-center',
  wideColumnContentVerticalAlignWide: 'md:justify-center',
  wideColumnContentVerticalAlignLg: 'lg:justify-center',
  narrowColumnContentMinHeight: 'min-h-0',
  wideColumnContentMinHeight: 'min-h-0',
  narrowColumnMobileAlignOffsetPx: 0,
  narrowColumnContentPaddingLeft: 'pl-7',
  narrowColumnContentPaddingLeftWide: 'md:pl-7',
  narrowColumnContentPaddingLeftLg: 'lg:pl-0',
  narrowColumnContentPaddingRightWide: 'md:pr-7',
  narrowColumnContentPaddingRightLg: 'lg:pr-0',
  narrowColumnContentPaddingRight: 'pr-7',
  narrowColumnContentPaddingTop: 'pt-10',
  narrowColumnContentPaddingTopWide: 'md:pt-16',
  narrowColumnContentPaddingTopLg: 'lg:pt-0',
  narrowColumnContentPaddingBottom: 'pb-5',
  narrowColumnContentPaddingBottomWide: 'md:pb-16',
  narrowColumnContentPaddingBottomLg: 'lg:pb-0',
  narrowColumnContentMarginTop: 'mt-0',
  narrowColumnContentMarginTopWide: 'md:mt-0',
  narrowColumnContentMarginTopLg: 'lg:mt-0',
  narrowColumnContentMarginRight: 'mr-0',
  narrowColumnContentMarginRightWide: 'md:mr-0',
  narrowColumnContentMarginRightLg: 'lg:mr-0',
  narrowColumnContentMarginBottom: 'mb-0',
  narrowColumnContentMarginBottomWide: 'md:mb-0',
  narrowColumnContentMarginBottomLg: 'lg:mb-0',
  narrowColumnContentMarginLeft: 'ml-0',
  narrowColumnContentMarginLeftWide: 'md:ml-0',
  narrowColumnContentMarginLeftLg: 'lg:ml-0',
  wideColumnContentPaddingLeft: 'pl-7',
  wideColumnContentPaddingRight: 'pr-7',
  wideColumnContentPaddingLeftWide: 'md:pl-12',
  wideColumnContentPaddingLeftLg: 'lg:pl-12',
  wideColumnContentPaddingRightWide: 'md:pr-12',
  wideColumnContentPaddingRightLg: 'lg:pr-12',
  wideColumnContentPaddingTop: 'pt-7',
  wideColumnContentPaddingTopWide: 'md:pt-16',
  wideColumnContentPaddingTopLg: 'lg:pt-16',
  wideColumnContentPaddingBottom: 'pb-7',
  wideColumnContentPaddingBottomWide: 'md:pb-16',
  wideColumnContentPaddingBottomLg: 'lg:pb-16',
  wideColumnContentMarginTop: 'mt-0',
  wideColumnContentMarginTopWide: 'md:mt-0',
  wideColumnContentMarginTopLg: 'lg:mt-0',
  wideColumnContentMarginRight: 'mr-0',
  wideColumnContentMarginRightWide: 'md:mr-0',
  wideColumnContentMarginRightLg: 'lg:mr-0',
  wideColumnContentMarginBottom: 'mb-0',
  wideColumnContentMarginBottomWide: 'md:mb-0',
  wideColumnContentMarginBottomLg: 'lg:mb-0',
  wideColumnContentMarginLeft: 'ml-0',
  wideColumnContentMarginLeftWide: 'md:ml-0',
  wideColumnContentMarginLeftLg: 'lg:ml-0',
  headerLeftSegmentAlign: 'justify-center',
  headerLeftSegmentAlignWide: 'md:justify-end',
  headerLeftSegmentAlignLg: 'lg:justify-end',
  headerLeftSegmentVerticalAlign: 'items-center',
  headerLeftSegmentVerticalAlignWide: 'md:items-center',
  headerLeftSegmentVerticalAlignLg: 'lg:items-center',
  headerLeftContentWidth: 'max-w-[90%]',
  headerLeftContentWidthWide: 'md:max-w-[100%]',
  headerLeftContentWidthLg: 'lg:max-w-[100%]',
  headerRightSegmentAlign: 'justify-center',
  headerRightSegmentAlignWide: 'md:justify-start',
  headerRightSegmentAlignLg: 'lg:justify-start',
  headerRightSegmentVerticalAlign: 'items-center',
  headerRightSegmentVerticalAlignWide: 'md:items-center',
  headerRightSegmentVerticalAlignLg: 'lg:items-center',
  headerRightContentWidth: 'max-w-[80%]',
  headerRightContentWidthWide: 'auto',
  headerRightContentWidthLg: 'auto',
  headerLeftInnerAlign: 'justify-center',
  headerLeftInnerAlignWide: 'md:justify-end',
  headerLeftInnerAlignLg: 'lg:justify-end',
  headerRightInnerAlign: 'justify-center',
  headerRightInnerAlignWide: 'md:justify-start',
  headerRightInnerAlignLg: 'lg:justify-start',
  headerLeftContentPaddingTop: 'pt-0',
  headerLeftContentPaddingTopWide: 'md:pt-0',
  headerLeftContentPaddingTopLg: 'lg:pt-0',
  headerLeftContentPaddingRight: 'pr-0',
  headerLeftContentPaddingRightWide: 'md:pr-7',
  headerLeftContentPaddingRightLg: 'lg:pr-14',
  headerLeftContentPaddingBottom: 'pb-0',
  headerLeftContentPaddingBottomWide: 'md:pb-0',
  headerLeftContentPaddingBottomLg: 'lg:pb-0',
  headerLeftContentPaddingLeft: 'pl-0',
  headerLeftContentPaddingLeftWide: 'md:pl-0',
  headerLeftContentPaddingLeftLg: 'lg:pl-0',
  headerLeftContentMarginTop: 'mt-0',
  headerLeftContentMarginTopWide: 'md:mt-0',
  headerLeftContentMarginTopLg: 'lg:mt-0',
  headerLeftContentMarginRight: 'mr-0',
  headerLeftContentMarginRightWide: 'md:mr-0',
  headerLeftContentMarginRightLg: 'lg:mr-0',
  headerLeftContentMarginBottom: 'mb-0',
  headerLeftContentMarginBottomWide: 'md:mb-0',
  headerLeftContentMarginBottomLg: 'lg:mb-0',
  headerLeftContentMarginLeft: 'ml-0',
  headerLeftContentMarginLeftWide: 'md:ml-0',
  headerLeftContentMarginLeftLg: 'lg:ml-0',
  headerRightContentPaddingTop: 'pt-0',
  headerRightContentPaddingTopWide: 'md:pt-0',
  headerRightContentPaddingTopLg: 'lg:pt-0',
  headerRightContentPaddingRight: 'pr-0',
  headerRightContentPaddingRightWide: 'md:pr-0',
  headerRightContentPaddingRightLg: 'lg:pr-0',
  headerRightContentPaddingBottom: 'pb-0',
  headerRightContentPaddingBottomWide: 'md:pb-0',
  headerRightContentPaddingBottomLg: 'lg:pb-0',
  headerRightContentPaddingLeft: 'pl-0',
  headerRightContentPaddingLeftWide: 'md:pl-7',
  headerRightContentPaddingLeftLg: 'lg:pl-14',
  headerRightContentMarginTop: 'mt-0',
  headerRightContentMarginTopWide: 'md:mt-0',
  headerRightContentMarginTopLg: 'lg:mt-0',
  headerRightContentMarginRight: 'mr-0',
  headerRightContentMarginRightWide: 'md:mr-0',
  headerRightContentMarginRightLg: 'lg:mr-0',
  headerRightContentMarginBottom: 'mb-0',
  headerRightContentMarginBottomWide: 'md:mb-0',
  headerRightContentMarginBottomLg: 'lg:mb-0',
  headerRightContentMarginLeft: 'ml-0',
  headerRightContentMarginLeftWide: 'md:ml-0',
  headerRightContentMarginLeftLg: 'lg:ml-0',
  bodyGutterPaddingLeft: 'pl-0',
  bodyGutterPaddingLeftWide: 'md:pl-0',
  bodyGutterPaddingLeftLg: 'lg:pl-0',
  bodyGutterPaddingRight: 'pr-0',
  bodyGutterPaddingRightWide: 'md:pr-0',
  bodyGutterPaddingRightLg: 'lg:pr-0',
  colorSourceWide: 'custom',
  colorSourceLg: 'custom',
  wideColumnCustomColorWide: '#191929',
  wideColumnCustomColorLg: '#191929',
  narrowColumnCustomColorWide: '#2c2c3f',
  narrowColumnCustomColorLg: '#cbcbe1',
  wideColumnSurfaceOffsetWide: 0,
  wideColumnSurfaceOffsetLg: 0,
  narrowColumnSurfaceOffsetWide: 0,
  narrowColumnSurfaceOffsetLg: 0,
  splitBandLeftCustomColorWide: '#0e1230',
  splitBandLeftCustomColorLg: '#d1d1e6',
  splitBandRightCustomColorWide: '#0e1230',
  splitBandRightCustomColorLg: '#0e1230',
  splitBandWidthTier: 'stacked',
  splitBandWidthTierWide: '38/62',
  splitBandWidthTierLg: '38/62',
};

// STOP — before pasting a component-config-update/v1 payload's `config:`
// block into this object: confirm the payload's own `target_symbol` line
// reads EXACTLY `ABOUT_POLYMORPHIC_LAYOUT_CONFIG`, not
// `ABSTRACT_POLYMORPHIC_LAYOUT_CONFIG` above. See that export's own
// matching warning for the full incident history — a field-name search
// alone matches both blocks, and this exact mix-up has happened more than
// once.
//
// Relocated verbatim from pages/about.config.ts (no value changes) — see
// that file's own preserved doc comment above the export for the full
// per-field reasoning (contentContainer: 'full-bleed' provenance, the
// 'bounded' narrow-column revert history, etc.).
export const ABOUT_POLYMORPHIC_LAYOUT_CONFIG: PolymorphicLayoutConfig = {
  wideColumnSide: 'right',
  narrowColumnWidthTierMd: '38/62',
  narrowColumnWidthTierLg: '38/62',
  stackedColumnOrder: 'narrowFirst',
  wideColumnHeaderBehavior: 'pushDown',
  narrowColumnHeaderBehavior: 'pushDown',
  legibilityScrimEnabled: false,
  wideColumnClearsFloatingHeader: false,
  wideColumnClearsFloatingHeaderWide: false,
  wideColumnClearsFloatingHeaderLg: false,
  narrowColumnClearsFloatingHeader: false,
  narrowColumnClearsFloatingHeaderWide: false,
  narrowColumnClearsFloatingHeaderLg: false,
  // 'custom' (was 'surface') — parity with colorSourceWide/colorSourceLg
  // below: the mobile tier previously fell through to the page's own
  // flat surface color instead of the same '#3d3d43' both columns paint
  // at every wider tier, so the column background visibly changed color
  // right at the mobile breakpoint even though nothing else about the
  // columns did. wideColumnCustomColor/narrowColumnCustomColor below are
  // now the same '#3d3d43' the Wide/Lg tiers use, not the unrelated
  // '#0e1230' placeholder this scope's colorSource: 'surface' had made
  // permanently inert.
  colorSource: 'custom',
  wideColumnCustomColor: '#cbcbe1',
  narrowColumnCustomColor: '#68689c',
  wideColumnSurfaceOffset: 0,
  narrowColumnSurfaceOffset: 0,
  headerSplitBandEnabled: true,
  splitBandLeftMode: 'syncWithColumnBelow',
  splitBandLeftCustomColor: '#0e1230',
  splitBandLeftModeWide: 'custom',
  splitBandLeftModeLg: 'custom',
  splitBandRightMode: 'custom',
  splitBandRightCustomColor: '#cbcbe1',
  splitBandRightModeWide: 'syncWithColumnBelow',
  splitBandRightModeLg: 'syncWithColumnBelow',
  contentContainer: 'full-bleed',
  wideColumnContentContainer: 'full-bleed',
  narrowColumnContentContainer: 'full-bleed',
  headerScrollBehavior: 'static',
  headerScrollBehaviorWide: 'fixed',
  headerScrollBehaviorLg: 'static',
  narrowColumnContentAlign: 'items-center',
  narrowColumnContentAlignWide: 'items-end',
  narrowColumnContentAlignLg: 'items-end',
  narrowColumnContentWidth: 'auto',
  narrowColumnContentWidthWide: 'md:max-w-[100%]',
  narrowColumnContentWidthLg: 'lg:max-w-[100%]',
  // 'none' below md (mobile is the accordion, not this column at all —
  // AboutTimeline itself is !isNarrowViewport-gated, pages/about.tsx).
  // md/lg: a real rem-based cap, finally giving narrowColumnContentAlignWide/
  // -Lg's own 'items-end' above (already configured — was already the
  // intended "align it right" value, just inert) real width slack to move
  // within — narrowColumnContentWidthWide/-Lg above can't provide that
  // slack themselves, since a percentage width silently falls back to full
  // under the containerQuery ancestor AboutTimeline renders inside
  // (`<NarrowColumnContent containerQuery>`, pages/about.tsx) — see
  // narrowColumnContentMaxWidth's own doc comment (PolymorphicLayout.config
  // .ts) for the full citation. Matches AboutTimeline's own component-level
  // maxWidthClassName default (max-w-md) by choice, not because the two
  // fields are coupled — they're independent knobs at different layers
  // (this one positions+caps the column's content box; that one caps the
  // component's own internal reading measure) that happen to agree here.
  narrowColumnContentMaxWidth: 'none',
  narrowColumnContentMaxWidthWide: 'none',
  narrowColumnContentMaxWidthLg: 'lg:max-w-md',
  narrowColumnTextAlign: 'text-left',
  narrowColumnTextAlignWide: 'md:text-right',
  narrowColumnTextAlignLg: 'lg:text-left',
  wideColumnContentAlign: 'items-start',
  wideColumnContentAlignWide: 'items-start',
  wideColumnContentAlignLg: 'items-start',
  wideColumnContentWidth: 'auto',
  wideColumnContentWidthWide: 'auto',
  wideColumnContentWidthLg: 'auto',
  wideColumnContentMaxWidth: 'none',
  wideColumnContentMaxWidthWide: 'none',
  wideColumnContentMaxWidthLg: 'none',
  wideColumnTextAlign: 'text-left',
  wideColumnTextAlignWide: 'md:text-left',
  wideColumnTextAlignLg: 'lg:text-left',
  narrowColumnContentVerticalAlign: 'justify-start',
  narrowColumnContentVerticalAlignWide: 'md:justify-start',
  narrowColumnContentVerticalAlignLg: 'lg:justify-start',
  wideColumnContentVerticalAlign: 'justify-start',
  wideColumnContentVerticalAlignWide: 'md:justify-start',
  wideColumnContentVerticalAlignLg: 'lg:justify-start',
  narrowColumnContentMinHeight: 'min-h-0',
  wideColumnContentMinHeight: 'min-h-0',
  narrowColumnMobileAlignOffsetPx: 0,
  narrowColumnContentPaddingLeft: 'pl-7',
  // md:pl-7/lg:pl-14 — was md:pl-4/lg:pl-0, both silently dead at every
  // viewport ≥768px: about.module.css's own .splitLeft padding-left rule
  // (live-measured from the header wordmark's own position) always won the
  // cascade over these regardless of their value, so this field never
  // actually painted anything at md/lg (see narrowColumnContentWidth-
  // DecoupledEnabled's own doc comment, about.config.ts, for the fix that
  // makes this field the real source again once an operator opts in).
  // Retuned to /abstract's own exact values (ABSTRACT_POLYMORPHIC_LAYOUT_
  // CONFIG above) rather than left at 0 — a literal 0 read as content
  // flush against the true viewport edge once this field went live, which
  // /abstract's own narrow column (no such dead-field history) never does.
  narrowColumnContentPaddingLeftWide: 'md:pl-0',
  narrowColumnContentPaddingLeftLg: 'lg:pl-0',
  narrowColumnContentPaddingRightWide: 'md:pr-7',
  narrowColumnContentPaddingRightLg: 'lg:pr-0',
  narrowColumnContentPaddingRight: 'pr-14',
  narrowColumnContentPaddingTop: 'pt-10',
  narrowColumnContentPaddingTopWide: 'md:pt-9',
  narrowColumnContentPaddingTopLg: 'lg:pt-0',
  narrowColumnContentPaddingBottom: 'pb-10',
  narrowColumnContentPaddingBottomWide: 'md:pb-0',
  narrowColumnContentPaddingBottomLg: 'lg:pb-0',
  narrowColumnContentMarginTop: 'mt-0',
  narrowColumnContentMarginTopWide: 'md:mt-0',
  narrowColumnContentMarginTopLg: 'lg:mt-0',
  narrowColumnContentMarginRight: 'mr-0',
  narrowColumnContentMarginRightWide: 'md:mr-0',
  narrowColumnContentMarginRightLg: 'lg:mr-0',
  narrowColumnContentMarginBottom: 'mb-0',
  narrowColumnContentMarginBottomWide: 'md:mb-0',
  narrowColumnContentMarginBottomLg: 'lg:mb-0',
  narrowColumnContentMarginLeft: 'ml-0',
  narrowColumnContentMarginLeftWide: 'md:ml-0',
  narrowColumnContentMarginLeftLg: 'lg:ml-0',
  wideColumnContentPaddingLeft: 'pl-0',
  wideColumnContentPaddingRight: 'pr-0',
  wideColumnContentPaddingLeftWide: 'md:pl-0',
  wideColumnContentPaddingLeftLg: 'lg:pl-0',
  wideColumnContentPaddingRightWide: 'md:pr-0',
  wideColumnContentPaddingRightLg: 'lg:pr-0',
  wideColumnContentPaddingTop: 'pt-0',
  wideColumnContentPaddingTopWide: 'md:pt-0',
  wideColumnContentPaddingTopLg: 'lg:pt-0',
  wideColumnContentPaddingBottom: 'pb-0',
  wideColumnContentPaddingBottomWide: 'md:pb-0',
  wideColumnContentPaddingBottomLg: 'lg:pb-0',
  wideColumnContentMarginTop: 'mt-0',
  wideColumnContentMarginTopWide: 'md:mt-0',
  wideColumnContentMarginTopLg: 'lg:mt-0',
  wideColumnContentMarginRight: 'mr-0',
  wideColumnContentMarginRightWide: 'md:mr-0',
  wideColumnContentMarginRightLg: 'lg:mr-0',
  wideColumnContentMarginBottom: 'mb-0',
  wideColumnContentMarginBottomWide: 'md:mb-0',
  wideColumnContentMarginBottomLg: 'lg:mb-0',
  wideColumnContentMarginLeft: 'ml-0',
  wideColumnContentMarginLeftWide: 'md:ml-0',
  wideColumnContentMarginLeftLg: 'lg:ml-0',
  headerLeftSegmentAlign: 'justify-center',
  headerLeftSegmentAlignWide: 'md:justify-end',
  headerLeftSegmentAlignLg: 'lg:justify-end',
  headerLeftSegmentVerticalAlign: 'items-center',
  headerLeftSegmentVerticalAlignWide: 'md:items-center',
  headerLeftSegmentVerticalAlignLg: 'lg:items-center',
  headerLeftContentWidth: 'max-w-[90%]',
  headerLeftContentWidthWide: 'md:max-w-[100%]',
  headerLeftContentWidthLg: 'lg:max-w-[100%]',
  headerRightSegmentAlign: 'justify-center',
  headerRightSegmentAlignWide: 'md:justify-start',
  headerRightSegmentAlignLg: 'lg:justify-start',
  headerRightSegmentVerticalAlign: 'items-center',
  headerRightSegmentVerticalAlignWide: 'md:items-center',
  headerRightSegmentVerticalAlignLg: 'lg:items-center',
  headerRightContentWidth: 'max-w-[80%]',
  headerRightContentWidthWide: 'auto',
  headerRightContentWidthLg: 'auto',
  headerLeftInnerAlign: 'justify-center',
  headerLeftInnerAlignWide: 'md:justify-end',
  headerLeftInnerAlignLg: 'lg:justify-end',
  headerRightInnerAlign: 'justify-center',
  headerRightInnerAlignWide: 'md:justify-start',
  headerRightInnerAlignLg: 'lg:justify-start',
  headerLeftContentPaddingTop: 'pt-0',
  headerLeftContentPaddingTopWide: 'md:pt-0',
  headerLeftContentPaddingTopLg: 'lg:pt-0',
  headerLeftContentPaddingRight: 'pr-0',
  headerLeftContentPaddingRightWide: 'md:pr-7',
  headerLeftContentPaddingRightLg: 'lg:pr-14',
  headerLeftContentPaddingBottom: 'pb-0',
  headerLeftContentPaddingBottomWide: 'md:pb-0',
  headerLeftContentPaddingBottomLg: 'lg:pb-0',
  headerLeftContentPaddingLeft: 'pl-0',
  headerLeftContentPaddingLeftWide: 'md:pl-0',
  headerLeftContentPaddingLeftLg: 'lg:pl-0',
  headerLeftContentMarginTop: 'mt-0',
  headerLeftContentMarginTopWide: 'md:mt-0',
  headerLeftContentMarginTopLg: 'lg:mt-0',
  headerLeftContentMarginRight: 'mr-0',
  headerLeftContentMarginRightWide: 'md:mr-0',
  headerLeftContentMarginRightLg: 'lg:mr-0',
  headerLeftContentMarginBottom: 'mb-0',
  headerLeftContentMarginBottomWide: 'md:mb-0',
  headerLeftContentMarginBottomLg: 'lg:mb-0',
  headerLeftContentMarginLeft: 'ml-0',
  headerLeftContentMarginLeftWide: 'md:ml-0',
  headerLeftContentMarginLeftLg: 'lg:ml-0',
  headerRightContentPaddingTop: 'pt-0',
  headerRightContentPaddingTopWide: 'md:pt-0',
  headerRightContentPaddingTopLg: 'lg:pt-0',
  headerRightContentPaddingRight: 'pr-0',
  headerRightContentPaddingRightWide: 'md:pr-0',
  headerRightContentPaddingRightLg: 'lg:pr-0',
  headerRightContentPaddingBottom: 'pb-0',
  headerRightContentPaddingBottomWide: 'md:pb-0',
  headerRightContentPaddingBottomLg: 'lg:pb-0',
  headerRightContentPaddingLeft: 'pl-0',
  headerRightContentPaddingLeftWide: 'md:pl-7',
  headerRightContentPaddingLeftLg: 'lg:pl-14',
  headerRightContentMarginTop: 'mt-0',
  headerRightContentMarginTopWide: 'md:mt-0',
  headerRightContentMarginTopLg: 'lg:mt-0',
  headerRightContentMarginRight: 'mr-0',
  headerRightContentMarginRightWide: 'md:mr-0',
  headerRightContentMarginRightLg: 'lg:mr-0',
  headerRightContentMarginBottom: 'mb-0',
  headerRightContentMarginBottomWide: 'md:mb-0',
  headerRightContentMarginBottomLg: 'lg:mb-0',
  headerRightContentMarginLeft: 'ml-0',
  headerRightContentMarginLeftWide: 'md:ml-0',
  headerRightContentMarginLeftLg: 'lg:ml-0',
  bodyGutterPaddingLeft: 'pl-0',
  bodyGutterPaddingLeftWide: 'md:pl-0',
  bodyGutterPaddingLeftLg: 'lg:pl-0',
  bodyGutterPaddingRight: 'pr-0',
  bodyGutterPaddingRightWide: 'md:pr-0',
  bodyGutterPaddingRightLg: 'lg:pr-0',
  // colorSourceWide: 'custom' (was 'surface') — parity with colorSourceLg,
  // so the md tier (768-1024px, "Wide") paints the exact same column
  // background the lg tier ("Lg", ≥1024px) does instead of falling back to
  // the page surface color one tier before the real mobile breakpoint. See
  // colorSource's own doc comment above for the matching mobile-tier fix.
  colorSourceWide: 'custom',
  colorSourceLg: 'custom',
  // wideColumnCustomColorWide/-Lg: both '#3d3d43' — was '#d3d4de'/-Wide,
  // parity fix (see colorSourceWide's own doc comment above). '#3d3d43' on
  // the Lg field itself has its own separate history: the operator's own
  // component-config-update/v1 prompt (2026-08-24, target_symbol:
  // ABOUT_POLYMORPHIC_LAYOUT_CONFIG) requesting '#30313b' never actually
  // landed here — a prior turn verified against
  // PolymorphicLayout.pageConfigs.ts:251, which is
  // ABSTRACT_POLYMORPHIC_LAYOUT_CONFIG's own field (lines 43-270; this
  // page's own config starts at line 271) — a different export that
  // coincidentally already had '#30313b', reported as "already applied"
  // without confirming which constant that line actually belonged to. See
  // pages/about.tsx's own wideColumnStyle doc comment for the OTHER half of
  // this incident — this value was also, independently, never actually
  // painted anywhere on the page at all until that fix.
  wideColumnCustomColorWide: '#191929',
  wideColumnCustomColorLg: '#191929',
  // Was '#dadbe2' — parity fix, same reason as wideColumnCustomColorWide
  // above (colorSourceWide's own doc comment).
  narrowColumnCustomColorWide: '#cbcbe1',
  narrowColumnCustomColorLg: '#cbcbe1',
  wideColumnSurfaceOffsetWide: 0,
  wideColumnSurfaceOffsetLg: 0,
  narrowColumnSurfaceOffsetWide: 0,
  narrowColumnSurfaceOffsetLg: 0,
  splitBandLeftCustomColorWide: '#d1d1e6',
  splitBandLeftCustomColorLg: '#d1d1e6',
  splitBandRightCustomColorWide: '#27307c',
  splitBandRightCustomColorLg: '#27307c',
  splitBandWidthTier: 'stacked',
  splitBandWidthTierWide: '38/62',
  splitBandWidthTierLg: '38/62',
};

/**
 * /posts-lab's own instance — previously this page had no real instance of
 * its own at all: `pages/posts-lab/postLab.config.ts` re-exported
 * `DEFAULT_POLYMORPHIC_LAYOUT_CONFIG` verbatim under an alias, meaning any
 * future change to the shared library default would have silently changed
 * posts-lab's own rendered layout too — exactly the drift risk
 * PLAN-CONFIG-SCOPE-PAGE-OWNERSHIP.md's "never spread/reuse a shared
 * `DEFAULT_..._CONFIG` as a page's own value" warning targets, just via
 * re-export instead of spread. This is a genuine, independent copy — today
 * numerically identical to `DEFAULT_POLYMORPHIC_LAYOUT_CONFIG` (posts-lab
 * was this type's origin page, so that's the correct starting point, not a
 * placeholder), but now `satisfies`-checked and free to diverge on its own
 * without affecting `/abstract` or `/about`, or being affected by a future
 * change to the shared default.
 */
export const POST_LAB_POLYMORPHIC_LAYOUT_CONFIG: PolymorphicLayoutConfig = {
  ...DEFAULT_POLYMORPHIC_LAYOUT_CONFIG,
  narrowColumnContentWidthLg: 'lg:max-w-[60%]',
  narrowColumnContentPaddingLeftLg: 'lg:pl-0',
  narrowColumnContentPaddingRightLg: 'lg:pr-7',
  narrowColumnContentPaddingTopWide: 'md:pt-7',
  narrowColumnContentPaddingTopLg: 'lg:pt-7',
};
