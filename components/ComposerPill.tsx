'use client'

import React, {
  useCallback, useEffect, useMemo, useState,
  type CSSProperties, type ReactNode, type RefObject,
} from 'react'
import { colord } from 'colord'
import { resolveSurfaceAwareCtaColors } from './CtaButton'
import {
  CTA_BUTTON_MOTION_EASINGS,
  type CtaButtonConfig,
  type CtaButtonMotionEasing,
} from './CtaButton/config/registered'
import { useCardLiftPhysics } from './proximity/useCardLiftPhysics'
import { SplitTextReveal } from './SplitTextReveal'
import { adjustLightnessForContrast } from '../helpers/harmonicGradient'

/** Mirrors CtaButton's own (private) resolveAutoTextColor — same
 * one-direction contrast search (lighten a dark surface, darken a light
 * one), reused here rather than duplicating a second algorithm, so a
 * composer's text tracks its page surface color the exact same way CTA text
 * does. Exported: contact.tsx's own page-level message-text color
 * computation reuses this too, rather than keeping a second private copy of
 * the same function around now that this component owns it. */
export function resolveAutoMessageTextColor(surfaceColor: string, minContrast: number): string {
  const surface = colord(surfaceColor)
  const { h, s, l } = surface.toHsl()
  const range = surface.isDark() ? { min: l, max: 96 } : { min: 4, max: l }
  const resolvedL = adjustLightnessForContrast(
    h, s, l, range, { against: surfaceColor, minRatio: minContrast },
  )
  return colord({ h, s, l: resolvedL }).toHex()
}

/** Total time a SplitTextReveal sweep of `unitCount` units takes to finish —
 * the last unit starts at (unitCount-1)*stepDelayMs and takes unitDurationMs
 * to reach full opacity. Used to cascade an entrance's later phases (each
 * config field is the *gap* after the previous phase, not an absolute delay)
 * on top of this pill's own placeholder sweep. */
export const computeSweepDurationMs = (unitCount: number, stepDelayMs: number, unitDurationMs: number) =>
  unitCount <= 0 ? 0 : (unitCount - 1) * stepDelayMs + unitDurationMs

/** The handful of ContactExperienceConfig fields this component actually
 * reads for its own entrance cascade — narrowed out of the full page config
 * so a second caller (AbstractHeroCtaComposer) can supply its own,
 * independently-tunable instance of just these five fields instead of
 * depending on contact.tsx's page-local config type. ContactExperienceConfig
 * already declares all five, so contact.tsx can keep passing its own config
 * object here unchanged (structural typing). */
export type ComposerPillMotionConfig = {
  heroContainerFadeInDurationMs: number
  heroContainerFadeInEasing: CtaButtonMotionEasing
  heroPlaceholderRevealStepDelayMs: number
  heroPlaceholderRevealUnitDurationMs: number
  heroPlaceholderRevealEasing: CtaButtonMotionEasing
  /** Duration/easing for the singleLine textarea's own height growing/
   * shrinking as the visitor's content wraps past one line (only relevant
   * while `maxVisibleLines` is also passed — see its own doc comment
   * below). Optional — AbstractHeroCtaComposer's own motion config doesn't
   * carry these two fields and never passes maxVisibleLines, so it never
   * needs them; default to a plain, immediate (0ms/linear) resize when
   * omitted. */
  composerResizeDurationMs?: number
  composerResizeEasing?: CtaButtonMotionEasing
}

/** Declared locally rather than imported from
 * experiences/contact/useComposerHeroPhase.ts — that hook (and its 3-state
 * shape, including 'exiting') is a contact-page-specific concept (it also
 * drives the FLIP dock-glide transition), while this component only ever
 * reads "is this still the entrance phase." A second caller with a simpler
 * 2-state phase (e.g. 'centered' | 'settled') is structurally assignable
 * here unchanged. */
export type ComposerPillHeroPhase = 'centered' | 'exiting' | 'settled'

/** The in-pill "Not sure where to begin?" affordance (pages/contact.tsx's
 * starterMode state machine) — entirely opt-in via the `starterPoints` prop
 * below. 'hidden': nothing rendered here (a real keystroke is in progress or
 * has landed). 'hint': the placeholder row shows "<placeholder> · <hintLabel>"
 * with only the label interactive. 'browsing': the placeholder row is
 * replaced by one of `options` at a time (indexed by `index`), flanked by
 * prev/next controls, and the trailing send arrow is swapped for a close
 * glyph. AbstractHeroCtaComposer never passes this prop, so its rendering is
 * unaffected either way — same "inert unless opted into" contract as every
 * other optional prop on this component. */
export type ComposerStarterPointsMode = 'hidden' | 'hint' | 'browsing'

export type ComposerStarterPoints = {
  mode: ComposerStarterPointsMode
  hintLabel: string
  options: readonly string[]
  index: number
  /** Shared duration/easing for every animated moment this affordance has
   * EXCEPT the hint's own idle reveal (arrow/close swap, stem crossfade, and
   * the hint's fade-OUT on the first keystroke) — see ContactExperienceConfig's
   * own starterAffordanceTransitionDurationMs doc comment. */
  transitionDurationMs: number
  transitionEasing: string
  /** Dedicated duration/easing for the hint's fade-IN (idle reveal) only —
   * a gentler, slower onset than the shared transition, so a peripheral
   * appearance is noticed without a startling pop. The fade-out direction
   * still uses transitionDurationMs/transitionEasing above. */
  fadeInDurationMs: number
  fadeInEasing: string
  onHintClick: () => void
  onPrev: () => void
  onNext: () => void
  onSelect: (option: string) => void
  onClose: () => void
}

/** Same border-corner chevron technique as
 * experiences/about/components/AboutMobileAccordionItem.tsx's own
 * expand/collapse affordance (a small square with only its top and right
 * borders drawn, rotated) — that component rotates ONE instance between two
 * angles to indicate expanded/collapsed; this renders two static instances
 * (rotated to point left and right respectively) to step through the
 * starter-point stems instead. */
function ComposerStarterChevron({
  direction, color, onClick, ariaLabel, sizeClassName = 'h-9 w-9', hidden = false,
}: {
  direction: 'left' | 'right'
  color: string
  onClick: () => void
  ariaLabel: string
  /** The mobile trailing-cluster instance (grouped with the close ×, see
   * ComposerPill's own browsing-mode doc comment) renders at 44px — touch-
   * target parity with the close button it sits beside — while the desktop
   * in-row instance keeps the original 36px. Same component, two sizes per
   * call site rather than a near-duplicate. */
  sizeClassName?: string
  /** True when this instance isn't the active one for the current mode
   * (e.g. the trailing-cluster pair while not browsing) — removes it from
   * the tab order and the accessibility tree without unmounting it, same
   * treatment the close × next to it already gets. Never touches display —
   * the in-row/trailing-cluster split itself is a static, mode-independent
   * Tailwind breakpoint (md:) on each call site's own wrapper. */
  hidden?: boolean
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      aria-hidden={hidden}
      tabIndex={hidden ? -1 : 0}
      onClick={onClick}
      onMouseDown={event => event.preventDefault()}
      className={`pointer-events-auto inline-flex ${sizeClassName} shrink-0 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--pill-hover-border)]`}
    >
      <span
        aria-hidden="true"
        className="block h-2.5 w-2.5 rounded-tr-[1px] border-r-2 border-t-2"
        style={{ borderColor: color, transform: `rotate(${direction === 'right' ? 45 : 225}deg)` }}
      />
    </button>
  )
}

/** Same two-bar-rotated-to-an-X technique as
 * experiences/abstract/components/MobileNavCube.tsx's own burger-to-X morph
 * (top/bottom bars rotate to ±45deg and meet at center) — rendered here
 * already at rest in the X shape, since there is no burger state to morph
 * from in this context (the composer's send arrow is the "before" state,
 * animated separately via its own scale-to-zero transition). */
function ComposerStarterCloseIcon({ color }: { color: string }) {
  return (
    <span aria-hidden="true" className="relative block h-3 w-3">
      <span
        className="absolute left-0 top-1/2 h-[2px] w-full rounded-full"
        style={{ backgroundColor: color, transform: 'translateY(-50%) rotate(45deg)' }}
      />
      <span
        className="absolute left-0 top-1/2 h-[2px] w-full rounded-full"
        style={{ backgroundColor: color, transform: 'translateY(-50%) rotate(-45deg)' }}
      />
    </span>
  )
}

