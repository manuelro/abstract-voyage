import type { CSSProperties, ReactNode, Ref } from 'react';
import React, { useCallback } from 'react';
import Link from 'next/link';
import PostMetaRow from './PostMetaRow';
import { useCardLiftPhysics } from './proximity/useCardLiftPhysics';
import { DEFAULT_CTA_BUTTON_CONFIG, type CtaButtonConfig } from './CtaButton/config/registered';
import { getArticleCardFallbackBackground } from '../helpers/articleCardFallback';
import { ARTICLE_CARD_DETAIL_FADE_MS, ARTICLE_CARD_DETAIL_FADE_EASING_CSS } from './ArticleCard.detailFade';
import styles from './ArticleCard.module.css';

/** 'fill': no CSS aspect-ratio is set -- the card takes whatever box its
 * parent already gives it (both dimensions). For callers embedding the card
 * in a slot that already fully dictates width AND height (a carousel slide,
 * a swiper item) -- imposing an aspect-ratio there fights the slot's own
 * sizing instead of filling it. '3:4' / '16:9' are for standalone/grid use,
 * where the card itself should own its shape. */
export type ArticleCardAspectRatio = '3:4' | '16:9' | 'fill';
export type ArticleCardInteractiveMode =
  | 'cta-link'
  | 'whole-card'
  | 'parent-link';
/** 'fluid' (default): title/excerpt scale continuously off the card's own
 * container size (cqmin) -- tuned for standalone/grid use at any size.
 * 'dock': the abstract page's original dock typography -- a two-step size
 * (not continuous) that jumps at a 480px container width, matching the
 * dock/deck/scattered look before this component existed. */
export type ArticleCardTypographyScale = 'fluid' | 'dock';
/** 'none' (default): a static card. 'lift': the same proximity-driven
 * lift/tilt/scale + layered shadow CtaButton uses (via useCardLiftPhysics)
 * -- for contexts where the card itself is a physical, "pick this up"
 * object (e.g. a scattered/tossed layout) rather than a flat list item. */
export type ArticleCardPhysicsMode = 'none' | 'lift';
export type ArticleCardAppearance = 'gradient' | 'neutral';
/** `title-and-summary`: preserves the title and excerpt while intentionally
 * omitting the card's supporting metadata and action affordance. */
export type ArticleCardContentMode = 'full' | 'title-and-summary';

