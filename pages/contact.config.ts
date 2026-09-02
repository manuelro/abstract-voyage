import {
  POLYMORPHIC_LAYOUT_HEADER_SEGMENT_DEFAULTS,
  type PolymorphicLayoutConfig,
} from '../experiences/abstract/components/PolymorphicLayout.config'

// /contact's own PolymorphicLayoutConfig instance (per-page config ownership
// pattern — see pages/about.config.ts's own ABOUT_POLYMORPHIC_LAYOUT_CONFIG,
// the working precedent this mirrors). Unlike /about and /posts-lab, /contact
// never splits into two real columns at any breakpoint
// (narrowColumnWidthTierMd/Lg: 'stacked' — see components/SplitColumnLayout.tsx's
// own resolveGridColsClassName, which emits no md:/lg: grid-cols fragment at
// all for a 'stacked' tier) — its real content lives entirely in the
// narrowColumn slot (DOM-first under the default stackedColumnOrder:
// 'narrowFirst', so no extra config is needed to keep it first), wideColumn
// stays empty. See PLAN-CONTACT-POLYMORPHIC-LAYOUT.md for the full
// capability-design audit this config's values were derived from.
export const CONTACT_POLYMORPHIC_LAYOUT_CONFIG = {
  layoutMode: 'centered',
  centeredContentMaxWidth: 'max-w-none',
  centeredContentPaddingX: 'px-0',
  wideColumnSide: 'right',
  narrowColumnWidthTierMd: 'stacked',
  narrowColumnWidthTierLg: 'stacked',
  stackedColumnOrder: 'narrowFirst',
  // Inert: headerScrollBehavior: 'static' below forces both
  // *ColumnHeaderBehavior and legibilityScrimEnabled inert internally
  // (components/SplitColumnPageShell.tsx's own headerPositionMode !== 'static'
  // gating) — set to the type's own sensible defaults, never actually read.
  wideColumnHeaderBehavior: 'pushDown',
  narrowColumnHeaderBehavior: 'pushDown',
  legibilityScrimEnabled: false,
  // Both inert given both *ColumnHeaderBehavior above are 'pushDown' —
  // same reasoning as the block comment above this one.
  wideColumnClearsFloatingHeader: false,
  wideColumnClearsFloatingHeaderWide: false,
  wideColumnClearsFloatingHeaderLg: false,
  narrowColumnClearsFloatingHeader: false,
  narrowColumnClearsFloatingHeaderWide: false,
  narrowColumnClearsFloatingHeaderLg: false,
  // No column background — matches /contact's current flat single-
  // page-surface-color <main>, with no per-column tinting.
  colorSource: 'none',
  // Inert given colorSource: 'none' — never read, carried over verbatim.
  wideColumnCustomColor: '#0e1230',
  narrowColumnCustomColor: '#0e1230',
  wideColumnSurfaceOffset: 0,
  narrowColumnSurfaceOffset: 0,
  // /contact never renders a split band today.
  headerSplitBandEnabled: false,
  // Inert given headerSplitBandEnabled: false — never read.
  splitBandLeftMode: 'syncWithColumnBelow',
  splitBandLeftCustomColor: '#0e1230',
  splitBandLeftModeWide: 'syncWithColumnBelow',
  splitBandLeftModeLg: 'syncWithColumnBelow',
  splitBandRightMode: 'syncWithColumnBelow',
  splitBandRightCustomColor: '#0e1230',
  splitBandRightModeWide: 'syncWithColumnBelow',
  splitBandRightModeLg: 'syncWithColumnBelow',
  // No PageContainer/gutter wrapper — /contact's own JSX supplies the outer
  // gutter (PAGE_CONTENT_GUTTER_CLASSNAME) directly on the
  // FixedViewportColumnContent anchor, since that constant's own custom
  // arbitrary-value breakpoints (max-[359px]:/min-[600px]:) have no exact
  // equivalent in this scope's 3-tier bodyGutterPadding* fields.
  contentContainer: 'full-bleed',
  wideColumnContentContainer: 'full-bleed',
  wideColumnContentHeight: 'auto',
  narrowColumnContentContainer: 'full-bleed',
  narrowColumnContentHeight: 'auto',
  // /contact's header renders in normal document flow today (not
  // fixed/sticky) — reproduced exactly by 'static'
  // (components/SplitColumnPageShell.tsx's own HEADER_POSITION_CLASS).
  headerScrollBehavior: 'static',
  // Same value at every tier — /contact's header is static document-flow at
  // every breakpoint today, so completing the triplet with matching values
  // changes nothing until an operator diverges one deliberately.
  headerScrollBehaviorWide: 'static',
  headerScrollBehaviorLg: 'static',
  // Inert given narrowColumnContentContainer: 'full-bleed' — gated out by
  // NarrowColumnContent's own early-return, never read. Composer content
  // supplies its own width-cap/centering directly (see contact.tsx's own
  // FixedViewportColumnContent anchorClassName) rather than through this
  // mechanism — see PLAN-CONTACT-POLYMORPHIC-LAYOUT.md's own reasoning for
  // why 'full-bleed' is the correct choice here, unchanged by the
  // base/Wide/Lg tiering below.
  narrowColumnContentAlign: 'items-end',
  narrowColumnContentAlignWide: 'items-end',
  narrowColumnContentAlignLg: 'items-end',
  narrowColumnContentWidth: 'auto',
  narrowColumnContentWidthWide: 'md:max-w-[100%]',
  narrowColumnContentWidthLg: 'lg:max-w-[100%]',
  narrowColumnContentMaxWidth: 'none',
  narrowColumnContentMaxWidthWide: 'none',
  narrowColumnContentMaxWidthLg: 'none',
  narrowColumnTextAlign: 'text-left',
  narrowColumnTextAlignWide: 'md:text-left',
  narrowColumnTextAlignLg: 'lg:text-left',
  narrowColumnContentVerticalAlign: 'justify-start',
  narrowColumnContentVerticalAlignWide: 'md:justify-start',
  narrowColumnContentVerticalAlignLg: 'lg:justify-start',
  narrowColumnContentMinHeight: 'min-h-0',
  // Inert given wideColumnContentContainer: 'full-bleed' (and wideColumn is
  // always empty regardless) — gated out by WideColumnContent's own
  // early-return, never read.
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
  wideColumnContentVerticalAlign: 'justify-start',
  wideColumnContentVerticalAlignWide: 'md:justify-start',
  wideColumnContentVerticalAlignLg: 'lg:justify-start',
  wideColumnContentMinHeight: 'min-h-0',
  // Only affects the below-md nav-boundary nudge for a live-measured split
  // seam that never exists here (desktopNavAlignmentActive is always false
  // once both ratio tiers above are 'stacked') — moot, zeroed.
  narrowColumnMobileAlignOffsetPx: 0,
  // The narrow column's own outer grid-cell padding/margin — NOT gated by
  // full-bleed (buildNarrowColumnClassName applies these regardless of
  // narrowColumnContentContainer). Zeroed: /contact's own JSX supplies its
  // own gutter/width-cap/padding directly on the FixedViewportColumnContent
  // anchor inside this cell, so any padding contributed here would only be
  // additive dead space outside that anchor's own zero-height, non-visual box.
  narrowColumnContentPaddingLeft: 'pl-0',
  narrowColumnContentPaddingLeftWide: 'md:pl-0',
  narrowColumnContentPaddingLeftLg: 'lg:pl-0',
  narrowColumnContentPaddingRightWide: 'md:pr-0',
  narrowColumnContentPaddingRightLg: 'lg:pr-0',
  narrowColumnContentPaddingRight: 'pr-0',
  narrowColumnContentPaddingTop: 'pt-0',
  narrowColumnContentPaddingTopWide: 'md:pt-0',
  narrowColumnContentPaddingTopLg: 'lg:pt-0',
  narrowColumnContentPaddingBottom: 'pb-0',
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
  // Same reasoning as the narrow-column padding/margin above — wideColumn is
  // always empty, so these are inert regardless, zeroed for cleanliness.
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
  // Header segment/content alignment — the shared primitive
  // (components/PolymorphicLayout.config.ts's own
  // POLYMORPHIC_LAYOUT_HEADER_SEGMENT_DEFAULTS), spread in directly rather
  // than retyped, so this can never independently drift from what
  // about.config.ts (or any future PolymorphicLayout page) uses. An earlier
  // version of this file retyped a contact-specific translation of
  // SiteHeaderConfig's legacy per-page defaults instead, which
  // produced a real, visible inconsistency (found via a cross-page layout
  // debug overlay comparison: contact's own HEADER · RIGHT CONTENT box had
  // no max-width cap and no centering, unlike every other PolymorphicLayout
  // page's) — exactly the class of bug this shared constant exists to make
  // structurally impossible going forward.
  ...POLYMORPHIC_LAYOUT_HEADER_SEGMENT_DEFAULTS,
  headerLeftContentPaddingTop: 'pt-0',
  headerLeftContentPaddingTopWide: 'md:pt-0',
  headerLeftContentPaddingTopLg: 'lg:pt-0',
  headerLeftContentPaddingRight: 'pr-0',
  // Substitutes for the logo↔nav gap that navContentGapPx
  // (SPLIT_ALIGNED_NAV_CONTENT_GAP_PX, = 32) used to produce via a now-
  // permanently-disabled legacy inline-style mechanism
  // (PolymorphicLayout.tsx's own unconditional logoContentGapPaddingEnabled:
  // false). md:pr-8 (32px) reproduces the pre-migration gap exactly at
  // tablet width — verified via live DOM measurement against the
  // pre-migration baseline. lg:pr-14 (56px) is a deliberate operator
  // override at desktop width (COPY'd from the live panel, 2026-08-17),
  // wider than the pre-migration 32px baseline — not a bug, a live tuning
  // decision.
  headerLeftContentPaddingRightWide: 'md:pr-8',
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
  // Inert — contentContainer: 'full-bleed' means no PageContainer wrapper
  // (the only consumer of these fields) ever exists.
  bodyGutterPaddingLeft: 'pl-0',
  bodyGutterPaddingLeftWide: 'md:pl-0',
  bodyGutterPaddingLeftLg: 'lg:pl-0',
  bodyGutterPaddingRight: 'pr-0',
  bodyGutterPaddingRightWide: 'md:pr-0',
  bodyGutterPaddingRightLg: 'lg:pr-0',
  // Inert given colorSource: 'none' — never read.
  colorSourceWide: 'none',
  colorSourceLg: 'none',
  wideColumnCustomColorWide: '#0e1230',
  wideColumnCustomColorLg: '#0e1230',
  narrowColumnCustomColorWide: '#0e1230',
  narrowColumnCustomColorLg: '#0e1230',
  wideColumnSurfaceOffsetWide: 0,
  wideColumnSurfaceOffsetLg: 0,
  narrowColumnSurfaceOffsetWide: 0,
  narrowColumnSurfaceOffsetLg: 0,
  // Inert given headerSplitBandEnabled: false — never read.
  splitBandLeftCustomColorWide: '#0e1230',
  splitBandLeftCustomColorLg: '#0e1230',
  splitBandRightCustomColorWide: '#0e1230',
  splitBandRightCustomColorLg: '#0e1230',
  splitBandWidthTier: 'stacked',
  splitBandWidthTierWide: '38/62',
  splitBandWidthTierLg: '38/62',
} satisfies PolymorphicLayoutConfig
