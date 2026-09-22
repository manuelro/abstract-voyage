import type { CtaButtonMotionEasing } from '../../components/CtaButton/config/registered';
import type {
  FontSizeClass, MdFontSizeClass, LgFontSizeClass,
  LeadingClass, MdLeadingClass, LgLeadingClass,
  FontWeightClass,
} from '../../components/tailwindTypographyScale';

/** Confirm-screen button label font-weight, `md:`/`lg:`-prefixed. Local
 * catalog — no shared `FontWeightWideClass`/`-LgClass` exists yet in
 * `tailwindTypographyScale.ts` — same values as the shared `FontWeightClass`
 * there, each breakpoint-prefixed, mirroring AboutTimeline.config.ts's own
 * identical FONT_WEIGHT_WIDE_OPTIONS/FONT_WEIGHT_LG_OPTIONS precedent. */
export const CONTACT_BUTTON_FONT_WEIGHT_WIDE_OPTIONS = [
  { label: 'md:font-normal', value: 'md:font-normal' },
  { label: 'md:font-medium', value: 'md:font-medium' },
  { label: 'md:font-semibold', value: 'md:font-semibold' },
  { label: 'md:font-bold', value: 'md:font-bold' },
] as const;
export type ContactButtonFontWeightWideClass =
  typeof CONTACT_BUTTON_FONT_WEIGHT_WIDE_OPTIONS[number]['value'];
export const CONTACT_BUTTON_FONT_WEIGHT_LG_OPTIONS = [
  { label: 'lg:font-normal', value: 'lg:font-normal' },
  { label: 'lg:font-medium', value: 'lg:font-medium' },
  { label: 'lg:font-semibold', value: 'lg:font-semibold' },
  { label: 'lg:font-bold', value: 'lg:font-bold' },
] as const;
export type ContactButtonFontWeightLgClass =
  typeof CONTACT_BUTTON_FONT_WEIGHT_LG_OPTIONS[number]['value'];

export type ContactLoadingLabelMode = 'thinking' | 'submitted-message';
export type ContactLoadingEffectStyle = 'shimmer' | 'pulse' | 'static';
export type ContactMessageTextAlign = 'left' | 'center';
/**
 * 'auto': derive message text color from the page surface color the same
 * way CtaButton's own textColorMode: 'auto' does (see resolveAutoTextColor
 * in components/CtaButton.tsx) — a contrast-driven tint of the surface's own
 * hue, not a flat hardcoded gray. 'custom': use primaryTextColor verbatim,
 * exactly as before this mode existed.
 */
export type ContactMessageTextColorMode = 'auto' | 'custom';
/** 'word' (default): whole words fade in, in reading order — the right
 * choice for prose meant to be read (a per-character sweep across a real
 * paragraph fights legibility, since a half-drawn word can't be read).
 * 'char': every character its own unit — reserved for short, non-prose
 * text; the composer's own placeholder always uses this, unconditionally,
 * since "reads as information" doesn't apply to placeholder text. */
export type ContactHeroGreetingRevealUnit = 'char' | 'word';

/** Tailwind-token unions for the below-pill mandatory-actions row (email
 * fallback + whatever step-specific link sits beside it) — literal classes
 * only, per this codebase's Tailwind-only styling rule, not a raw px
 * number formatted into a CSS var the way most of this file's other
 * spacing fields work. Requested explicitly as config-driven Tailwind
 * tokens rather than the numeric-px/CSS-var idiom used elsewhere in this
 * file, matching the same literal-class-union precedent already
 * established for other components' own padding/gap tokens (e.g.
 * SiteHeaderConfig's SiteHeaderPaddingX, PolymorphicLayoutConfig's
 * PaddingTopClass). */
export type ContactMandatoryActionsFontSize = 'text-xs' | 'text-sm' | 'text-base' | 'text-lg';
/** gap-*, not pt-* — the space between the dock's main content and this
 * row is between two flex siblings, which `gap` is the actual CSS property
 * for; a top-padding token here fights the dock's own shared flex `gap`
 * instead of controlling anything directly (confirmed live, 2026-09-21:
 * every padding side at 0 still left the shared gap's space fully visible
 * — see pages/contact.tsx's own dockRef restructuring for the fix this
 * type reflects). */
export type ContactMandatoryActionsTopGap = 'gap-0' | 'gap-1' | 'gap-2' | 'gap-3' | 'gap-4' | 'gap-5' | 'gap-6' | 'gap-8';
export type ContactMandatoryActionsPaddingRight = 'pr-0' | 'pr-1' | 'pr-2' | 'pr-3' | 'pr-4' | 'pr-5' | 'pr-6' | 'pr-8';
export type ContactMandatoryActionsPaddingBottom = 'pb-0' | 'pb-1' | 'pb-2' | 'pb-3' | 'pb-4' | 'pb-5' | 'pb-6' | 'pb-8';
export type ContactMandatoryActionsPaddingLeft = 'pl-0' | 'pl-1' | 'pl-2' | 'pl-3' | 'pl-4' | 'pl-5' | 'pl-6' | 'pl-8';