export type ArticleCardProps = {
  title: string;
  excerpt?: string;
  label?: string;
  topic?: string;
  date?: string;
  readingTime?: string;
  href?: string;
  externalUrl?: string | null;
  forceExternalNavigation?: boolean;
  /** Deterministic seed for the procedural fallback background, when neither
   * `background` nor `backgroundImage` is given. */
  seed?: number;
  backgroundImage?: string;
  /** Full background-layer override — e.g. a WebGL gradient canvas supplied
   * by a caller that wants its own visual identity. Takes priority over
   * `backgroundImage`/`seed`'s procedural CSS gradient. Keeps this component
   * free of any shader/canvas dependency while still supporting one. */
  background?: ReactNode;
  aspectRatio?: ArticleCardAspectRatio;
  excerptLines?: number;
  /** Hides the excerpt without removing it from layout (visibility, not
   * display) -- so toggling this never moves the title, which would
   * otherwise re-center within a now-shorter title+excerpt block. Defaults
   * to true (shown, when `excerpt`/`excerptLines` otherwise allow it). */
  excerptVisible?: boolean;
  className?: string;
  style?: CSSProperties;
  /** Overrides the default container-scaled content padding — for callers
   * (e.g. the abstract page's authoring panel) that expose their own inset
   * knobs. `contentInsetRem` is the floor, `contentInsetWideRem` the ceiling
   * of a `clamp()` that still scales off the card's own container width
   * (cqmin), not the viewport, between the two. Omit both to use the
   * component's own generically-tuned default. */
  contentInsetRem?: number;
  contentInsetWideRem?: number;
  /** See `ArticleCardTypographyScale`. Defaults to 'fluid'. */
  typographyScale?: ArticleCardTypographyScale;
  /** Caps the title+excerpt block to a fixed height, top-aligned within it
   * and the block itself vertically centered in the card -- rather than the
   * default of letting the block free-center across the card's full middle
   * row. Matches the desktop dock's original banded layout (e.g.
   * `'clamp(11rem, 24dvh, 14rem)'`); leave unset for the plain centered
   * behavior other layouts (mobile deck, scattered) use. */
  contentBlockHeight?: string;
  /** Optional presentation styles for the information layer only. The card
   * surface/background remains fully visible. Composite collections use this
   * seam to fade content through without remounting their gradient canvas. */
  contentStyle?: CSSProperties;
  /** Color treatment for the card's information layer and decorative
   * graphics. `gradient` preserves the original light-on-gradient treatment;
   * `neutral` uses dark ink and light borders for a quiet surface while
   * retaining the same content and layout. */
  appearance?: ArticleCardAppearance;
  /** 'cta-link' (default): only the CTA text is a link. 'whole-card':
   * the card root is the link and the CTA renders as plain text.
   * 'parent-link': the card is non-interactive content inside a link owned by
   * its parent and the CTA also renders as plain text, avoiding nested
   * anchors in composite/3D shells. */
  interactive?: ArticleCardInteractiveMode;
  /** Fades meta/CTA detail out (still laid out, not removed) until true —
   * for carousel-style callers that reveal a card's detail only once it
   * settles as the active slide. Defaults to always-visible. */
  detailsVisible?: boolean;
  /** Opts into CtaButton's proximity lift/tilt/shadow physics — see
   * `ArticleCardPhysicsMode`. Defaults to 'none' (static). */
  physics?: ArticleCardPhysicsMode;
  /** Physics tuning, reusing CtaButton's own config shape (light position,
   * elevation curve, shadow response) rather than a parallel one — defaults
   * to CtaButton's own defaults so a lifted card is lit identically. Only
   * relevant when `physics="lift"`. */
  physicsConfig?: CtaButtonConfig;
  /** A static, additional rotateZ term composed alongside the dynamic
   * tilt/lift/scale stack — e.g. a scattered card's own resting toss angle.
   * Only relevant when `physics="lift"`. */
  rotationDeg?: number;
  /** Opt-in: hides the CTA until the card itself is hovered or focused,
   * fading it in/out with the same easing already used for the
   * meta row's own detail reveal (see `.detailFade`) — independent of
   * `detailsVisible`, which still governs the meta row alone. Defaults to
   * false (CTA always visible), preserving today's behavior for existing
   * callers. */
  ctaHoverOnly?: boolean;
  /** Overrides the fade duration/easing `ctaHoverOnly`'s reveal uses,
   * instead of the shared `ARTICLE_CARD_DETAIL_FADE_MS`/
   * `ARTICLE_CARD_DETAIL_FADE_EASING_CSS` constant (`ArticleCard.detailFade
   * .ts`) every other caller of this component gets. Scoped to the CTA's
   * own wrapper only — never touches the excerpt/meta-row fades sharing
   * that same constant elsewhere in this component, so a caller supplying
   * these (e.g. Card Stack's own configurable `stackConfig.ctaHoverDurationMs`
   * /`-Easing`) can retime just the "Read article" reveal without affecting
   * `excerptHoverOnly` or any other `ArticleCard` instance. Omit both to
   * keep today's shared-constant behavior. */
  ctaHoverDurationMs?: number;
  ctaHoverEasingCss?: string;
  /** How long the pointer must stay in (or out of) the card's hover/focus
   * region before `ctaHoverDurationMs`'s fade-in/-out transition even
   * starts — a plain CSS `transition-delay` on the CTA's own wrapper, so it
   * applies symmetrically to both directions and genuinely resets on a
   * direction change mid-delay (no JS timer). Omit for no delay (today's
   * behavior). */
  ctaHoverDelayMs?: number;
  /** Overrides the CTA link/span label. Defaults to "Read article". Useful
   * for non-article card surfaces (e.g. labs) where the same whole-card link
   * mechanism applies but "Read article" is semantically wrong. */
  ctaLabel?: string;
  /** Opt-in: hides the excerpt until the card itself is hovered or focused,
   * fading it in/out with the same easing/duration as `ctaHoverOnly` (see
   * `.hoverReveal`) instead of `excerptVisible`'s plain permanent show/hide.
   * Only takes effect when `excerptVisible` is also true — a caller that
   * wants the excerpt permanently hidden (title-only) sets `excerptVisible`
   * false regardless of this prop. Defaults to false, preserving today's
   * behavior for existing callers. */
  excerptHoverOnly?: boolean;
  /** `title-and-summary` is for an editorial lead card whose reading order
   * should begin with the idea, not category/date/action chrome. */
  contentMode?: ArticleCardContentMode;
};