/**
 * The composer's own CTA-styled surface: same surface-aware colors/radius/
 * border/size preset as CtaButton (via resolveSurfaceAwareCtaColors +
 * ctaButtonConfig), but as a single input pill rather than a `<button>` — a
 * textarea can't nest inside a real button element. The trailing arrow is
 * the send affordance, matching CtaButton's own arrow glyph/hover-translate.
 *
 * Shared between pages/contact.tsx's own composer and
 * experiences/abstract/components/AbstractHeroCtaComposer.tsx — same
 * component/mechanism, independently-tunable magnitudes per caller (see
 * ComposerPillMotionConfig above), matching this codebase's existing
 * "shared mechanism, separately-tuned per context" precedent elsewhere
 * (e.g. AbstractPostDock's dockShadowNarrowScale).
 */
export function ComposerPill({
  ctaButtonConfig, surfaceColor, value, onChange, onSubmit, placeholder, disabled, textareaRef,
  composerElevationPx, placeholderMinContrast, bounceOnSubmitEnabled, bounceElevationPx, motionConfig,
  heroPhase, placeholderRevealInitialDelayMs, pendingIndicator,
  elevationEntranceFromPx, elevationEntranceDurationMs, elevationEntranceEasing, elevationEntranceDelayMs,
  introText, introColorTransitionDurationMs, introColorTransitionEasing, introColorTransitionDelayMs,
  introOpacity = 1, introOpacityTransitionDurationMs, introOpacityTransitionEasing,
  overlayDistribution, overlayCadenceAmount, introUnitTranslateYPx,
  align = 'center',
  autoFocus = false,
  className = '',
  chrome = 'default',
  singleLine = false,
  maxVisibleLines,
  starterPoints,
  emptyValueAction,
  onFocusChange,
  onHoverChange,
  buttonTextColor,
  buttonHoverActiveTextColor,
  emptyValueActionTextColor,
  emptyValueActionHoverActiveTextColor,
}: {
  ctaButtonConfig: CtaButtonConfig
  surfaceColor: string
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  placeholder: string
  disabled: boolean
  textareaRef: RefObject<HTMLTextAreaElement>
  composerElevationPx: number
  placeholderMinContrast: number
  bounceOnSubmitEnabled: boolean
  bounceElevationPx: number
  motionConfig: ComposerPillMotionConfig
  heroPhase: ComposerPillHeroPhase
  /** Resolved, absolute-from-mount delay (container fade duration + the
   * configured gap) — the caller cascades this, since only the caller knows
   * about every phase ahead of the placeholder reveal (e.g. contact.tsx also
   * has a greeting; AbstractHeroCtaComposer doesn't). */
  placeholderRevealInitialDelayMs: number
  /** Rendered in the same absolutely-positioned slot the send arrow
   * occupies, while `disabled` is true — e.g. contact.tsx's own
   * <AgentPendingIndicator>. Omit for a caller that never has a
   * pending/network state of its own (the abstract.tsx hero composer only
   * ever navigates away on submit, never shows a loading state here). */
  pendingIndicator?: ReactNode
  /** When provided, seeds this instance's elevation-physics engine to start
   * at this value instead of composerElevationPx, then tweens up to
   * composerElevationPx once, on mount, over elevationEntranceDurationMs/
   * Easing — for a composer that visually replaces a differently-elevated
   * element in place (AbstractHeroCtaComposer's CTA-to-composer swap).
   * Omit (contact.tsx's own usage) to render already at composerElevationPx
   * with no entrance tween. */
  elevationEntranceFromPx?: number
  elevationEntranceDurationMs?: number
  elevationEntranceEasing?: string
  /** How long (ms) to wait after mount before the elevation-entrance tween
   * above actually starts — e.g. AbstractHeroCtaComposer holds at
   * elevationEntranceFromPx while its own intro copy is still being read,
   * and only starts rising once that intro resolves. Ignored (no effect)
   * when elevationEntranceFromPx is omitted. Default 0 — contact.tsx never
   * passes elevationEntranceFromPx at all, so this never applies there. */
  elevationEntranceDelayMs?: number
  /** When provided, the placeholder overlay renders this text instead of
   * `placeholder` — same per-character SplitTextReveal mechanism, same
   * motionConfig timing fields, just different copy. Lets a caller show a
   * first line (e.g. AbstractHeroCtaComposer's "Tell me what you're working
   * on") before switching to the real, persistent placeholder by simply
   * clearing this prop — the overlay remounts (keyed) and reveals
   * `placeholder` fresh at that point. contact.tsx never passes this, so its
   * single-placeholder behavior is unchanged. */
  introText?: string
  /** How long (ms)/which easing the overlay's text `color` takes to ease
   * from introText's color (colors.text — the same color real typed
   * content would use) to the real placeholder's color (placeholderColor,
   * more muted) once introText clears. Applied to the overlay's own
   * persistent wrapper span, not the keyed SplitTextReveal it contains —
   * that's what lets the color animate smoothly across the intro-line ->
   * placeholder swap even though the reveal underneath it remounts. All
   * three (including introColorTransitionDelayMs below) default to 0/unset,
   * so contact.tsx (which never sets introText, so overlayColor never
   * changes) sees no transition and no behavior change. */
  introColorTransitionDurationMs?: number
  introColorTransitionEasing?: string
  /** Delay (ms) before the color transition above visually starts, even
   * though overlayColor itself already flips the moment introText clears —
   * CSS transition-delay holds the old color on screen until this elapses,
   * then eases into the new one over introColorTransitionDurationMs. Lets a
   * caller defer the color settle to some later moment (e.g.
   * AbstractHeroCtaComposer waits until the real placeholder has *also*
   * fully finished revealing, not just started) without needing a second
   * state flip. Overridden to 0 the moment this composer is focused (see
   * handleComposerFocus below) — a visitor already engaging with the field
   * shouldn't have to keep waiting out a scheduled color settle. */
  introColorTransitionDelayMs?: number
  /** Controls the overlay wrapper's own opacity — independent of, and
   * transitions independently from, the color settle above (both are
   * declared on the same comma-separated transitionProperty list, each
   * with its own duration/easing/delay, so they can move on entirely
   * different beats). Default 1 (fully visible, no transition ever
   * fires) — contact.tsx never changes this, so it's always inert there.
   * AbstractHeroCtaComposer drives this down to 0 to fade the whole
   * current intro line out as one block before the next one enters,
   * rather than animating anything per-character. */
  introOpacity?: number
  introOpacityTransitionDurationMs?: number
  introOpacityTransitionEasing?: string
  /** Shapes the overlay's per-character stagger via the same
   * distribution/cadenceAmount mechanism AbstractPostDock's own card intro
   * uses (see SplitTextReveal's own doc comment) — passed straight through.
   * Both default to 'linear'/0 (an evenly-spaced stagger, every character
   * the same duration), matching contact.tsx's existing behavior exactly
   * when omitted. */
  overlayDistribution?: 'linear' | 'gaussian' | 'gaussian-inverse'
  overlayCadenceAmount?: number
  /** Passed straight through to the overlay's SplitTextReveal as
   * unitTranslateYPx — a secondary drift motion alongside the opacity
   * fade. Defaults to unset (no transform at all, a plain opacity fade) so
   * contact.tsx's own usage is unaffected. */
  introUnitTranslateYPx?: number
  /** The pill's own horizontal placement within its parent — 'center'
   * (mx-auto, contact.tsx's own composer, which sits mid-page) or 'left'
   * (flush with a left-aligned column, e.g. AbstractEditorialHero's copy).
   * Default 'center' preserves contact.tsx's existing behavior exactly. */
  align?: 'left' | 'center'
  /** Explicit, opt-in per caller — never defaults to true. contact.tsx's own
   * composer passes true (the composer *is* the point of that page, and a
   * visitor arriving there intends to type). A composer that appears
   * incidentally via a timed/passive transition (AbstractHeroCtaComposer)
   * should leave this false: stealing focus from a background timer is
   * jarring, especially if the visitor is reading elsewhere on the page
   * when it fires — the field should just sit there, ready, until the
   * visitor deliberately clicks/taps/tabs to it themselves. */
  autoFocus?: boolean
  className?: string
  /** Opt-in, hero-only chrome swap (default 'default' — contact.tsx never
   * passes this, so its own pill is byte-for-byte unaffected either way).
   * 'tagPill' rebuilds this pill from the site's own card-tag idiom
   * (`ArticleCard.tsx`'s `articleCardTopic`: hairline border, no shadow,
   * monospace/letterspaced placeholder + submit glyph) instead of the
   * default shadowed/`border-2` look — see
   * AbstractHeroCtaComposer/config/panel.ts's own field description for the
   * full precedent citations. */
  chrome?: 'default' | 'tagPill'
  /** Default false (AbstractHeroCtaComposer's existing behavior, unchanged):
   * the textarea auto-grows/shrinks to fit wrapped content (see the resize
   * effect below), so the pill's own height changes as a visitor types past
   * one line, with no cap. true (contact.tsx's own composer): the pill
   * starts pinned to exactly one line's worth of height (operator ask,
   * 2026-08-26: "must keep the same height at all times") — content that
   * wraps past one visual line grows the box up to `maxVisibleLines` (below)
   * if provided, or stays pinned at one line and scrolls internally if not.
   * Content beyond whatever cap applies is still fully there and editable,
   * just reached by scrolling within the field, the same way a fixed-height
   * `<input>` would behave if it supported multi-line text. */
  singleLine?: boolean
  /** Only meaningful alongside `singleLine: true` — caps how many lines the
   * pill will grow to before it stops resizing and scrolls internally
   * instead (operator ask, 2026-09-22: composing/editing a longer message
   * read as unreadable pinned to one line — "the container must adapt to
   * reflect the number of lines, at most 5"). The resize itself is animated
   * via motionConfig's composerResizeDurationMs/-Easing. Omit (every caller
   * but pages/contact.tsx) for byte-for-byte unchanged single-line-pinned
   * rendering. */
  maxVisibleLines?: number
  /** Opt-in "Not sure where to begin?" affordance — see
   * ComposerStarterPoints's own doc comment above. Omit (every caller today
   * except pages/contact.tsx's first-message composer) for byte-for-byte
   * unchanged rendering. */
  starterPoints?: ComposerStarterPoints
  /** Opt-in alternate trailing control, shown in the exact slot the send
   * arrow normally occupies, ONLY while the field is empty (the arrow is
   * disabled/inert there anyway — this replaces a do-nothing control with
   * an actionable one rather than adding a second one alongside it). The
   * moment the visitor types anything the arrow reappears (now enabled)
   * and this disappears — the two are mutually exclusive by construction,
   * keyed on the same `!value.trim()` check the arrow's own `disabled`
   * already uses. pages/contact.tsx's own 'name' step is the one caller
   * today ("Stay anonymous", replacing what used to be a separate
   * "Skip" link below the pill). Omit for byte-for-byte unchanged
   * rendering, the same "inert unless opted in" contract every other
   * optional prop here already has. */
  emptyValueAction?: { label: string; onClick: () => void }
  /** Fires on every real focus/blur of the pill (the same event
   * useCardLiftPhysics already reacts to for its own hover-elevation, not a
   * second listener) — lets a caller (pages/contact.tsx's starter-points
   * idle-reveal) know when the composer is genuinely focused without
   * reaching into textareaRef itself. Omit for byte-for-byte unchanged
   * behavior in every other caller. */
  onFocusChange?: (focused: boolean) => void
  /** Fires on real mouse enter/leave of the pill's own outer box — deliberately
   * scoped to this element (not a wrapping div a caller might add) so a
   * caller can react to hovering the actual pill shape, not incidental
   * empty space beside a centered/narrower pill. Omit for byte-for-byte
   * unchanged behavior in every other caller. */
  onHoverChange?: (hovered: boolean) => void
  /** The send ("→") control's own text color — independent of --pill-text
   * (the typed message/placeholder color). Both default to colors.text
   * (this component's existing, unchanged behavior) when omitted, so every
   * caller but pages/contact.tsx renders byte-for-byte the same. */
  buttonTextColor?: string
  /** Applied while the pill is hovered OR focus-within (the same dual
   * trigger the send arrow's own translate-x-1 shift already uses just
   * below) as well as on a direct :active press — there's no separate
   * "active" slot, hover/active are always the same color. Defaults to
   * buttonTextColor (no color change on hover/active) when omitted. */
  buttonHoverActiveTextColor?: string
  /** emptyValueAction's own label text color — independent of both
   * --pill-text and buttonTextColor above. Previously hardcoded to
   * --pill-hover-border on hover (a leftover borrow from before this field
   * existed, which reads near-invisible whenever the pill's own border-
   * hover color is light — operator-reported, 2026-09-21). Defaults to
   * colors.text (this component's existing default-state look) when
   * omitted; every caller but pages/contact.tsx omits both, so their
   * behavior is unaffected either way (only pages/contact.tsx passes
   * emptyValueAction at all today). */
  emptyValueActionTextColor?: string
  /** Same hover/OR/focus-within/active dual-trigger contract as
   * buttonHoverActiveTextColor above. Defaults to emptyValueActionTextColor
   * (no color change on hover/active) when omitted. */
  emptyValueActionHoverActiveTextColor?: string
}) {
  const colors = useMemo(
    () => resolveSurfaceAwareCtaColors(ctaButtonConfig, surfaceColor),
    [ctaButtonConfig, surfaceColor],
  )
  const isTagPill = chrome === 'tagPill'
  // Tag-pill chrome mirrors the card tags' own `border-white/25` treatment
  // (ArticleCard.tsx:267) proportionally against whatever this pill's own
  // surface-aware border color resolves to, rather than a literal white —
  // same alpha fraction, not the same hex.
  const tagPillBorderColor = useMemo(
    () => colord(colors.border).alpha(0.25).toRgbString(),
    [colors.border],
  )
  const tagPillHoverBorderColor = useMemo(
    () => colord(colors.hoverBorder).alpha(0.25).toRgbString(),
    [colors.hoverBorder],
  )
  // A dedicated contrast target, not an opacity dim on colors.text — see
  // ContactExperienceConfig's own composerPlaceholderMinContrast doc comment
  // for why (opacity blends with whatever's behind it and can drift with
  // the pill's own background; a lower-but-still-computed contrast ratio
  // guarantees the placeholder stays reliably lighter than real text).
  const placeholderColor = useMemo(
    () => resolveAutoMessageTextColor(surfaceColor, placeholderMinContrast),
    [surfaceColor, placeholderMinContrast],
  )
  // While introText is shown it reads as real, committed text (the same
  // color colors.text uses); once cleared, this settles to the real
  // placeholder's own (more muted) color. contact.tsx never sets introText,
  // so this is always just placeholderColor there, unchanged from before.
  const overlayColor = introText ? colors.text : placeholderColor

  useEffect(() => {
    if (singleLine) return
    const node = textareaRef.current
    if (!node) return
    node.style.height = 'auto'
    node.style.height = `${node.scrollHeight}px`
  }, [value, textareaRef, singleLine])

  // singleLine: compute the textarea's own natural one-line box height and
  // lock it in as an explicit `height`, applied below — a real CSS height,
  // not just the `rows={1}` native sizing this used to rely on alone.
  // Confirmed live, 2026-08-26: with only `rows={1}`/`min-h-6` and no
  // explicit height, once content actually wrapped past one line the
  // rendered/painted box grew to fit it (visibly, in a full-page
  // screenshot) even though `rows={1}` is documented HTML behavior that's
  // supposed to hold the row count fixed — a real, reproducible engine
  // quirk on scrollable multi-line content inside an unconstrained-height
  // textarea, not just a screenshot-tooling artifact (checked three
  // independent ways: computed style, getBoundingClientRect, and a full
  // unscoped page screenshot all agreed the box grew). An explicit height,
  // unlike `rows`, is a hard CSS constraint nothing can expand — this is
  // what actually guarantees "the pill must keep the same height at all
  // times," not the native sizing this component relied on before.
  //
  // Computed from CSS metrics (padding + line-height via getComputedStyle),
  // NOT node.scrollHeight — scrollHeight reflects whatever's CURRENTLY in
  // the field, and this mounts already holding real, possibly long,
  // multi-line content whenever a caller seeds `value` before render (e.g.
  // pages/contact.tsx's own handleRequestCorrection, which sets the full
  // existing note as `value` in the same tick it flips phase back to
  // 'writing', remounting this component with that note already in place —
  // ComposerPill only renders while phase is 'writing'/'pending', so
  // "Edit note" is a genuine remount, not a live update to an already-
  // measured instance). Measuring scrollHeight at THAT moment locked in the
  // long note's own multi-line wrapped height as if it were "one line,"
  // then stretched every line's own line-height to match it once applied
  // below — the same oversized-gap bug singleLineWrapped exists to prevent
  // for in-session typing, but unrecoverable here since the box height
  // itself was wrong from the very first measurement (operator-reported,
  // 2026-09-22: persisted specifically on "Edit note," screenshot showed a
  // visibly oversized pill with only slivers of clipped text at its top/
  // bottom edges). padding/line-height are pure CSS values, unaffected by
  // however much text currently happens to be in the field, so this always
  // reflects a genuine single empty line regardless of mount-time content.
  const [singleLineHeightPx, setSingleLineHeightPx] = useState<number | undefined>(undefined)
  // The one natural line's own height in isolation (no padding) — needed
  // separately from singleLineHeightPx (which includes padding) to compute
  // maxHeightPx below: each additional visible line past the first adds
  // exactly one more of these, padding is only ever paid once.
  const [naturalLineHeightPx, setNaturalLineHeightPx] = useState<number | undefined>(undefined)
  useEffect(() => {
    if (!singleLine) return
    const node = textareaRef.current
    if (!node) return
    const computed = window.getComputedStyle(node)
    const paddingTop = parseFloat(computed.paddingTop) || 0
    const paddingBottom = parseFloat(computed.paddingBottom) || 0
    const lineHeight = parseFloat(computed.lineHeight) || 0
    setSingleLineHeightPx(paddingTop + paddingBottom + lineHeight)
    setNaturalLineHeightPx(lineHeight)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [singleLine, textareaRef])

  // The box's own real ceiling — singleLineHeightPx (no room to grow, the
  // pre-existing "pinned to one line, scroll the rest" behavior) unless a
  // caller opts into growth via maxVisibleLines, in which case it's exactly
  // tall enough for that many natural lines (padding paid once, one more
  // naturalLineHeightPx per additional line past the first) — see
  // maxVisibleLines' own doc comment above for the operator ask this
  // implements. Content beyond this still doesn't grow the box further; it
  // scrolls within it instead (overflow-y-auto below), same mechanism as
  // the pre-existing single-line-pinned case, just at a taller cap.
  const maxHeightPx = singleLineHeightPx === undefined ? undefined
    : maxVisibleLines === undefined || naturalLineHeightPx === undefined ? singleLineHeightPx
      : singleLineHeightPx + (maxVisibleLines - 1) * naturalLineHeightPx

  // The box's CURRENT height, re-measured on every keystroke (not just once
  // at mount like singleLineHeightPx/naturalLineHeightPx above) and clamped
  // to [singleLineHeightPx, maxHeightPx] — this is what actually grows the
  // pill as the visitor's content wraps past one line, and what shrinks it
  // back as they delete past a wrap point. Measured via the same
  // height:'auto'-then-restore trick the non-singleLine growth effect above
  // already uses (temporarily lets the browser lay out the content
  // unconstrained to read its true natural height, then this effect's own
  // setState below applies the real, clamped, transitioned height before
  // the next paint — nothing unclamped is ever visible). Below, the height-
  // locked centering hack (line-height stretched to the whole box height,
  // padding zeroed — see its own doc comment just below) is only applied
  // while this equals singleLineHeightPx (genuinely one line); once it
  // grows past that, the textarea falls back to its plain, unstretched
  // leading-snug line-height instead. Necessary because that centering hack
  // sets one line-height value for the WHOLE textarea, and CSS line-height
  // applies per line, not just to a lone first line — with it force-applied
  // unconditionally, every wrapped line got stretched to the box's full
  // single-line height, reading as an oversized gap between them instead of
  // normal line spacing (operator-reported, 2026-09-22, screenshot showed
  // wrapped text reading as double-spaced).
  const [composerHeightPx, setComposerHeightPx] = useState<number | undefined>(undefined)
  useEffect(() => {
    if (!singleLine) return
    const node = textareaRef.current
    if (!node || singleLineHeightPx === undefined || maxHeightPx === undefined) return
    const previousHeight = node.style.height
    node.style.height = 'auto'
    const naturalHeight = node.scrollHeight
    node.style.height = previousHeight
    setComposerHeightPx(Math.min(Math.max(naturalHeight, singleLineHeightPx), maxHeightPx))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, singleLine, textareaRef, singleLineHeightPx, maxHeightPx])
  const singleLineWrapped = composerHeightPx !== undefined && singleLineHeightPx !== undefined
    && composerHeightPx > singleLineHeightPx
  const resizeEasing = CTA_BUTTON_MOTION_EASINGS[motionConfig.composerResizeEasing ?? 'linear']

  // Same shadow engine as CtaButton (via the shared useCardLiftPhysics hook,
  // not a hand-rolled shadow) — reusing the caller's own ctaButtonConfig as-is
  // except: elevationReactionEnabled: false (pinned, never lifts/grows/
  // deepens on hover, press, or focus — see resolveTargetElevation's own
  // short-circuit for that flag); shadowElevationRestingPx overridden to
  // this pill's own composerElevationPx, independently tunable from the
  // shared CtaButtonConfig value every CtaButton on the site rests at; and
  // pressCompressPx overridden so the (separate, opt-in) submit bounce's dip
  // target is bounceElevationPx. handlePress dips to
  // `shadowElevationRestingPx - pressCompressPx`, so solving for the
  // pressCompressPx that lands exactly on bounceElevationPx (relative to
  // composerElevationPx, not the shared CTA default) keeps reusing that
  // existing mechanism instead of hand-rolling a second tween.
  //
  // tagPill chrome pins this engine's own elevation to 0 instead of
  // composerElevationPx: the engine writes its layered box-shadow directly
  // as an inline style (see useCardLiftPhysics), which wins over the
  // wrapper's own `shadow-[...]` utility class regardless of whether that
  // class is present — dropping the class alone (below) doesn't remove
  // this second, always-on shadow source, only zeroing the elevation itself
  // does.
  const effectiveComposerElevationPx = isTagPill ? 0 : composerElevationPx
  const pillPhysicsConfig = useMemo(
    () => ({
      ...ctaButtonConfig,
      elevationReactionEnabled: false,
      shadowElevationRestingPx: effectiveComposerElevationPx,
      pressCompressPx: effectiveComposerElevationPx - bounceElevationPx,
    }),
    [ctaButtonConfig, effectiveComposerElevationPx, bounceElevationPx],
  )
  const {
    ref: liftPhysicsRef,
    handleFocus,
    handleBlur,
    handlePress,
    handleRelease,
    tweenRestingElevation,
  } = useCardLiftPhysics<HTMLDivElement>({
    config: pillPhysicsConfig,
    disabled,
    initialElevationPx: elevationEntranceFromPx,
  })

  // A visitor who focuses the composer is already engaging with it — making
  // them keep waiting through the rest of a scheduled color settle (see
  // introColorTransitionDelayMs) reads as unresponsive to what they just
  // did. Once true, permanent for this mounted instance (matches this
  // codebase's other one-shot "engagement retires a scheduled nudge"
  // precedent, e.g. GuidedIntake's confirm-screen forceHover release) —
  // blurring and refocusing shouldn't reinstate the wait. Harmless no-op
  // for contact.tsx, which never sets introColorTransitionDelayMs/
  // DurationMs in the first place (0 either way).
  const [colorTransitionForced, setColorTransitionForced] = useState(false)
  const effectiveColorTransitionDelayMs = colorTransitionForced ? 0 : (introColorTransitionDelayMs ?? 0)
  const handleComposerFocus = useCallback((event: React.FocusEvent<HTMLDivElement>) => {
    handleFocus(event)
    setColorTransitionForced(true)
    onFocusChange?.(true)
  }, [handleFocus, onFocusChange])
  const handleComposerBlur = useCallback(() => {
    handleBlur()
    onFocusChange?.(false)
  }, [handleBlur, onFocusChange])

  // One-shot entrance tween from elevationEntranceFromPx up to
  // composerElevationPx — deliberately run once on mount only (not a live
  // binding to composerElevationPx), so a live panel edit of
  // composerElevationPx afterward doesn't replay this as a second tween.
  useEffect(() => {
    if (elevationEntranceFromPx === undefined) return
    const delayMs = Math.max(0, elevationEntranceDelayMs ?? 0)
    const timeoutId = window.setTimeout(() => {
      tweenRestingElevation(
        effectiveComposerElevationPx,
        elevationEntranceDurationMs ?? 0,
        elevationEntranceEasing ?? 'ease',
      )
    }, delayMs)
    return () => window.clearTimeout(timeoutId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Dip-then-spring-back, reusing the exact same pond-bounce mechanism
  // elevationReactionEnabled: false already gives every press (see
  // useCardLiftPhysics's handlePress/handleRelease) — just invoked directly
  // from the submit action itself rather than from a real pointer press, so
  // it fires identically whether the visitor hits Enter or clicks the arrow.
  // Off by default (bounceOnSubmitEnabled); spring stiffness/damping/
  // duration/easing still come from the shared CtaButtonConfig fields
  // (pressTransitionMs, pressEasing, pressBounceStiffness,
  // pressBounceDamping) — only the dip depth is composer-specific (above).
  const triggerSubmitBounce = useCallback(() => {
    if (!bounceOnSubmitEnabled) return
    handlePress()
    window.setTimeout(handleRelease, pillPhysicsConfig.pressTransitionMs)
  }, [bounceOnSubmitEnabled, handlePress, handleRelease, pillPhysicsConfig.pressTransitionMs])

  const handleSubmit = useCallback(() => {
    triggerSubmitBounce()
    onSubmit()
  }, [triggerSubmitBounce, onSubmit])

  // Only true for this pill's very first mount (heroPhase starts 'centered'
  // and never returns to it) — a caller may unmount and remount this
  // component across a longer flow (e.g. contact.tsx's conditional render
  // across conversation phases), so gating on heroPhase rather than "on
  // every mount" is what keeps this a true one-time entrance instead of
  // replaying on every later round.
  const showHeroEntrance = heroPhase === 'centered'
  // Independent of the hero-entrance flag above: starterPoints only has a
  // real effect while the field is empty (both the hint row and the
  // browsing carousel replace the placeholder, which never shows over real
  // text). In this codebase's actual usage the two always coincide — the
  // starter affordance only ever appears during pages/contact.tsx's opening
  // message, which is exactly the window showHeroEntrance also covers — but
  // this stays a separate, prop-driven condition rather than relying on
  // that coincidence.
  const showStarterOverlay = !!starterPoints && !value
  const showOverlay = (showHeroEntrance || showStarterOverlay) && !value
  const isBrowsingStarterPoints = starterPoints?.mode === 'browsing'
  // Drives the mobile-only placeholder↔hint swap (see the overlay's own
  // mode-ternary below) and its dismiss × in the trailing controls.
  const isHintStarterPoints = starterPoints?.mode === 'hint'
  // See emptyValueAction's own doc comment — mutually exclusive with the
  // send arrow by construction, both keyed on the same "is there real
  // value yet" check.
  const showEmptyValueAction = !!emptyValueAction && !value.trim() && !isBrowsingStarterPoints
  // introText being set means a selected starting point's SplitTextReveal
  // sweep is still animating in (see selectStarterStem's own doc comment in
  // contact.tsx) — the real value stays '' for that whole window, so the
  // textarea's native caret would otherwise sit blinking at its left edge,
  // underneath/ahead of the text as it's introduced character-by-character.
  // Suppressing it here (same mechanism as the browsing carousel above) and
  // letting selectStarterStem's own focus()/setSelectionRange(end) reinstate
  // it once the seeded text actually becomes real value is what moves the
  // flicker from "start of an incomplete line" to "end of the finished one."
  const isRevealingIntro = !!introText

  const pillStyle = {
    '--pill-background': colors.background,
    '--pill-border': isTagPill ? tagPillBorderColor : colors.border,
    '--pill-text': colors.text,
    '--pill-placeholder': placeholderColor,
    '--pill-overlay-color': overlayColor,
    '--pill-starter-hover': colors.hoverText,
    '--pill-button-text': buttonTextColor ?? colors.text,
    '--pill-button-hover-text': buttonHoverActiveTextColor ?? buttonTextColor ?? colors.text,
    '--pill-empty-action-text': emptyValueActionTextColor ?? colors.text,
    '--pill-empty-action-hover-text':
      emptyValueActionHoverActiveTextColor ?? emptyValueActionTextColor ?? colors.text,
    '--pill-hover-background': ctaButtonConfig.hoverColorsEnabled ? colors.hoverBackground : colors.background,
    '--pill-hover-border': isTagPill
      ? tagPillHoverBorderColor
      : ctaButtonConfig.hoverColorsEnabled ? colors.hoverBorder : colors.border,
    '--contact-hero-fade-duration': `${motionConfig.heroContainerFadeInDurationMs}ms`,
    '--contact-hero-fade-easing': CTA_BUTTON_MOTION_EASINGS[motionConfig.heroContainerFadeInEasing],
    backgroundColor: 'var(--pill-background)',
    borderColor: 'var(--pill-border)',
    color: 'var(--pill-text)',
    minHeight: `${ctaButtonConfig.minHeightPx}px`,
    transformOrigin: 'center center',
    transformStyle: 'preserve-3d',
    backfaceVisibility: 'hidden',
    willChange: 'transform, box-shadow',
  } as CSSProperties

  return (
    <div
      ref={liftPhysicsRef}
      className={`group relative ${align === 'left' ? '' : 'mx-auto'} flex w-full max-w-[520px] items-center border-solid transition-colors focus-within:[background-color:var(--pill-hover-background)] focus-within:[border-color:var(--pill-hover-border)] ${isTagPill ? 'border' : `${ctaButtonConfig.borderWidth} shadow-[0_4px_10px_rgba(0,0,0,0.12)]`} ${ctaButtonConfig.radius} ${showHeroEntrance ? 'contact-hero-container-fade-in' : ''} ${className}`}
      style={pillStyle}
      onFocus={handleComposerFocus}
      onBlur={handleComposerBlur}
      onMouseEnter={() => onHoverChange?.(true)}
      onMouseLeave={() => onHoverChange?.(false)}
    >
      <label className="sr-only" htmlFor="agent-input">Message to Manuel</label>
      {/* Padding lives on the textarea itself, not the wrapping div — a
          native text input's own padding is part of its clickable/focusable
          box, so the whole CTA shape (not just the glyph area) places the
          caret, the way a real text input's hit area works. Extra right
          padding (pr-12/md:pr-16) reserves room for the absolutely
          positioned send arrow so multi-line text never runs under it.
          No wrapper div around the textarea — it stays a direct flex child
          exactly as before this feature existed (a wrapper here previously
          broke items-center's own vertical centering: the textarea's
          natural height no longer contributed to a wrapper whose own box
          was what actually got centered, leaving the caret pinned to the
          top of a taller box instead). The placeholder overlay below is
          centered independently via top-1/2 -translate-y-1/2, matching the
          textarea's own centering without needing to share a box with it. */}
      <textarea
        id="agent-input"
        ref={textareaRef}
        rows={1}
        autoFocus={autoFocus}
        value={value}
        // singleLine also converts the box's entire vertical space into
        // line-height (with vertical padding zeroed, horizontal padding
        // from the className untouched) rather than splitting it between a
        // tight line-height and padding — confirmed live in WebKit
        // (Playwright's webkit engine, standing in for Safari): the
        // `flex items-center` centering trick two paragraphs up is a
        // Chromium-specific behavior for a <textarea>'s own internal text,
        // not a cross-browser guarantee — WebKit instead falls back to the
        // browser's standard, spec'd half-leading algorithm for laying out
        // a line of text within its line-height box, which only visibly
        // centers the glyph when line-height actually exceeds the font's
        // own natural single-line height. The original tight-fit
        // line-height (from leading-snug, ~= the font's own natural
        // height) left WebKit no slack to center within, so its baseline
        // anchoring showed through as text/caret sitting low. Total box
        // height is unchanged — this only redistributes it from
        // (padding + tight line-height) to (all line-height), which is
        // never shorter, so nothing here can reintroduce the multi-line
        // growth bug the singleLineHeightPx lock above already exists to
        // prevent. Only applied while singleLineWrapped is false — see its
        // own doc comment above for why: once real content actually needs a
        // second line, this same box-height line-height would stretch EVERY
        // line by that much, not just center a lone one, so wrapped content
        // falls back to the plain leading-snug class + its natural
        // (unzeroed) padding instead — scrollable once it reaches
        // maxHeightPx (or immediately, absent maxVisibleLines), otherwise
        // grown to fit, transitioned via composerResizeDurationMs/-Easing.
        style={singleLine && composerHeightPx !== undefined ? (
          singleLineWrapped
            ? {
              height: `${composerHeightPx}px`,
              transitionProperty: 'height',
              transitionDuration: `${motionConfig.composerResizeDurationMs ?? 0}ms`,
              transitionTimingFunction: resizeEasing,
            }
            : {
              height: `${composerHeightPx}px`,
              lineHeight: `${composerHeightPx}px`,
              paddingTop: 0,
              paddingBottom: 0,
              transitionProperty: 'height',
              transitionDuration: `${motionConfig.composerResizeDurationMs ?? 0}ms`,
              transitionTimingFunction: resizeEasing,
            }
        ) : undefined}
        onChange={event => onChange(event.target.value)}
        onKeyDown={event => {
          if (disabled) return
          if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault()
            handleSubmit()
          }
        }}
        // The native placeholder attribute can't be animated per-character
        // (it's rendered by the browser's own UA styling, inaccessible to
        // CSS/DOM) — so during the hero entrance it's emptied in favor of
        // the animated overlay below, with aria-placeholder carrying the
        // same hint to assistive tech either way. Every other round (once
        // heroPhase has left 'centered' for good) falls back to the plain
        // native placeholder exactly as before this feature existed.
        placeholder={showOverlay ? '' : placeholder}
        aria-placeholder={placeholder}
        // readOnly, not disabled: the HTML spec forces a UA to blur a
        // control the instant it becomes disabled (unfocusable while
        // disabled is non-negotiable per spec), which is what was actually
        // closing the mobile keyboard on every pending round-trip — no
        // amount of re-focusing afterward fixes it, because that later
        // .focus() call lands outside the original tap's user-activation
        // window, and mobile WebKit/Blink refuse to reopen the soft
        // keyboard for a focus() call that isn't synchronously inside a
        // user gesture. readOnly blocks editing exactly like disabled did,
        // but a readonly control is still allowed to hold focus per spec —
        // so the textarea (and the keyboard) never actually leaves focus
        // across the pending → writing cycle, and there's nothing to
        // reopen. aria-disabled carries the non-interactive state to
        // assistive tech in place of the native disabled semantics.
        readOnly={disabled}
        aria-disabled={disabled}
        // flex + items-center: a native <textarea> always top-aligns its own
        // text/caret within its box by default — align-items on the
        // wrapping div (see the doc comment above) only centers the
        // textarea's own OUTER box within the pill, never the line of text
        // inside it. Modern browsers do honor display:flex on a textarea
        // itself for its internal content, so this centers the real caret
        // (not just the placeholder overlay, which already had its own
        // independent centering) — operator-reported, 2026-08-26: caret
        // visibly sat above the placeholder/arrow's own vertical center.
        // singleLine keeps flex centering enabled as well: the fixed-height
        // one-line state is the primary contact interaction, so the native
        // caret must share the pill's visual midline rather than sitting
        // against its top padding. Overflow remains scrollable when a long
        // message wraps; the browser clips the scrollable flex content to
        // the textarea's own box instead of changing the pill's height.
        //
        // singleLine also drops max-h-40 (the growing case's own cap, now
        // unreachable — see the resize effect above) since there's nothing
        // left to cap: with the resize effect skipped, rows={1}'s own
        // native browser sizing (padding + line-height, independent of
        // content length) is what renders, and it never grows in the first
        // place. overflow-y-auto keeps content that wraps past that one
        // line reachable by scrolling within the fixed box, rather than
        // bleeding outside it.
        // caret-transparent ONLY while the browsing carousel is up — the
        // native caret is pinned to this element's own left edge regardless
        // of what the overlay on top of it is doing, which is harmless
        // while that overlay is plain left-aligned placeholder/hint text
        // starting at the same x position (the normal, focused-and-empty
        // case, where a visible blinking caret is exactly the "this is
        // editable" feedback a visitor expects), but starterPoints'
        // browsing carousel centers its content (justify-center below),
        // which left an orphaned blinking caret at the far left with no
        // visible relationship to the centered stem next to it. Gating this
        // on the broader showOverlay (true for nearly the entire pre-submit
        // window, not just browsing) previously hid the caret almost
        // always while focused and empty — a real regression, not a fix.
        className={`${singleLine ? 'flex items-center overflow-y-auto' : 'flex items-center max-h-40'} min-h-6 w-full flex-1 resize-none border-0 bg-transparent text-left font-sans ${ctaButtonConfig.fontSize} leading-snug text-[color:var(--pill-text)] ${isBrowsingStarterPoints || isRevealingIntro ? 'caret-transparent' : 'caret-[color:var(--pill-text)]'} outline-none placeholder:text-[color:var(--pill-placeholder)] ${isTagPill ? 'placeholder:font-mono placeholder:uppercase placeholder:tracking-[0.16em]' : ''} read-only:cursor-wait ${ctaButtonConfig.paddingX} ${ctaButtonConfig.paddingXDesktop} ${ctaButtonConfig.paddingY} ${ctaButtonConfig.paddingYDesktop} pr-12 md:pr-16`}
      />
      {showOverlay && (
        <span
          // Only decorative (the placeholder text/dot) while starterPoints
          // is absent — carries real interactive controls once it's set, so
          // this can no longer be unconditionally aria-hidden in that case
          // (the inner elements manage their own semantics instead).
          aria-hidden={starterPoints ? undefined : true}
          // The intro line (introText) reads as committed, already-typed
          // text — see this component's own doc comment — so the tag-pill
          // treatment only applies once the overlay has settled to the real,
          // persistent placeholder (introText cleared), not to that line.
          // pointer-events-none here (unconditionally, starterPoints or not)
          // is what lets a click anywhere on this row still land on the
          // textarea beneath it — every real control inside opts back in
          // individually via pointer-events-auto. Without this, the row's
          // own full-width hit area (inset-x-0) would swallow clicks meant
          // for the textarea across the entire placeholder/hint region, not
          // just over the interactive label itself.
          className={`pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 text-left ${isTagPill && !introText ? 'font-mono uppercase tracking-[0.16em]' : 'font-sans'} ${ctaButtonConfig.fontSize} leading-snug text-[color:var(--pill-overlay-color)] ${ctaButtonConfig.paddingX} ${ctaButtonConfig.paddingXDesktop} pr-12 md:pr-16`}
          // Color and opacity transition independently — two positions in
          // each comma-separated list, matched by index — so a caller (e.g.
          // AbstractHeroCtaComposer) can fade this whole block out on one
          // beat and settle its color on an entirely later one. Neither
          // transitionDurationMs prop is ever set by contact.tsx, so both
          // stay inert, un-animated reads there, exactly as before.
          style={{
            transitionProperty: 'color, opacity',
            transitionDuration: `${introColorTransitionDurationMs ?? 0}ms, ${introOpacityTransitionDurationMs ?? 0}ms`,
            transitionTimingFunction: `${introColorTransitionEasing ?? 'ease'}, ${introOpacityTransitionEasing ?? 'ease'}`,
            transitionDelay: `${effectiveColorTransitionDelayMs}ms, 0ms`,
            opacity: introOpacity,
          }}
        >
          {starterPoints?.mode === 'browsing' ? (
            <>
              {/* Desktop (md+): original centered chevron-stem-chevron row,
                  unchanged — replaces the placeholder text wholesale, the
                  visitor is now stepping through STARTER_STEMS one at a
                  time. pointer-events-none on the row (matching the
                  placeholder row below) with pointer-events-auto on each
                  real control, so clicking anywhere else in the pill still
                  focuses the textarea. */}
              <span className="pointer-events-none hidden w-full items-center justify-center gap-2 md:flex">
                <ComposerStarterChevron
                  direction="left"
                  color={colors.text}
                  ariaLabel="Previous starting point"
                  onClick={starterPoints.onPrev}
                />
                <button
                  type="button"
                  onClick={() => starterPoints.onSelect(starterPoints.options[starterPoints.index])}
                  onMouseDown={event => event.preventDefault()}
                  className="pointer-events-auto min-w-0 truncate rounded-sm text-[color:var(--pill-text)] underline decoration-[color:var(--pill-placeholder)] underline-offset-4 transition-colors hover:text-[color:var(--pill-starter-hover)] hover:decoration-[color:var(--pill-starter-hover)] focus-visible:text-[color:var(--pill-starter-hover)] focus-visible:decoration-[color:var(--pill-starter-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--pill-hover-border)]"
                  style={{
                    transitionDuration: `${starterPoints.transitionDurationMs}ms`,
                    transitionTimingFunction: starterPoints.transitionEasing,
                  }}
                >
                  {starterPoints.options[starterPoints.index]}
                </button>
                <ComposerStarterChevron
                  direction="right"
                  color={colors.text}
                  ariaLabel="Next starting point"
                  onClick={starterPoints.onNext}
                />
              </span>
              {/* Mobile (below md): the stem alone, left-aligned flush with
                  the placeholder's own start position (paddingX) — no room
                  for flanking chevrons either side of it. Their mobile
                  equivalent moves into the trailing cluster next to the
                  close × instead (see the disabled ? ... : ... block
                  below). pr-28 clears that 3-control cluster (~150px
                  including the pill's own right-2 edge inset) — the outer
                  row's shared pr-12 only ever budgeted for a single
                  trailing control (the send arrow / close ×). */}
              <span className="pointer-events-none flex w-full items-center justify-start pr-28 md:hidden">
                <button
                  type="button"
                  onClick={() => starterPoints.onSelect(starterPoints.options[starterPoints.index])}
                  onMouseDown={event => event.preventDefault()}
                  className="pointer-events-auto min-w-0 truncate rounded-sm text-[color:var(--pill-text)] underline decoration-[color:var(--pill-placeholder)] underline-offset-4 transition-colors hover:text-[color:var(--pill-starter-hover)] hover:decoration-[color:var(--pill-starter-hover)] focus-visible:text-[color:var(--pill-starter-hover)] focus-visible:decoration-[color:var(--pill-starter-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--pill-hover-border)]"
                  style={{
                    transitionDuration: `${starterPoints.transitionDurationMs}ms`,
                    transitionTimingFunction: starterPoints.transitionEasing,
                  }}
                >
                  {starterPoints.options[starterPoints.index]}
                </button>
              </span>
            </>
          ) : (
            <>
              {/* Desktop (md+): today's exact single-row "<placeholder> ·
                  <hintLabel>" treatment, byte-for-byte — both fit side by
                  side at this width, so nothing is sacrificed and no mode
                  is ever created here (an explicit exit is only needed on
                  mobile, see the trailing controls below). */}
              <span className="hidden max-w-full items-center gap-1.5 md:inline-flex">
                {/* Keyed on which line is showing so the intro->placeholder
                    handoff remounts SplitTextReveal (a pure-CSS-keyframe
                    animation, see its own doc comment) and replays it
                    fresh, rather than trying to animate between two
                    already-mounted texts. introOpacity above (not a key
                    change) is what plays the current line back out first —
                    the reveal itself never remounts until the text
                    actually changes. */}
                <SplitTextReveal
                  key={introText ? 'intro' : 'placeholder'}
                  text={introText ?? placeholder}
                  unit="char"
                  initialDelayMs={placeholderRevealInitialDelayMs}
                  stepDelayMs={motionConfig.heroPlaceholderRevealStepDelayMs}
                  unitDurationMs={motionConfig.heroPlaceholderRevealUnitDurationMs}
                  easing={CTA_BUTTON_MOTION_EASINGS[motionConfig.heroPlaceholderRevealEasing]}
                  distribution={overlayDistribution}
                  cadenceAmount={overlayCadenceAmount}
                  unitTranslateYPx={introUnitTranslateYPx}
                />
                {starterPoints && (
                  // "<placeholder> · <hintLabel>" — the dot is a fixed,
                  // non-interactive separator (U+00B7); only the label
                  // itself is a real control. Fades independently of the
                  // placeholder text above it, per mode: 'hint' (visible)
                  // vs 'hidden' (typed-through, faded out) — never shown at
                  // all in 'browsing' (this whole branch is skipped then).
                  <span
                    className="pointer-events-auto inline-flex shrink-0 items-center gap-1.5"
                    style={{
                      transitionProperty: 'opacity',
                      // Fade-IN (revealing → 'hint') gets the dedicated,
                      // gentler fadeIn knob; every other direction
                      // (fade-out on the first keystroke) keeps the
                      // shared, faster transition.
                      transitionDuration: `${isHintStarterPoints ? starterPoints.fadeInDurationMs : starterPoints.transitionDurationMs}ms`,
                      transitionTimingFunction: isHintStarterPoints ? starterPoints.fadeInEasing : starterPoints.transitionEasing,
                      opacity: isHintStarterPoints ? 1 : 0,
                      pointerEvents: isHintStarterPoints ? 'auto' : 'none',
                    }}
                  >
                    <span aria-hidden="true" className="text-[color:var(--pill-placeholder)]">·</span>
                    <button
                      type="button"
                      onClick={starterPoints.onHintClick}
                      onMouseDown={event => event.preventDefault()}
                      tabIndex={isHintStarterPoints ? 0 : -1}
                      className="whitespace-nowrap text-[color:var(--pill-text)] underline decoration-[color:var(--pill-placeholder)] underline-offset-4 transition-colors hover:decoration-[color:var(--pill-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--pill-hover-border)]"
                    >
                      {starterPoints.hintLabel}
                    </button>
                  </span>
                )}
              </span>

              {/* Mobile (below md): no room for both — the placeholder and
                  the hint question occupy the identical box (CSS Grid
                  stacking: both children placed in the same cell, col/row
                  1/1) rather than sharing one row, so neither ever reserves
                  layout width it isn't currently showing (the bug this
                  whole split exists to fix: an opacity-0 sibling still
                  occupies flex width, which is what forced "Start anywhere"
                  to wrap even while the hint was invisible — see
                  PLAN-CONTACT-COMPOSER-STARTERS-MOBILE.md). Grid stacking,
                  not absolute-positioned inset-0 (tried first, reverted —
                  operator-reported 2026-09-21: the hint text sat ~6px below
                  the pill's true vertical center): an absolute-positioned
                  child's inset-0 resolves against its containing block's
                  OWN height, but that block had no in-flow content (both
                  children were taken out of flow), so its height collapsed
                  to near-zero and each child's centering became
                  inconsistent (SplitTextReveal's char spans vs. the plain
                  button resolved that collapsed height slightly
                  differently). Grid items, unlike absolutely-positioned
                  ones, still contribute to their container's intrinsic
                  size even when stacked in the same cell — the container
                  auto-sizes to the taller child, giving both a real,
                  shared height to center within via each cell's own
                  flex items-center, fixing the drift outright rather than
                  patching around it with a magic offset. Exactly one of
                  the two is opaque/interactive at a time; both are
                  left-aligned flush with the row's own padding — the same
                  start position the placeholder always had. */}
              <span className="grid w-full md:hidden">
                <span
                  className="pointer-events-none col-start-1 row-start-1 flex items-center"
                  style={{
                    transitionProperty: 'opacity',
                    transitionDuration: `${starterPoints?.transitionDurationMs ?? 0}ms`,
                    transitionTimingFunction: starterPoints?.transitionEasing ?? 'ease',
                    opacity: isHintStarterPoints ? 0 : 1,
                  }}
                >
                  <SplitTextReveal
                    key={introText ? 'intro' : 'placeholder'}
                    text={introText ?? placeholder}
                    unit="char"
                    initialDelayMs={placeholderRevealInitialDelayMs}
                    stepDelayMs={motionConfig.heroPlaceholderRevealStepDelayMs}
                    unitDurationMs={motionConfig.heroPlaceholderRevealUnitDurationMs}
                    easing={CTA_BUTTON_MOTION_EASINGS[motionConfig.heroPlaceholderRevealEasing]}
                    distribution={overlayDistribution}
                    cadenceAmount={overlayCadenceAmount}
                    unitTranslateYPx={introUnitTranslateYPx}
                  />
                </span>
                {starterPoints && (
                  <span
                    className="pointer-events-auto col-start-1 row-start-1 flex items-center"
                    style={{
                      transitionProperty: 'opacity',
                      transitionDuration: `${isHintStarterPoints ? starterPoints.fadeInDurationMs : starterPoints.transitionDurationMs}ms`,
                      transitionTimingFunction: isHintStarterPoints ? starterPoints.fadeInEasing : starterPoints.transitionEasing,
                      opacity: isHintStarterPoints ? 1 : 0,
                      pointerEvents: isHintStarterPoints ? 'auto' : 'none',
                    }}
                  >
                    <button
                      type="button"
                      onClick={starterPoints.onHintClick}
                      onMouseDown={event => event.preventDefault()}
                      tabIndex={isHintStarterPoints ? 0 : -1}
                      className="whitespace-nowrap text-[color:var(--pill-text)] underline decoration-[color:var(--pill-placeholder)] underline-offset-4 transition-colors hover:decoration-[color:var(--pill-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--pill-hover-border)]"
                    >
                      {starterPoints.hintLabel}
                    </button>
                  </span>
                )}
              </span>
            </>
          )}
        </span>
      )}
      {/* Both the arrow and the pending indicator are absolutely positioned
          in the exact same slot — swapping between them on `disabled` never
          reflows the pill (only ever a paint-level swap, no layout
          participation from either element). */}
      {disabled ? (
        pendingIndicator ? (
          // flex items-center (not a plain span) — pendingIndicator's own
          // content (AgentPendingIndicator's inline-flex dot row) would
          // otherwise sit in this span's anonymous line box and default to
          // vertical-align: baseline, which — inherited from the pill's own
          // larger font-size/line-height — visibly sinks a short row of
          // dots toward the bottom of that line box instead of centering
          // it. A flex container centers its content directly, regardless
          // of the child's own display/vertical-align.
          <span className="absolute right-4 top-1/2 flex -translate-y-1/2 items-center md:right-6">
            {pendingIndicator}
          </span>
        ) : null
      ) : (
        <>
          {/* The scale-to-zero transform lives on this wrapper, not the
              button itself — the button keeps its own unmodified
              group-hover:translate-x-1/group-focus-within:translate-x-1
              hover-shift, which relies on Tailwind's transform utility
              classes composing their own `transform` declaration; an inline
              style transform on the button would have higher specificity
              than those classes and silently cancel the hover-shift for
              every caller, not just while browsing. Absent starterPoints
              (or while not browsing), isBrowsingStarterPoints is always
              false, so this wrapper sits at scale(1)/opacity 1 permanently
              and the button renders exactly as it did before this feature
              existed. */}
          {showEmptyValueAction ? (
            // Same slot the arrow occupies, replacing it outright rather
            // than adding a second control alongside an already-disabled
            // one — see emptyValueAction's own doc comment. No scale/
            // opacity transition tied to starterPoints here: this and the
            // arrow are never both mounted at once (the ternary itself is
            // the swap), so there's nothing to cross-fade between.
            // inset-y-0 + flex items-center (not top-1/2 -translate-y-1/2):
            // the old version's hit box was only as tall as one line of
            // text-sm (~20px), centered over a taller pill — but the
            // underline sat underline-offset-4 (4px) further down, visually
            // implying a larger clickable row than the button's own box
            // actually covered. Moving the pointer onto/near that underline
            // exited the button's real hit box and landed on the textarea
            // underneath (which spans the pill's full height), flipping the
            // cursor to text and making the label hard to click
            // (operator-reported, 2026-09-21). Stretching the button to the
            // pill's full height makes the entire visible row a single,
            // consistent pointer-cursor target. Underline removed per the
            // same report ("remove the border") — plain color + hover
            // dimming now carries the link affordance instead.
            <button
              type="button"
              className="absolute inset-y-0 right-2 z-10 flex items-center whitespace-nowrap px-2 text-sm text-[color:var(--pill-empty-action-text)] transition-colors hover:text-[color:var(--pill-empty-action-hover-text)] active:text-[color:var(--pill-empty-action-hover-text)] focus-visible:rounded-sm focus-visible:text-[color:var(--pill-empty-action-hover-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--pill-hover-border)] md:right-4"
              onClick={emptyValueAction!.onClick}
              onMouseDown={event => event.preventDefault()}
            >
              {emptyValueAction!.label}
            </button>
          ) : (
            // inset-y-0 right-0 w-12 md:w-16: was right-2/md:right-4 + a
            // small min-h-11/min-w-11 button floating inside this slot —
            // the textarea's own reserved trailing padding (pr-12/md:pr-16,
            // same w-12/md:w-16 zone, still part of the textarea's own
            // hit box) is WIDER than that 44px button, leaving an
            // unclaimed textarea-only sliver on both sides (measured live,
            // 2026-09-22: ~7px left, ~12px right) — exactly where a
            // pointer aiming at the visible arrow naturally rests,
            // flickering the cursor between pointer and text-select as it
            // drifted a few px off the button's own edge (operator-
            // reported, same root cause as the emptyValueAction button's
            // fix above, just never applied here). This span now exactly
            // matches the textarea's own reserved zone pixel-for-pixel —
            // full height (inset-y-0, not top-1/2 + translateY), full slot
            // width — and the button inside fills it completely
            // (h-full w-full below), leaving no boundary pixel at all for
            // the cursor to fall through to the textarea underneath.
            <span
              className="absolute inset-y-0 right-0 w-12 md:w-16"
              style={{
                transitionProperty: 'transform, opacity',
                transitionDuration: `${starterPoints?.transitionDurationMs ?? 0}ms`,
                transitionTimingFunction: starterPoints?.transitionEasing ?? 'ease',
                transform: `scale(${isBrowsingStarterPoints ? 0 : 1})`,
                opacity: isBrowsingStarterPoints ? 0 : 1,
                pointerEvents: isBrowsingStarterPoints ? 'none' : undefined,
              }}
            >
              <button
                aria-label="Send"
                aria-hidden={isBrowsingStarterPoints}
                // max-[767px]:hidden only while isHintStarterPoints: mobile's
                // dismiss × (below) occupies this exact slot in that mode
                // instead — desktop never applies this (placeholder + hint
                // coexist there, arrow stays put), and mobile's own
                // hidden/browsing states are untouched (existing
                // isBrowsingStarterPoints scale/opacity below still governs
                // those, on every breakpoint).
                className={`flex h-full w-full items-center justify-center ${isTagPill ? 'font-mono' : ''} ${isHintStarterPoints ? 'max-[767px]:hidden' : ''} text-lg text-[color:var(--pill-button-text)] opacity-60 transition-[transform,color] disabled:cursor-not-allowed disabled:opacity-30 group-hover:translate-x-1 group-hover:text-[color:var(--pill-button-hover-text)] group-focus-within:translate-x-1 group-focus-within:text-[color:var(--pill-button-hover-text)] active:text-[color:var(--pill-button-hover-text)] focus-visible:rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--pill-hover-border)]`}
                disabled={!value.trim() || isBrowsingStarterPoints}
                tabIndex={isBrowsingStarterPoints ? -1 : 0}
                onClick={handleSubmit}
                // Stops the browser's default tap-to-blur before it happens
                // (fires before focus ever leaves the textarea, for mouse and
                // touch alike) — without this, tapping Send on mobile closes
                // the keyboard immediately, and the async re-focus in the
                // effect above fires too late for WebKit/Chrome to reopen it.
                // Keeps the composer focused/keyboard-open across a send
                // exactly like pressing Enter already does.
                onMouseDown={event => event.preventDefault()}
                type="button"
              >
                →
              </button>
            </span>
          )}
          {starterPoints && (
            <>
              {/* Mobile-only dismiss for hint mode. Replacing the
                  placeholder with the question (see the overlay's mobile
                  block above) creates a transient mode — the typing
                  invitation briefly disappears — which per Raskin/Tesler's
                  anti-mode principle and Nielsen's "user control and
                  freedom" heuristic needs an explicit, single-tap way back,
                  not just the implicit "type to dismiss" every mode already
                  has. Reuses onClose — the exact action browsing's own
                  close already performs (back to 'hidden'); onClose also
                  marks the visitor as having engaged with the starters
                  (hasEngagedStarterRef in pages/contact.tsx), so the idle
                  hint doesn't immediately re-nag after a dismiss. Desktop
                  never creates this mode (placeholder + hint coexist), so
                  this is md:hidden there. */}
              <button
                aria-label="Dismiss starting points"
                aria-hidden={!isHintStarterPoints}
                tabIndex={isHintStarterPoints ? 0 : -1}
                className="absolute right-2 top-1/2 inline-flex min-h-11 min-w-11 items-center justify-center focus-visible:rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--pill-hover-border)] md:hidden"
                onClick={starterPoints.onClose}
                onMouseDown={event => event.preventDefault()}
                type="button"
                style={{
                  transitionProperty: 'transform, opacity',
                  transitionDuration: `${isHintStarterPoints ? starterPoints.fadeInDurationMs : starterPoints.transitionDurationMs}ms`,
                  transitionTimingFunction: isHintStarterPoints ? starterPoints.fadeInEasing : starterPoints.transitionEasing,
                  transform: `translateY(-50%) scale(${isHintStarterPoints ? 1 : 0})`,
                  opacity: isHintStarterPoints ? 1 : 0,
                  pointerEvents: isHintStarterPoints ? 'auto' : 'none',
                }}
              >
                <ComposerStarterCloseIcon color={colors.text} />
              </button>
              {/* Browsing's own trailing cluster. Mobile pairs the
                  prev/next chevrons — their in-row desktop position (see
                  the browsing branch above) has no room on mobile — with
                  the close × as one group, "← → ×"; each 44px, touch-target
                  parity with the close button they sit beside. Desktop
                  keeps just the close ×; its chevrons stay in-row there
                  (the md:hidden span below never renders at that width). */}
              <span
                className="absolute right-2 top-1/2 flex items-center gap-1 md:right-4"
                style={{
                  transitionProperty: 'transform, opacity',
                  transitionDuration: `${starterPoints.transitionDurationMs}ms`,
                  transitionTimingFunction: starterPoints.transitionEasing,
                  transform: `translateY(-50%) scale(${isBrowsingStarterPoints ? 1 : 0})`,
                  opacity: isBrowsingStarterPoints ? 1 : 0,
                  pointerEvents: isBrowsingStarterPoints ? 'auto' : 'none',
                }}
              >
                <span className="flex items-center gap-1 md:hidden">
                  <ComposerStarterChevron
                    direction="left"
                    color={colors.text}
                    ariaLabel="Previous starting point"
                    onClick={starterPoints.onPrev}
                    sizeClassName="h-11 w-11"
                    hidden={!isBrowsingStarterPoints}
                  />
                  <ComposerStarterChevron
                    direction="right"
                    color={colors.text}
                    ariaLabel="Next starting point"
                    onClick={starterPoints.onNext}
                    sizeClassName="h-11 w-11"
                    hidden={!isBrowsingStarterPoints}
                  />
                </span>
                <button
                  aria-label="Close starting points"
                  aria-hidden={!isBrowsingStarterPoints}
                  tabIndex={isBrowsingStarterPoints ? 0 : -1}
                  className="inline-flex min-h-11 min-w-11 items-center justify-center focus-visible:rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--pill-hover-border)]"
                  onClick={starterPoints.onClose}
                  onMouseDown={event => event.preventDefault()}
                  type="button"
                >
                  <ComposerStarterCloseIcon color={colors.text} />
                </button>
              </span>
            </>
          )}
        </>
      )}
    </div>
  )
}
