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
}

/** Declared locally rather than imported from
 * experiences/contact/useComposerHeroPhase.ts — that hook (and its 3-state
 * shape, including 'exiting') is a contact-page-specific concept (it also
 * drives the FLIP dock-glide transition), while this component only ever
 * reads "is this still the entrance phase." A second caller with a simpler
 * 2-state phase (e.g. 'centered' | 'settled') is structurally assignable
 * here unchanged. */
export type ComposerPillHeroPhase = 'centered' | 'exiting' | 'settled'

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
   * one line. true (contact.tsx's own composer): the pill's height never
   * changes — the textarea stays pinned to exactly one line's worth of
   * height and scrolls its own content vertically instead of growing the
   * whole pill (operator ask, 2026-08-26: "must keep the same height at all
   * times"). Content that wraps past one visual line is still fully there
   * and editable, just reached by scrolling within the field, the same way
   * a fixed-height `<input>` would behave if it supported multi-line text. */
  singleLine?: boolean
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

  // singleLine: measure the textarea's own natural one-line height exactly
  // once (empty content, before anything could ever wrap) and lock it in as
  // an explicit `height`, applied below — a real CSS height, not just the
  // `rows={1}` native sizing this used to rely on alone. Confirmed live,
  // 2026-08-26: with only `rows={1}`/`min-h-6` and no explicit height, once
  // content actually wrapped past one line the rendered/painted box grew to
  // fit it (visibly, in a full-page screenshot) even though `rows={1}` is
  // documented HTML behavior that's supposed to hold the row count fixed —
  // a real, reproducible engine quirk on scrollable multi-line content
  // inside an unconstrained-height textarea, not just a screenshot-tooling
  // artifact (checked three independent ways: computed style, getBoundingClientRect,
  // and a full unscoped page screenshot all agreed the box grew). An
  // explicit height, unlike `rows`, is a hard CSS constraint nothing can
  // expand — this is what actually guarantees "the pill must keep the same
  // height at all times," not the native sizing this component relied on
  // before. Measured once (not on every value change) so a visitor's own
  // typed content can never feed back into the very height it's constrained
  // by.
  const [singleLineHeightPx, setSingleLineHeightPx] = useState<number | undefined>(undefined)
  useEffect(() => {
    if (!singleLine) return
    const node = textareaRef.current
    if (!node) return
    setSingleLineHeightPx(node.scrollHeight)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [singleLine, textareaRef])

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
  }, [handleFocus])

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

  const pillStyle = {
    '--pill-background': colors.background,
    '--pill-border': isTagPill ? tagPillBorderColor : colors.border,
    '--pill-text': colors.text,
    '--pill-placeholder': placeholderColor,
    '--pill-overlay-color': overlayColor,
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
      onBlur={handleBlur}
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
        style={singleLine && singleLineHeightPx !== undefined ? { height: `${singleLineHeightPx}px` } : undefined}
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
        placeholder={showHeroEntrance ? '' : placeholder}
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
        // singleLine-only exception: once content wraps past one line,
        // items-center on a scrollable (overflow-y-auto) flex container
        // makes the overflow bleed symmetrically above AND below the box
        // instead of clipping to it (a known flexbox+overflow interaction —
        // confirmed live, text rendered outside the pill's own rounded
        // edges). Not a real tradeoff in practice: with padding symmetric
        // top/bottom and the box height matching exactly one line's own
        // content (rows={1}'s native sizing, no resize effect — see above),
        // top-alignment and center-alignment land on the exact same pixel
        // whenever content actually fits; native top-alignment only visibly
        // differs once content overflows, which is exactly the case where
        // it's also the *correct* behavior (start at the top, scroll down),
        // matching every other scrollable text box's own convention.
        //
        // singleLine also drops max-h-40 (the growing case's own cap, now
        // unreachable — see the resize effect above) since there's nothing
        // left to cap: with the resize effect skipped, rows={1}'s own
        // native browser sizing (padding + line-height, independent of
        // content length) is what renders, and it never grows in the first
        // place. overflow-y-auto keeps content that wraps past that one
        // line reachable by scrolling within the fixed box, rather than
        // bleeding outside it.
        className={`${singleLine ? 'overflow-y-auto' : 'flex items-center max-h-40'} min-h-6 w-full flex-1 resize-none border-0 bg-transparent text-left font-sans ${ctaButtonConfig.fontSize} leading-snug text-[color:var(--pill-text)] caret-[color:var(--pill-text)] outline-none placeholder:text-[color:var(--pill-placeholder)] ${isTagPill ? 'placeholder:font-mono placeholder:uppercase placeholder:tracking-[0.16em]' : ''} read-only:cursor-wait ${ctaButtonConfig.paddingX} ${ctaButtonConfig.paddingXDesktop} ${ctaButtonConfig.paddingY} ${ctaButtonConfig.paddingYDesktop} pr-12 md:pr-16`}
      />
      {showHeroEntrance && !value && (
        <span
          aria-hidden="true"
          // The intro line (introText) reads as committed, already-typed
          // text — see this component's own doc comment — so the tag-pill
          // treatment only applies once the overlay has settled to the real,
          // persistent placeholder (introText cleared), not to that line.
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
          {/* Keyed on which line is showing so the intro->placeholder
              handoff remounts SplitTextReveal (a pure-CSS-keyframe
              animation, see its own doc comment) and replays it fresh,
              rather than trying to animate between two already-mounted
              texts. introOpacity above (not a key change) is what plays
              the current line back out first — the reveal itself never
              remounts until the text actually changes. */}
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
        <button
          aria-label="Send"
          className={`absolute right-2 top-1/2 inline-flex min-h-11 min-w-11 -translate-y-1/2 items-center justify-center ${isTagPill ? 'font-mono' : ''} text-lg opacity-60 transition-transform disabled:cursor-not-allowed disabled:opacity-30 group-hover:translate-x-1 group-focus-within:translate-x-1 focus-visible:rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--pill-hover-border)] md:right-4`}
          disabled={!value.trim()}
          onClick={handleSubmit}
          // Stops the browser's default tap-to-blur before it happens (fires
          // before focus ever leaves the textarea, for mouse and touch
          // alike) — without this, tapping Send on mobile closes the
          // keyboard immediately, and the async re-focus in the effect above
          // fires too late for WebKit/Chrome to reopen it. Keeps the
          // composer focused/keyboard-open across a send exactly like
          // pressing Enter already does.
          onMouseDown={event => event.preventDefault()}
          type="button"
        >
          →
        </button>
      )}
    </div>
  )
}