export function ArticleCard({
  title,
  excerpt,
  label,
  topic,
  date,
  readingTime,
  href,
  externalUrl = null,
  forceExternalNavigation = false,
  seed = 0.42,
  backgroundImage,
  background,
  aspectRatio = '3:4',
  excerptLines = 3,
  excerptVisible = true,
  className = '',
  style,
  interactive = 'cta-link',
  detailsVisible = true,
  contentInsetRem,
  contentInsetWideRem,
  typographyScale = 'fluid',
  contentBlockHeight,
  contentStyle,
  appearance = 'gradient',
  physics = 'none',
  physicsConfig,
  rotationDeg = 0,
  ctaHoverOnly = false,
  ctaHoverDurationMs,
  ctaHoverEasingCss,
  ctaHoverDelayMs,
  ctaLabel = 'Read article',
  excerptHoverOnly = false,
  contentMode = 'full',
}: ArticleCardProps) {
  const isExternal = Boolean(forceExternalNavigation && externalUrl);
  const hasLink = Boolean(href && href !== '#');
  const wholeCardIsLink = interactive === 'whole-card' && hasLink;
  const parentCardIsLink = interactive === 'parent-link' && hasLink;
  const cssGradient = backgroundImage
    ? `url(${backgroundImage}) center / cover no-repeat`
    : getArticleCardFallbackBackground(seed);
  const contentPadding = contentInsetRem !== undefined
    ? `clamp(${contentInsetRem}rem, 6cqmin, ${contentInsetWideRem ?? contentInsetRem}rem)`
    : undefined;

  const physicsEnabled = physics === 'lift';
  const {
    ref: liftPhysicsRef,
    handleFocus: liftHandleFocus,
    handleBlur: liftHandleBlur,
    handlePointerDown: liftHandlePointerDown,
    handleRelease: liftHandleRelease,
    pressedRef: liftPressedRef,
  } = useCardLiftPhysics<HTMLElement>({
    config: physicsConfig ?? DEFAULT_CTA_BUTTON_CONFIG,
    disabled: !physicsEnabled,
    rotationDeg,
  });
  const setPhysicsRef = useCallback((element: HTMLElement | null) => {
    if (physicsEnabled) liftPhysicsRef(element);
  }, [physicsEnabled, liftPhysicsRef]);
  const physicsHandlers = physicsEnabled ? {
    onFocus: liftHandleFocus,
    onBlur: liftHandleBlur,
    onPointerDown: liftHandlePointerDown,
    onPointerUp: liftHandleRelease,
    onPointerCancel: liftHandleRelease,
    onPointerLeave: () => { if (liftPressedRef.current) liftHandleRelease(); },
  } : {};

  const cardClassName = [
    styles.card,
    // A card is an information-dense UI surface, not article body copy.
    // Own its typography so every consumer — including abstract's card
    // stack — consistently inherits Instrument Sans through Tailwind's
    // semantic font-sans token rather than the surrounding page's font.
    'group relative block h-full w-full overflow-hidden bg-black font-sans text-white',
    className,
  ].filter(Boolean).join(' ');

  const cardStyle: CSSProperties = {
    ...(aspectRatio === 'fill' ? {} : { aspectRatio: aspectRatio === '16:9' ? '16 / 9' : '3 / 4' }),
    isolation: 'isolate',
    ...style,
  };
  // Font-size stays fluid (container-query cqmin, in the CSS module) since a
  // static Tailwind text-* step would reopen the overflow bug a fixed size
  // caused on small scattered cards. Line-height doesn't need that -- it's
  // a ratio, not a size -- so it's Tailwind's own tested leading-* utility
  // instead of a hand-picked number.
  const titleClassName = typographyScale === 'dock' ? `${styles.dockTitle} leading-tight` : styles.title;
  const excerptClassName = typographyScale === 'dock' ? `${styles.dockExcerpt} leading-normal` : styles.excerpt;
  const stackStyle: CSSProperties = contentBlockHeight ? {
    height: contentBlockHeight,
    alignSelf: 'center',
    justifyContent: 'flex-start',
  } : {};

  const ctaClassName = `${styles.cta} w-fit border-b font-mono uppercase no-underline`;

  const cta = contentMode === 'title-and-summary' ? null : wholeCardIsLink || parentCardIsLink ? (
    <span className={ctaClassName} aria-hidden="true">{ctaLabel}</span>
  ) : hasLink ? (
    isExternal ? (
      <a href={href} target="_blank" rel="noreferrer" className={ctaClassName}>
        {ctaLabel}
      </a>
    ) : (
      <Link href={href as string} className={ctaClassName}>
        {ctaLabel}
      </Link>
    )
  ) : null;

  const content = (
    <>
      <div aria-hidden="true" style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
        {background ?? <div style={{ position: 'absolute', inset: 0, background: cssGradient }} />}
      </div>
      <div aria-hidden="true" className={`${styles.scrim} pointer-events-none absolute inset-0 z-0`} />
      <div
        className={`${styles.content} relative z-10 grid h-full min-h-0 grid-rows-[auto_1fr_auto]`}
        // willChange explicitly promotes this to its own compositor layer,
        // matching the background canvas's own willChange (GradientRenderer.tsx)
        // — without it, this text layer relies on the browser's implicit
        // layer assignment, which under heavy GPU churn from the canvas's
        // own continuously-updating transform can transiently mis-order the
        // two layers at the compositor level (a known mobile Chrome/Safari
        // quirk), even though DOM z-index already says text wins. Explicitly
        // promoting both sides removes the ambiguity structurally.
        style={{
          willChange: 'transform, opacity',
          ...(contentPadding ? { padding: contentPadding } : {}),
          ...contentStyle,
          '--article-card-detail-fade-duration': `${ARTICLE_CARD_DETAIL_FADE_MS}ms`,
          '--article-card-detail-fade-easing': ARTICLE_CARD_DETAIL_FADE_EASING_CSS,
        } as CSSProperties}
        data-details-visible={detailsVisible ? 'true' : 'false'}
      >
        <div className="flex min-h-0 flex-col">
          {contentMode === 'full' && label ? (
            <span className={`${styles.label} font-mono uppercase`}>
              {label}
            </span>
          ) : null}
          {contentMode === 'full' ? (
            <PostMetaRow
              topic={topic}
              date={date}
              readingTime={readingTime}
              // Reserves 2 lines' worth of height so the meta row's own size
              // never shifts with how many lines it wraps to -- otherwise the
              // title below it (row 2) starts at a different height per card
              // depending on each post's own topic/date/reading-time length.
              style={typographyScale === 'dock' ? { minHeight: '4.2em' } : undefined}
              className="articleCardMeta flex flex-wrap items-center font-mono uppercase"
              topicClassName="articleCardTopic rounded-full border uppercase"
              dateClassName={`articleCardDate ${styles.detailFade}`}
              dateStyle={{ transitionDelay: '80ms' }}
              readingTimeClassName={`articleCardReadingTime ${styles.detailFade}`}
              readingTimeStyle={{ transitionDelay: '150ms' }}
              dotClassName="articleCardSeparator"
              readingTimeSeparatorClassName={`articleCardReadingTime ${styles.detailFade}`}
              readingTimeSeparatorStyle={{ transitionDelay: '150ms' }}
            />
          ) : null}
        </div>
        <div className={`${styles.stack} flex min-h-0 flex-col justify-center`} style={stackStyle}>
          <h2 className={`${titleClassName} ${styles.titleInk} max-w-full font-sans font-medium tracking-normal [overflow-wrap:anywhere]`}>
            {title}
          </h2>
          {excerpt && excerptLines > 0 ? (
            <p
              className={[
                excerptClassName,
                `${styles.excerptInk} max-w-[44rem]`,
                (contentMode === 'title-and-summary' || excerptVisible)
                  ? (contentMode === 'full' && excerptHoverOnly ? styles.hoverReveal : '')
                  : 'invisible',
              ].filter(Boolean).join(' ')}
              // 'dock' scale never line-clamped by excerptLines -- the original
              // dock/deck/scattered look just let the excerpt wrap naturally
              // within the card's own (overflow: hidden) bounds. excerptLines
              // there is a content-authoring signal ("include a short blurb"),
              // not a line-clamp count. Only the 'fluid' (grid/standalone)
              // scale clamps to an exact line count.
              //
              // excerptVisible false uses Tailwind's `invisible` (visibility:
              // hidden), not conditional rendering -- the excerpt keeps
              // reserving its own layout space either way, so hiding it
              // never shifts the title's position within the card.
              // excerptVisible true + excerptHoverOnly instead fades via
              // .hoverReveal (same group-hover/focus-within mechanism as the
              // CTA's own ctaHoverOnly, see .hoverReveal in the CSS module).
              style={typographyScale === 'dock' ? undefined : { maxHeight: `${excerptLines * 1.5}em` }}
            >
              {excerpt}
            </p>
          ) : null}
        </div>
        {cta ? (
          <div
            className={ctaHoverOnly ? styles.hoverReveal : styles.detailFade}
            style={ctaHoverOnly
              ? (ctaHoverDurationMs !== undefined || ctaHoverEasingCss !== undefined || ctaHoverDelayMs !== undefined
                ? {
                    transitionDuration: ctaHoverDurationMs !== undefined ? `${ctaHoverDurationMs}ms` : undefined,
                    transitionTimingFunction: ctaHoverEasingCss,
                    transitionDelay: ctaHoverDelayMs !== undefined ? `${ctaHoverDelayMs}ms` : undefined,
                  }
                : undefined)
              : { transitionDelay: '220ms' }}
          >
            {cta}
          </div>
        ) : <span />}
      </div>
    </>
  );

  const appearanceProps = {
    'data-appearance': appearance,
  } as const;

  if (wholeCardIsLink) {
    return isExternal ? (
      <a
        ref={setPhysicsRef as Ref<HTMLAnchorElement>}
        href={href}
        target="_blank"
        rel="noreferrer"
        aria-label={title}
        className={cardClassName}
        style={cardStyle}
        {...appearanceProps}
        {...physicsHandlers}
      >
        {content}
      </a>
    ) : (
      <Link
        ref={setPhysicsRef as Ref<HTMLAnchorElement>}
        href={href as string}
        aria-label={title}
        className={cardClassName}
        style={cardStyle}
        {...appearanceProps}
        {...physicsHandlers}
      >
        {content}
      </Link>
    );
  }

  return (
    <div
      ref={setPhysicsRef as Ref<HTMLDivElement>}
      className={cardClassName}
      style={cardStyle}
      {...appearanceProps}
      {...physicsHandlers}
    >
      {content}
    </div>
  );
}

export default ArticleCard;