export type ContactExperienceConfig = {
  // The page-level container width/gutter (formerly contentMaxWidthPx/
  // mobileInsetPx) is now the shared components/PageSurface.config.ts scope
  // — see pages/contact.tsx's own pageSurfaceConfig state. conversationMaxWidthPx
  // stays here: it's the inner chat column's own reading-width cap, a
  // contact-specific concern (analogous to AbstractEditorialHeroConfig's own
  // hero-column contentMaxWidthPx), not the shared page container.
  conversationMaxWidthPx: number;
  desktopColumnGapPx: number;
  opticalOffsetYVh: number;
  messageMeasureCh: number;
  /** Literal Tailwind typography tokens (components/tailwindTypographyScale.ts
   * — the same shared FontSizeClass/LeadingClass catalog SelectConfigField
   * consumers elsewhere in this codebase already read from, e.g.
   * AboutTimeline.panel.ts's own descriptionFontSizeClassName), not a raw
   * px/decimal number formatted into a CSS custom property. Base/Wide/Lg
   * triplet — same "one flat value" -> "segregated per breakpoint"
   * convention PolymorphicLayoutConfig already uses everywhere (contact.
   * config.ts's own scrollGradient-prefixed base/Wide/Lg fields), applied
   * here via the
   * panel's device-size `kind: 'tabs'` switcher (MOBILE/TABLET/DESKTOP —
   * see ContactExperience.panel.ts), the same tabs primitive AboutTimeline.
   * panel.ts's own font-size/line-height fields already use, rather than
   * three flat sibling fields with no tab grouping. Previously a single
   * plain-number field applying at every viewport width; verified against
   * the panel (2026-09-21) — font size/line height WERE already
   * panel-configurable, just not tiered, and stored as raw px/decimal
   * numbers rather than Tailwind tokens (both corrected here, 2026-09-21).
   * Wide/Lg values are the FULL prefixed class (`md:text-lg`, `lg:leading-
   * relaxed`, ...) — applied directly in JSX, no CSS-custom-property
   * indirection needed, since Tailwind's own responsive variants already
   * do exactly this job. */
  baseTextSize: FontSizeClass;
  baseTextSizeWide: MdFontSizeClass;
  baseTextSizeLg: LgFontSizeClass;
  conversationTextSize: FontSizeClass;
  conversationTextSizeWide: MdFontSizeClass;
  conversationTextSizeLg: LgFontSizeClass;
  lineHeight: LeadingClass;
  lineHeightWide: MdLeadingClass;
  lineHeightLg: LgLeadingClass;
  mutedTextOpacity: number;
  /** Recap-turn body text only (the visitor's own words, reflected back) —
   * distinct from mutedTextOpacity: this sits between the muted label tier
   * and full-contrast primary, so the recap body reads as calm reference
   * copy that recedes on its own, leaving recapQuestion (plain full-contrast
   * primary, no added weight — bold on a full sentence reads as shouting,
   * not priority) as the only full-opacity text in the turn. See
   * pages/contact.tsx's recap turn rendering. */
  recapBodyTextOpacity: number;
  messageGapPx: number;
  controlGapPx: number;
  actionGapPx: number;
  chipHeightPx: number;
  chipPaddingXPx: number;
  /** A floor, not a fixed size: the message scroll region now stretches
   * (flex-1) to fill whatever vertical space is actually available between
   * the header and the composer, so it can grow to use "all the space at
   * the top" instead of sitting in a small fixed box. This value only
   * guarantees a minimum on short viewports where that available space
   * would otherwise be cramped — see pages/contact.tsx's GuidedIntake. */
  conversationViewportHeightPx: number;
  loadingEffectEnabled: boolean;
  loadingLabelMode: ContactLoadingLabelMode;
  loadingEffectStyle: ContactLoadingEffectStyle;
  loadingShimmerDurationMs: number;
  loadingMinimumVisibleMs: number;
  messageEntryDurationMs: number;
  showProgress: boolean;
  primaryTextColor: string;
  messageTextColorMode: ContactMessageTextColorMode;
  /** Minimum contrast ratio the auto-picked message text must clear against
   * the page surface color — WCAG AA body-text floor (4.5), a stricter bar
   * than CtaButton's own decorative-button floor (3) since this is read as
   * running prose, not a short label. Only used while messageTextColorMode
   * is 'auto'. */
  messageAutoTextMinContrast: number;
  /** Governs each turn's own paragraph text only — the outer block is
   * deliberately always horizontally centered in the column regardless of
   * this setting (see GuidedIntake's turns.map), a calm/editorial choice
   * kept over a per-speaker chat layout. */
  messageTextAlign: ContactMessageTextAlign;
  /** Font size of the below-pill mandatory-actions row — the email
   * fallback link, plus whatever step-specific link/label sits beside it
   * (e.g. "Use my original words," "Edit identity"). Was a hardcoded
   * text-sm class directly on that row's own JSX; this is the config-driven
   * replacement. */
  mandatoryActionsFontSize: ContactMandatoryActionsFontSize;
  /** The dedicated space between the dock's main content (greeting/
   * composer/confirm/failed states) and the mandatory-actions row below —
   * a real `gap` on their shared flex-column parent (dockRef), not a
   * padding-top-plus-negative-margin workaround (see
   * ContactMandatoryActionsTopGap's own doc comment for why gap, not
   * padding, is the correct property here). Independent of messageGapPx,
   * which still governs spacing *within* the dock's main content group.
   * Defaults to gap-0 per an explicit operator decision — zero really
   * means flush against the pill, not the old shared-gap spacing. */
  mandatoryActionsTopGap: ContactMandatoryActionsTopGap;
  /** Padding on the same below-pill mandatory-actions row's own box —
   * right/bottom/left only (see mandatoryActionsTopGap above for why top
   * is a gap, not a padding, on this row). All three default to 0
   * (pr-0/pb-0/pl-0), reproducing this row's previous unpadded rendering
   * exactly until an operator opts into more. */
  mandatoryActionsPaddingRight: ContactMandatoryActionsPaddingRight;
  mandatoryActionsPaddingBottom: ContactMandatoryActionsPaddingBottom;
  mandatoryActionsPaddingLeft: ContactMandatoryActionsPaddingLeft;
  /** Opt-in gate for the "Use my original words" link in the same below-pill
   * row (pages/contact.tsx's own canUseOriginalWords/handleSendAsIs) — lets
   * a visitor bypass the AI-organized recap and send their own raw wording
   * verbatim. Default false: removed from the default experience (operator
   * ask, 2026-09-21) rather than always-on: the recap step exists so the
   * agent can shape a rough message before it reaches Manuel, and a
   * permanently visible "skip that entirely" escape hatch undercuts the
   * page's own stated value proposition ("An agent listens first... helps
   * shape it") for every visitor by default, not just the rare one who
   * genuinely wants raw passthrough. Still fully available — 'true' brings
   * back the exact prior behavior (link visible at the same
   * reply-route/name/confirm steps, same handleSendAsIs handler),
   * unaffected either way by every other change in this session's own
   * gradient/typography work above. */
  useOriginalWordsActionEnabled: boolean;
  /** How many of the most recent turns stay visible at all — older turns are
   * dropped from the DOM entirely (not just faded out), so this is also the
   * fade window's own length: the oldest of the n visible turns always lands
   * at messageFadeFloorOpacity, deterministically, regardless of how long
   * the conversation actually runs. */
  messageVisibleCount: number;
  /** Opacity the oldest visible message (the nth from the top, once the fade
   * window is fully populated) fades down to; the newest message always
   * stays at full opacity. Linear interpolation between the two across the
   * visible window. */
  messageFadeFloorOpacity: number;
  /** Same 'auto'/'custom' contract as messageTextColorMode above, applied to
   * the muted-tier text (the composer placeholder, "Send as is," turn
   * labels) instead of the primary reading text. Previously always a flat
   * hardcoded gray (#7c7c83) regardless of the page surface color — legible
   * by coincidence against this page's original dark surface, not because
   * it was actually deriving from it; a bright/light surface (e.g. an
   * operator-set page-surface color) could silently leave it unreadable.
   * 'auto' (new default) closes that gap the same way messageTextColorMode
   * already did for primary text. */
  mutedTextColorMode: ContactMessageTextColorMode;
  /** Minimum contrast ratio the auto-picked muted text must clear against
   * the page surface — deliberately lower than messageAutoTextMinContrast
   * (this tier is supposed to visually recede, not read as primary copy),
   * but still a real, checked floor rather than an unconstrained tint. */
  mutedAutoTextMinContrast: number;
  mutedTextColor: string;
  /** Same 'auto'/'custom' contract, applied to control borders/dividers
   * (--contact-border and its color-mix'd subtle/hover/focus variants)
   * instead of text. Same "was a flat hardcoded gray, not actually
   * surface-derived" gap as mutedTextColorMode above. */
  borderColorMode: ContactMessageTextColorMode;
  /** Minimum contrast ratio the auto-picked border color must clear against
   * the page surface — a low floor (matches composerPlaceholderMinContrast's
   * own precedent) since a border only needs to be visible, not legible as
   * text. */
  borderAutoTextMinContrast: number;
  borderColor: string;
  /** The confirm screen's two actions ("Send note to Manuel" / "Edit note" —
   * pages/contact.tsx's own primaryCtaButtonConfig/secondaryCtaButtonConfig)
   * both render solid-filled, with a real visual primary/secondary
   * hierarchy (operator-reported, 2026-09-21: the edit button read as
   * disabled/inert next to the send button's solid fill). The primary
   * ("Send note to Manuel") owns its own explicit fill + border colors
   * here — rather than inheriting them from the shared, site-wide
   * ctaButtonConfig — so this page can tune them independently. Only two
   * states are configurable, not three: resting ("default") and a single
   * unified hover/active color, since CtaButtonConfig has no distinct third
   * "active" slot and this page deliberately renders active identically to
   * hover (a real click is simultaneously :hover and :active anyway — see
   * pages/contact.tsx's own ctaButtonActiveClassName, which just repoints
   * --cta-background/--cta-border to the same --cta-hover-background/
   * -border custom properties CtaButton.tsx already sets for hover,
   * guaranteeing the two states can never visually diverge). */
  primaryButtonBackgroundColor: string;
  primaryButtonHoverActiveBackgroundColor: string;
  primaryButtonBorderColor: string;
  primaryButtonHoverActiveBorderColor: string;
  /** The secondary ("Edit note") action never owns its own fill/border hex
   * values — it always derives from the primary button's own colors above,
   * darkened by these relative amounts (deriveSurfaceColor's signed HSL
   * offset convention: 0 = identical to the primary, 1 = fully black).
   * Segregated the same way the primary's own colors are (fill vs. border,
   * default vs. unified hover/active) so, e.g., the border can stay close
   * to the primary's while the fill reads distinctly darker. */
  secondaryButtonBackgroundDarkenAmount: number;
  secondaryButtonHoverActiveBackgroundDarkenAmount: number;
  secondaryButtonBorderDarkenAmount: number;
  secondaryButtonHoverActiveBorderDarkenAmount: number;
  /** Confirm-screen button label typography (Send note to Manuel/Edit note/
   * Try sending again) — CtaButtonConfig's own `fontSize` is a single flat
   * token with no breakpoint tiering, and its font-weight isn't
   * config-driven at all (hardcoded `font-medium` on CtaButton's own inner
   * surface span, which a consumer's `className` prop can't reach since
   * that prop lands on the outer wrapping element instead — see
   * pages/contact.tsx's own buttonFontClassName for how these classes are
   * applied directly to the label text itself, one DOM level deeper than
   * CtaButton's surface span, so they win the inheritance instead of fighting
   * it). Base/Wide/Lg triplet, same tiering convention as baseTextSize
   * above. */
  buttonFontSize: FontSizeClass;
  buttonFontSizeWide: MdFontSizeClass;
  buttonFontSizeLg: LgFontSizeClass;
  buttonFontWeight: FontWeightClass;
  buttonFontWeightWide: ContactButtonFontWeightWideClass;
  buttonFontWeightLg: ContactButtonFontWeightLgClass;
  /** The composer pill's own fill + border — same pattern as
   * primaryButtonBackgroundColor above (explicit, contact-owned colors
   * instead of inheriting the shared, site-wide ctaButtonConfig's 'auto'
   * surface-derived ones), and the same two-state contract: resting
   * ("default") plus a single unified hover/active color, no distinct third
   * "active" slot (see pages/contact.tsx's own composerCtaButtonConfig and
   * ctaButtonActiveClassName, reused verbatim for the pill). */
  composerPillBackgroundColor: string;
  composerPillHoverActiveBackgroundColor: string;
  composerPillBorderColor: string;
  composerPillHoverActiveBorderColor: string;
  /** The send ("→") control inside the composer pill previously had no
   * color of its own — it just inherited --pill-text, the same color the
   * typed message/placeholder text uses. This gives it an explicit,
   * independent color instead (pages/contact.tsx's own buttonTextColor prop
   * to ComposerPill), same default/unified-hover-active two-state contract
   * as every other color pair on this page. */
  composerButtonTextColor: string;
  composerButtonHoverActiveTextColor: string;
  /** The composer's opt-in trailing text link (e.g. "Stay anonymous" —
   * pages/contact.tsx's own emptyValueAction, replacing the send arrow only
   * while the field is empty) previously had no color config of its own
   * either: default reused --pill-text, and hover reused --pill-hover-
   * border — the composer PILL's own border-hover color, which defaults
   * near-white (composerPillHoverActiveBorderColor) and made the label read
   * as near-invisible on hover (operator-reported, 2026-09-21 — screenshot
   * showed the hovered label washed out against the pill's own light fill).
   * Same default/unified-hover-active two-state contract as every other
   * color pair on this page, now genuinely independent of the pill's own
   * border color. */
  emptyValueActionTextColor: string;
  emptyValueActionHoverActiveTextColor: string;
  loadingBaseColor: string;
  loadingHighlightColor: string;
  activeChipOpacity: number;
  /** The composer pill's own pinned shadow-engine elevation (px) — always
   * active whenever the shadow engine runs, independent of the submit
   * bounce below. This is what "enforce the shadow engine, set it at a
   * given elevation, disable the hover reaction" actually configures; it
   * overrides the shared CtaButtonConfig's own shadowElevationRestingPx
   * specifically for the composer (see pages/contact.tsx's
   * MessageComposerPill/pillPhysicsConfig), since the shared value is also
   * what every CtaButton on the site rests at and shouldn't have to move in
   * lockstep with this one pill's own tuning. */
  composerElevationPx: number;
  /** Minimum contrast ratio the composer's placeholder text must clear
   * against the page surface color — computed the same way message text is
   * (see resolveAutoMessageTextColor in pages/contact.tsx), just at a lower
   * target than actual typed text (messageAutoTextMinContrast /
   * ctaButtonConfig's own autoTextMinContrast). A dedicated contrast knob
   * rather than an opacity dim on the same text color: opacity blends with
   * whatever's behind it and can drift depending on the pill's own
   * background, while a lower-but-still-computed contrast target guarantees
   * the placeholder reads as reliably lighter than real text once typed,
   * regardless of surface color. */
  composerPlaceholderMinContrast: number;
  /** How many lines the composer pill grows to before it stops resizing and
   * scrolls its own content internally instead (operator ask, 2026-09-22:
   * composing or editing a longer message read as unreadable pinned to one
   * line — "the container must adapt to reflect the number of lines, at
   * most 5"). Applies to both fresh message composition and "Edit note"
   * alike, since both share the same composer instance (pages/contact.tsx's
   * own ComposerPill). Growth still starts from one line and only expands
   * as the visitor's own content actually wraps — never pre-emptively
   * reserves the full 5 lines' worth of space up front. */
  composerMaxVisibleLines: number;
  /** Duration/easing for the pill's own height animating between line
   * counts as composerMaxVisibleLines is approached — see
   * pages/contact.tsx's own composerCtaButtonConfig usage and
   * ComposerPill's own composerResizeDurationMs/-Easing for where this
   * lands. A real transition, not an instant snap: growth is a direct
   * consequence of the visitor's own typing, so the resize should read as a
   * continuation of that action, not a jarring layout jump. */
  composerResizeDurationMs: number;
  composerResizeEasing: CtaButtonMotionEasing;
  /** Opt-in: whether submitting a message triggers a brief dip-then-spring-
   * back "pond bounce" on the composer pill — a submit-specific cue, layered
   * on top of (not a replacement for) composerElevationPx above. Off by
   * default — this is a deliberate extra flourish, not something every
   * deployment should get for free. The spring's stiffness/damping/duration/
   * easing still reuse the shared CtaButtonConfig fields already exposed in
   * the CTA panel's "Pond-surface bounce"/"State easing" groups
   * (pressBounceStiffness, pressBounceDamping, pressTransitionMs,
   * pressEasing) — only the dip's own target elevation
   * (submitBounceElevationPx, below) is contact-specific. */
  submitBounceEnabled: boolean;
  /** The elevation (px) the composer pill dips to mid-bounce before
   * springing back to composerElevationPx — an absolute target, not a delta
   * off resting. Typically at or below composerElevationPx for a visible
   * "negative" dip (the shadow engine's own elevationMinPx/elevationMaxPx
   * still clamp the applied value). Only used while submitBounceEnabled is
   * on. */
  submitBounceElevationPx: number;
  /** Delay before an automatic retry after a gap-check/recap/delivery
   * failure — one shared knob for all three rather than three near-
   * duplicate settings, since only one retry sequence is ever in flight at
   * a time (see pages/contact.tsx's GuidedIntake). */
  autoRetryDelayMs: number;
  /** How many automatic retries a failure gets before the flow gives up —
   * gap-check/recap fall back to the raw-passthrough degraded flow;
   * delivery falls back to a final message pointing at the email fallback.
   * Never retries silently forever, matching this flow's existing "never a
   * dead end" ethos (see INSUFFICIENCY_STOP_MESSAGE) — just resolved via a
   * ceiling here instead of always leaving it to a manual escape hatch. */
  autoRetryMaxCount: number;

  // ── Hero entrance (see pages/contact.tsx's useComposerHeroPhase) ────────
  // The composer starts centered in the viewport; its own container fades
  // in, then its placeholder reveals per-character, then the greeting
  // above it reveals per-word/char (heroGreetingRevealUnit) — each phase's
  // own initialDelayMs is the *gap* after the previous phase finishes, not
  // an absolute-from-mount value; pages/contact.tsx cascades them.
  heroContainerFadeInDurationMs: number;
  heroContainerFadeInEasing: CtaButtonMotionEasing;
  heroPlaceholderRevealInitialDelayMs: number;
  heroPlaceholderRevealStepDelayMs: number;
  heroPlaceholderRevealUnitDurationMs: number;
  heroPlaceholderRevealEasing: CtaButtonMotionEasing;
  heroGreetingRevealUnit: ContactHeroGreetingRevealUnit;
  heroGreetingRevealInitialDelayMs: number;
  heroGreetingRevealStepDelayMs: number;
  heroGreetingRevealUnitDurationMs: number;
  heroGreetingRevealEasing: CtaButtonMotionEasing;
  /** Gap between the greeting and the composer below it — a dedicated,
   * hero-only value (not messageGapPx) since this is a pre-submission
   * concern independent of the ongoing conversation's own message rhythm. */
  heroGreetingGapPx: number;
  /** Deliberately smaller than conversationTextSize — the greeting is
   * auxiliary, temporary context, not a conversation turn, and shouldn't
   * read as one. Tailwind-token Base/Wide/Lg triplet — see
   * baseTextSize's own doc comment for why (tokens, not px numbers) and
   * how (panel `kind: 'tabs'` device switcher). */
  heroGreetingTextSize: FontSizeClass;
  heroGreetingTextSizeWide: MdFontSizeClass;
  heroGreetingTextSizeLg: LgFontSizeClass;
  /** Deliberately narrower than messageMeasureCh, for the same reason. */
  heroGreetingMeasureCh: number;

  // ── Composer dock (settling to the bottom on first submission) ──────────
  /** How long the spacer below the dock takes to collapse from flex-grow:1
   * (centered — split evenly with the turns-feed above) to 0 (settled —
   * the turns-feed's own flex-1 claims the freed space, landing the dock
   * at the bottom exactly where it always sat before the hero redesign).
   * See pages/contact.tsx's heroSpacerStyle — plain flexbox, no
   * position/percentage math. */
  composerDockTransitionDurationMs: number;
  composerDockTransitionEasing: CtaButtonMotionEasing;
  /** Delay (ms) between the first-submit pond bounce and the spacer
   * starting to collapse — the "subtle overlap" the two motions share; 0
   * means perfectly simultaneous. */
  composerDockOverlapMs: number;

  // ── Hero exit (greeting fade-out on first submission) ───────────────────
  heroGreetingExitDelayMs: number;
  heroGreetingExitDurationMs: number;
  heroGreetingExitEasing: CtaButtonMotionEasing;

  // ── Carried-draft handoff (abstract.tsx's own composer, see
  // helpers/pendingComposerDraft.ts and GuidedIntake's mount-time peek) ────
  /** Debounced pause (ms) after a carried draft's text last changed before
   * it auto-submits — the same submitFirstMessage a manual Enter press
   * already calls, just fired programmatically once the visitor stops
   * editing. Restarts on every keystroke, so an in-progress edit is never
   * yanked out from under the visitor; collapses toward 0 under reduced
   * motion (see GuidedIntake), since there's no hero-exit glide to use as
   * visual confirmation of the handoff landing anyway. */
  carriedDraftAutoSubmitDelayMs: number;

  // ── Confirm screen (accept action's own visual hierarchy) ───────────────
  /** How long the confirm screen's accept action ("That's right"/"Send it")
   * waits, idle, before nudging attention toward it via CtaButton's
   * forceHover prop — never on appearance immediately, so it doesn't fight
   * a pointer that's already moving toward a choice. Released permanently
   * (for that confirm screen instance) the moment either action receives a
   * real hover or focus — see GuidedIntake's own confirm-force-hover
   * wiring. Skipped entirely under prefers-reduced-motion, the same as
   * every other attention-directing effect on this page. */
  confirmForcedHoverDelayMs: number;

  // ── Starting points (in-pill "Not sure where to begin?" affordance,
  // see pages/contact.tsx's GuidedIntake starterMode state) ───────────────
  /** Master switch for the whole in-pill starters module — the hint
   * ("Start anywhere · Not sure where to begin?"), the browsing carousel,
   * and every one of the timing/transition knobs below. Default true
   * (current behavior unchanged). Set false to fall back to the plain,
   * pre-feature composer: a bare "Start anywhere" placeholder with no
   * hint, no carousel, no idle nudge — the standard flow. Implemented as a
   * single prop-level gate (pages/contact.tsx passes `starterPoints:
   * undefined` outright when this is false, and skips arming the idle
   * timer at all) rather than threading a disabled flag through
   * ComposerPill.tsx itself — every one of that component's starterPoints
   * branches is already conditioned on the prop being present, so omitting
   * it altogether reproduces the pre-feature render exactly, the same
   * "inert unless opted in" contract every other optional prop there
   * already has. */
  starterPointsEnabled: boolean;
  /** One duration reused across every animated moment of this affordance —
   * hiding on the first keystroke, reappearing after the idle delay below,
   * the send-arrow-to-close-X swap, and the stem-to-stem crossfade while
   * browsing — rather than four near-duplicate settings, since at most one
   * of those moments is ever animating at a time. */
  starterAffordanceTransitionDurationMs: number;
  starterAffordanceTransitionEasing: CtaButtonMotionEasing;
  /** Dedicated duration/easing for the hint's *reveal* (idle fade-in) only —
   * deliberately separate from the shared transition above, which is tuned
   * for getting out of the way fast (hide-on-type, arrow/close swap). A
   * peripheral onset is the opposite problem: a slower, gentler fade is
   * picked up pre-attentively without the startling "pop" a quick reveal
   * gives, so this defaults longer/softer than the shared knob. The fade-out
   * (hint → hidden on the first keystroke) still uses the shared transition —
   * only the appearing direction reads from these two. */
  starterAffordanceFadeInDurationMs: number;
  starterAffordanceFadeInEasing: CtaButtonMotionEasing;
  /** How long the composer must sit empty and genuinely engaged (focused, or
   * hovered) with no activity — no keystroke and no pointer movement over the
   * field — before the affordance fades in as a hesitation nudge. The
   * countdown restarts on any such activity (true dwell detection, not a bare
   * timer since focus), and never arms while the field holds real text. */
  starterAffordanceIdleReappearDelayMs: number;
  /** Whether the idle hint may reappear after the visitor has already opened
   * the starters once this session. Default false: proactive help that
   * re-triggers after the user has engaged with it reads as nagging (the
   * canonical Lumière/Office-Assistant finding), loses salience through
   * habituation, and undermines the autonomy of a visitor who's already
   * demonstrated they know the feature is there. Set true only if a caller
   * deliberately wants the nudge to keep returning. */
  starterAffordanceReappearAfterUse: boolean;
};

