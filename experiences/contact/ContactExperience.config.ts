import type { CtaButtonMotionEasing } from '../../components/CtaButton/config/registered';

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
  baseTextSizePx: number;
  conversationTextSizePx: number;
  lineHeight: number;
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
  mutedTextColor: string;
  borderColor: string;
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
  /** Deliberately smaller than conversationTextSizePx — the greeting is
   * auxiliary, temporary context, not a conversation turn, and shouldn't
   * read as one. */
  heroGreetingTextSizePx: number;
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
};

export const DEFAULT_CONTACT_EXPERIENCE_CONFIG: ContactExperienceConfig = {
  conversationMaxWidthPx: 580,
  desktopColumnGapPx: 88,
  opticalOffsetYVh: -1.5,
  messageMeasureCh: 48,
  baseTextSizePx: 16,
  conversationTextSizePx: 18,
  lineHeight: 1.5,
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
  messageVisibleCount: 6,
  messageFadeFloorOpacity: 0.1,
  mutedTextColor: '#7c7c83',
  borderColor: '#85858b',
  loadingBaseColor: '#85858b',
  loadingHighlightColor: '#48484e',
  activeChipOpacity: 0.12,
  composerElevationPx: 8.5,
  composerPlaceholderMinContrast: 1.5,
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
  heroGreetingTextSizePx: 15,
  heroGreetingMeasureCh: 40,
  composerDockTransitionDurationMs: 720,
  composerDockTransitionEasing: 'standard',
  composerDockOverlapMs: 80,
  heroGreetingExitDelayMs: 0,
  heroGreetingExitDurationMs: 640,
  heroGreetingExitEasing: 'gaussian',
  confirmForcedHoverDelayMs: 1500,
  carriedDraftAutoSubmitDelayMs: 600,
};