export const DEFAULT_CONTACT_EXPERIENCE_CONFIG: ContactExperienceConfig = {
  conversationMaxWidthPx: 580,
  desktopColumnGapPx: 88,
  opticalOffsetYVh: -1.5,
  messageMeasureCh: 48,
  // Nearest Tailwind tokens to this field's own former raw px/decimal
  // defaults (16px -> text-base, 18px -> text-lg, 1.5 -> leading-normal,
  // exact for lineHeight, nearest-below for the two sizes since Tailwind's
  // fixed scale has no literal 16/18px step at every increment) — chosen to
  // reproduce the pre-existing rendered look as closely as the token scale
  // allows, not a fresh design decision. Wide/Lg match base, same as before
  // this field was tiered.
  baseTextSize: 'text-sm',
  baseTextSizeWide: 'md:text-base',
  baseTextSizeLg: 'lg:text-base',
  conversationTextSize: 'text-sm',
  conversationTextSizeWide: 'md:text-lg',
  conversationTextSizeLg: 'lg:text-lg',
  lineHeight: 'leading-normal',
  lineHeightWide: 'md:leading-normal',
  lineHeightLg: 'lg:leading-normal',
  mutedTextOpacity: 0.64,
  recapBodyTextOpacity: 0.72,
  messageGapPx: 20,
  controlGapPx: 12,
  actionGapPx: 10,
  chipHeightPx: 44,
  chipPaddingXPx: 18,
  conversationViewportHeightPx: 360,
  loadingEffectEnabled: true,
  loadingLabelMode: 'thinking',
  loadingEffectStyle: 'shimmer',
  loadingShimmerDurationMs: 1400,
  loadingMinimumVisibleMs: 350,
  messageEntryDurationMs: 240,
  showProgress: true,
  primaryTextColor: '#48484e',
  messageTextColorMode: 'auto',
  messageAutoTextMinContrast: 4.5,
  messageTextAlign: 'left',
  mandatoryActionsFontSize: 'text-xs',
  mandatoryActionsTopGap: 'gap-0',
  mandatoryActionsPaddingRight: 'pr-0',
  mandatoryActionsPaddingBottom: 'pb-0',
  mandatoryActionsPaddingLeft: 'pl-0',
  useOriginalWordsActionEnabled: false,
  messageVisibleCount: 6,
  messageFadeFloorOpacity: 0.1,
  mutedTextColorMode: 'auto',
  mutedAutoTextMinContrast: 3,
  mutedTextColor: '#7c7c83',
  borderColorMode: 'auto',
  borderAutoTextMinContrast: 1.5,
  borderColor: '#85858b',
  // Primary fill default matches this page's own former live-sampled "Send
  // note to Manuel" rendered fill (#e8e9ed, computed-style inspection,
  // 2026-09-21); hover/active a modest lighten off that same base.
  primaryButtonBackgroundColor: '#ecedf4',
  primaryButtonHoverActiveBackgroundColor: '#f2f3f6',
  primaryButtonBorderColor: '#f1f1f9',
  primaryButtonHoverActiveBorderColor: '#ffffff',
  secondaryButtonBackgroundDarkenAmount: 0,
  secondaryButtonHoverActiveBackgroundDarkenAmount: 0,
  secondaryButtonBorderDarkenAmount: 0,
  secondaryButtonHoverActiveBorderDarkenAmount: 0,
  // Mobile's own live-tuned values (text-sm/font-normal, operator
  // adjustment, 2026-09-21) duplicated up to tablet/desktop — previously
  // Wide/Lg still sat at this field's original text-base/font-medium
  // defaults, so the confirm buttons' label text only looked smaller/
  // lighter on mobile and jumped back up at tablet width. Same value at
  // every tier now, matching this session's other breakpoint-parity fixes.
  buttonFontSize: 'text-sm',
  buttonFontSizeWide: 'md:text-base',
  buttonFontSizeLg: 'lg:text-sm',
  buttonFontWeight: 'font-normal',
  buttonFontWeightWide: 'md:font-normal',
  buttonFontWeightLg: 'lg:font-normal',
  // Matches the confirm buttons' own fill/border family (primaryButton*
  // above) for a visually unified light-neutral look across the pill and
  // the buttons below it — hover/active a modest lighten off the same base.
  composerPillBackgroundColor: '#ecedf4',
  composerPillHoverActiveBackgroundColor: '#f2f3f6',
  composerPillBorderColor: '#f1f1f9',
  composerPillHoverActiveBorderColor: '#ffffff',
  // Matches primaryTextColor (this page's own default reading-text color)
  // — reproduces the send arrow's former inherited --pill-text look exactly
  // until an operator diverges it; hover/active a touch darker for a subtle
  // "engaged" affordance.
  composerButtonTextColor: '#414148',
  composerButtonHoverActiveTextColor: '#8c8c97',
  // Same default as composerButtonTextColor (reproduces the pre-fix
  // --pill-text look at rest); hover/active a touch darker, matching that
  // same field's own "engaged" convention — NOT the near-white
  // composerPillHoverActiveBorderColor this used to borrow, which is what
  // made the label wash out on hover.
  emptyValueActionTextColor: '#868698',
  emptyValueActionHoverActiveTextColor: '#656572',
  loadingBaseColor: '#85858b',
  loadingHighlightColor: '#48484e',
  activeChipOpacity: 0.12,
  composerElevationPx: 8.5,
  composerPlaceholderMinContrast: 1.5,
  composerMaxVisibleLines: 5,
  composerResizeDurationMs: 200,
  composerResizeEasing: 'standard',
  submitBounceEnabled: true,
  submitBounceElevationPx: 0,
  autoRetryDelayMs: 30000,
  autoRetryMaxCount: 2,
  heroContainerFadeInDurationMs: 360,
  heroContainerFadeInEasing: 'gentle',
  heroPlaceholderRevealInitialDelayMs: 80,
  heroPlaceholderRevealStepDelayMs: 18,
  heroPlaceholderRevealUnitDurationMs: 180,
  heroPlaceholderRevealEasing: 'standard',
  heroGreetingRevealUnit: 'word',
  heroGreetingRevealInitialDelayMs: 120,
  heroGreetingRevealStepDelayMs: 30,
  heroGreetingRevealUnitDurationMs: 260,
  heroGreetingRevealEasing: 'gentle',
  heroGreetingGapPx: 28,
  // Nearest Tailwind token to the former 15px default (no literal 15px
  // step on the fixed scale) — text-sm (14px), the closest step below,
  // preserving "smaller than the conversation's own text" (baseTextSize/
  // conversationTextSize above).
  heroGreetingTextSize: 'text-xs',
  heroGreetingTextSizeWide: 'md:text-sm',
  heroGreetingTextSizeLg: 'lg:text-sm',
  heroGreetingMeasureCh: 40,
  composerDockTransitionDurationMs: 720,
  composerDockTransitionEasing: 'standard',
  composerDockOverlapMs: 80,
  heroGreetingExitDelayMs: 0,
  heroGreetingExitDurationMs: 640,
  heroGreetingExitEasing: 'gaussian',
  confirmForcedHoverDelayMs: 1500,
  carriedDraftAutoSubmitDelayMs: 600,
  starterPointsEnabled: false,
  starterAffordanceTransitionDurationMs: 220,
  starterAffordanceTransitionEasing: 'standard',
  starterAffordanceFadeInDurationMs: 420,
  starterAffordanceFadeInEasing: 'gentle',
  starterAffordanceIdleReappearDelayMs: 5000,
  starterAffordanceReappearAfterUse: false,
};
