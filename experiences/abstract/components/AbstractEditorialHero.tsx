'use client';

import React, { useCallback, useEffect, useMemo } from 'react';
import type { CSSProperties, MutableRefObject, Ref, RefObject } from 'react';
import { normalizeCtaButtonConfig, type CtaButtonConfig } from '../../../components/CtaButton/config/registered';
import { DEFAULT_PAGE_SURFACE_CONFIG } from '../../../components/PageSurface.config';
import { useElevationShadow } from '../../../components/proximity/useElevationShadow';
import { useSharedDesignConfig } from '../../../components/SharedDesignConfigProvider';
import { renderEmphasisText } from '../../../helpers/textEmphasis';
import { deriveSurfaceColor, resolveContrastAwareTextColor } from '../../../helpers/surfaceColorDerivation';
import {
  normalizeAbstractEditorialHeroConfig,
  type AbstractEditorialHeroConfig,
  type AbstractEditorialHeroHorizontalPlacement,
  type AbstractEditorialHeroHorizontalPlacementLg,
  type AbstractEditorialHeroHorizontalPlacementWide,
} from './AbstractEditorialHero.config';
import { AbstractHeroCtaComposer } from './AbstractHeroCtaComposer';
import {
  normalizeAbstractHeroCtaComposerConfig,
  type AbstractHeroCtaComposerConfig,
} from './AbstractHeroCtaComposer/config/registered';
import styles from './AbstractEditorialHero.module.css';

function assignRef<T>(ref: Ref<T> | undefined, value: T | null) {
  if (typeof ref === 'function') ref(value);
  else if (ref) (ref as MutableRefObject<T | null>).current = value;
}

export type AbstractEditorialHeroInkTone = 'light' | 'dark';

type AbstractEditorialHeroProps = {
  /** The headline text — was a hardcoded module constant
   * (`ABSTRACT_EDITORIAL_HEADLINE`) until this component became a shared
   * primitive across pages (PLAN-EDITORIAL-HERO-UNIFICATION-AND-CARDSTACK-
   * RESIZE-FIX.md Part 2); each page now owns its own copy as a page-local
   * const, passed in here, the same way `pages/about.tsx`'s own narrative
   * paragraphs (`ABOUT_NARRATIVE_PARAGRAPHS`) are already page-owned
   * content rather than a shared default. */
  headline: string;
  /** Supporting paragraphs rendered below the headline, in order — `[]`
   * (default) renders none, for a headline-only presentation (e.g.
   * `/about`'s own narrow column). Both this and `headline` support the
   * site-wide `**word**` emphasis markup (`helpers/textEmphasis.tsx`)
   * unmodified — it operates on whatever string it's given. */
  paragraphs?: ReadonlyArray<string>;
  config: AbstractEditorialHeroConfig;
  /** Where the (readable-width-capped) copy column sits within the hero
   * row — a layout decision, not a component concern, so it's a required
   * top-level prop rather than a config field (moved off
   * AbstractEditorialHeroConfig — PLAN-POLYMORPHIC-LAYOUT-CONTENT-CONTAINER-
   * UNIFICATION.md). pages/abstract.tsx resolves both presentations from
   * Polymorphic Layout's narrow-column content alignment, keeping that
   * registered scope as the page's sole alignment owner. */
  horizontalPlacement: AbstractEditorialHeroHorizontalPlacement;
  horizontalPlacementWide?: AbstractEditorialHeroHorizontalPlacementWide;
  horizontalPlacementLg?: AbstractEditorialHeroHorizontalPlacementLg;
  ctaConfig?: CtaButtonConfig;
  heroCtaComposerConfig?: Partial<AbstractHeroCtaComposerConfig>;
  /** The shared page surface color (see components/PageSurface.config.ts) —
   * used as the headline's own color while headlineFillMode is 'surface'.
   * Defaults to PageSurface's own default so existing callers that don't
   * pass one keep today's look. */
  surfaceColor?: string;
  /** Only meaningful for a color field in 'column' colorMode — the split
   * column's own resolved background color this hero actually sits on
   * (e.g. pages/abstract.tsx's own already-computed
   * resolvedNarrowColumnColor), as opposed to surfaceColor above (the flat
   * page surface). Falls back to surfaceColor when omitted, so a page not
   * opting into 'column' mode needs no change. */
  columnBackgroundColor?: string;
  layoutMode: 'full' | 'editorial';
  copyInkTone: AbstractEditorialHeroInkTone;
  actionInkTone: AbstractEditorialHeroInkTone;
  gradientHeadlineActive?: boolean;
  gradientDebugCanvasRef?: RefObject<HTMLCanvasElement>;
  gradientDebugPanelOpen?: boolean;
  headlineCanvasRef?: RefObject<HTMLCanvasElement>;
  headlineRef?: RefObject<HTMLHeadingElement>;
};

export function AbstractEditorialHero({
  headline,
  paragraphs = [],
  config,
  horizontalPlacement,
  horizontalPlacementWide,
  horizontalPlacementLg,
  ctaConfig,
  heroCtaComposerConfig,
  surfaceColor = DEFAULT_PAGE_SURFACE_CONFIG.color,
  columnBackgroundColor,
  layoutMode,
  copyInkTone,
  actionInkTone,
  gradientHeadlineActive = false,
  gradientDebugCanvasRef,
  gradientDebugPanelOpen = false,
  headlineCanvasRef,
  headlineRef,
}: AbstractEditorialHeroProps) {
  const normalized = normalizeAbstractEditorialHeroConfig(config);
  const { globalTypographyConfig } = useSharedDesignConfig();
  const resolvedHeadlineFontFamily = normalized.headlineFontFamily === 'inherit'
    ? globalTypographyConfig.headingFontFamily
    : normalized.headlineFontFamily;
  // No site-wide "body font" exists in GlobalTypographyConfig to inherit
  // from (headline's own 'inherit' above follows headingFontFamily) —
  // 'inherit' here just resolves to 'sans', matching this component's own
  // unconditional default before this field existed.
  const resolvedParagraphFontFamily = normalized.paragraphFontFamily === 'inherit'
    ? 'sans'
    : normalized.paragraphFontFamily;
  // A flex item otherwise shrink-wraps to its content, which makes larger
  // max-width choices indistinguishable. Establish the available row width
  // first, then let the selected ceiling constrain it. The headline and
  // paragraph use the same grow-then-cap rule at their own level below.
  const contentWidthClassName = `w-full ${normalized.contentMaxWidth}`;
  // 'surface': the same one base color driving everything else on this hero
  // (surfaceColor, above) run through deriveSurfaceColor with this field's
  // own *SurfaceOffset — the CtaButtonConfig auto-color pattern, applied to
  // these three text roles instead of a button's background/border. 'column':
  // the same offset instead biases resolveContrastAwareTextColor's search
  // against columnBackgroundColor (falls back to surfaceColor when the page
  // hasn't opted in), gated by this field's own *MinContrast sibling. Kept
  // as three independent resolutions (not one shared derived value) since
  // each field's own mode/offset is independently configurable in the panel.
  const resolvedColumnBackgroundColor = columnBackgroundColor ?? surfaceColor;
  const resolvedCopyColor = normalized.copyColorMode === 'surface'
    ? deriveSurfaceColor(surfaceColor, normalized.copySurfaceOffset)
    : normalized.copyColorMode === 'column'
      ? resolveContrastAwareTextColor(
        resolvedColumnBackgroundColor, normalized.copyMinContrast, normalized.copySurfaceOffset,
      )
      : normalized.copyColor;
  const resolvedParagraphTextColor = normalized.paragraphTextColorMode === 'surface'
    ? deriveSurfaceColor(surfaceColor, normalized.paragraphSurfaceOffset)
    : normalized.paragraphTextColorMode === 'column'
      ? resolveContrastAwareTextColor(
        resolvedColumnBackgroundColor,
        normalized.paragraphMinContrast,
        normalized.paragraphSurfaceOffset,
      )
      : normalized.paragraphTextColor;
  const resolvedEyebrowColor = normalized.eyebrowColorMode === 'surface'
    ? deriveSurfaceColor(surfaceColor, normalized.eyebrowSurfaceOffset)
    : normalized.eyebrowColorMode === 'column'
      ? resolveContrastAwareTextColor(
        resolvedColumnBackgroundColor, normalized.eyebrowMinContrast, normalized.eyebrowSurfaceOffset,
      )
      : normalized.eyebrowColor;

  // Reuses the CTA button's own elevation-shadow engine and tuning verbatim
  // (see the headlineFillMode/headlineShadowEnabled/
  // headlineShadowElevatedEnabled docs on AbstractEditorialHeroConfig) — the
  // headline shares whatever shadow* values ctaConfig carries rather than
  // duplicating a parallel set of shadow-tuning knobs for a second element.
  const normalizedCta = useMemo(() => normalizeCtaButtonConfig(ctaConfig), [ctaConfig]);
  const normalizedHeroCtaComposer = useMemo(
    () => normalizeAbstractHeroCtaComposerConfig(heroCtaComposerConfig),
    [heroCtaComposerConfig],
  );
  // The drop-shadow is what makes surface-fill's color-matched text visible
  // at all — it doesn't apply in 'solid' mode, which is already legible by
  // plain contrast and doesn't want a shadow's physical-depth implication.
  const headlineShadowActive = normalized.headlineFillMode === 'surface' &&
    normalized.headlineShadowEnabled;
  const headlineShadowOptions = useMemo(() => ({
    enabled: headlineShadowActive,
    // The headline is text, not a solid shape — box-shadow (CtaButton's
    // default) would draw a rectangle following the h1's bounding box
    // instead of the glyph outlines. 'dropShadow' hugs the actual rendered
    // letterforms via CSS filter: drop-shadow() instead.
    outputMode: 'dropShadow' as const,
    elevationMinPx: normalizedCta.shadowElevationMinPx,
    elevationMaxPx: normalizedCta.shadowElevationMaxPx,
    light: {
      xPercent: normalizedCta.shadowLightXPercent,
      yPx: normalizedCta.shadowLightYPx,
      heightPx: normalizedCta.shadowLightHeightPx,
      // radiusPx (the light's own apparent size) is what actually drives
      // penumbra/blur — maxBlurPx below is only a safety ceiling, rarely
      // the binding constraint at the CTA's own tuning. Scaling radiusPx
      // is what makes headlineShadowScale genuinely shrink the blur.
      radiusPx: normalizedCta.shadowLightRadiusPx * normalized.headlineShadowScale,
      directIntensity: normalizedCta.shadowLightDirectIntensity,
      ambientIntensity: normalizedCta.shadowLightAmbientIntensity,
    },
    response: {
      projectedStrength: normalizedCta.shadowProjectedStrength,
      projectedFalloff: normalizedCta.shadowProjectedFalloff,
      contactStrength: normalizedCta.shadowContactStrength,
      contactFalloff: normalizedCta.shadowContactFalloff,
      contactDecayElevationPx: normalizedCta.shadowContactDecayElevationPx,
      nearFieldStrength: normalizedCta.shadowNearFieldStrength,
      // Blur/displacement are the only values scaled down from the CTA's own
      // — see headlineShadowScale's docs on AbstractEditorialHeroConfig.
      // Everything else (light position, color, elevation) stays exactly
      // the CTA's. maxBlurPx stays scaled too, as a proportional ceiling.
      maxBlurPx: normalizedCta.shadowMaxBlurPx * normalized.headlineShadowScale,
      maxDisplacementPx: normalizedCta.shadowMaxDisplacementPx * normalized.headlineShadowScale,
      maxProjectedScale: normalizedCta.shadowMaxProjectedScale,
      color: normalizedCta.shadowColor,
    },
  }), [
    headlineShadowActive,
    normalized.headlineShadowScale,
    normalizedCta.shadowElevationMinPx,
    normalizedCta.shadowElevationMaxPx,
    normalizedCta.shadowLightXPercent,
    normalizedCta.shadowLightYPx,
    normalizedCta.shadowLightHeightPx,
    normalizedCta.shadowLightRadiusPx,
    normalizedCta.shadowLightDirectIntensity,
    normalizedCta.shadowLightAmbientIntensity,
    normalizedCta.shadowProjectedStrength,
    normalizedCta.shadowProjectedFalloff,
    normalizedCta.shadowContactStrength,
    normalizedCta.shadowContactFalloff,
    normalizedCta.shadowContactDecayElevationPx,
    normalizedCta.shadowNearFieldStrength,
    normalizedCta.shadowMaxBlurPx,
    normalizedCta.shadowMaxDisplacementPx,
    normalizedCta.shadowMaxProjectedScale,
    normalizedCta.shadowColor,
  ]);
  const { applyElevation: applyHeadlineElevation, ref: headlineShadowRef } =
    useElevationShadow<HTMLHeadingElement>(headlineShadowOptions);

  const setHeadlineElementRef = useCallback((element: HTMLHeadingElement | null) => {
    assignRef(headlineRef, element);
    headlineShadowRef(element);
  }, [headlineRef, headlineShadowRef]);

  // A static heading has no pointer-driven hover state — resolve once
  // (mount) and whenever the elevated toggle or any of the engine's own
  // config changes, rather than on every interaction frame. Depending on
  // headlineShadowOptions itself (not just the elevation-target-relevant
  // subset of it) matters: applyElevation only *re-reads* whatever's
  // currently in the hook's options ref, it doesn't get re-invoked on its
  // own just because that ref's contents changed — something has to call
  // it again. A prior version only listed the elevation-target deps here,
  // so changing e.g. headlineShadowScale updated the memoized options but
  // nothing ever re-applied them.
  useEffect(() => {
    if (!headlineShadowActive) return;
    const targetElevationPx = normalized.headlineShadowElevatedEnabled
      ? normalizedCta.shadowElevationHoverPx
      : normalizedCta.shadowElevationRestingPx;
    applyHeadlineElevation(targetElevationPx);
  }, [
    applyHeadlineElevation,
    headlineShadowOptions,
    headlineShadowActive,
    normalized.headlineShadowElevatedEnabled,
    normalizedCta.shadowElevationHoverPx,
    normalizedCta.shadowElevationRestingPx,
  ]);

  const style = {
    '--editorial-copy-color': resolvedCopyColor,
    '--editorial-paragraph-color': resolvedParagraphTextColor,
    '--editorial-eyebrow-color': resolvedEyebrowColor,
    '--editorial-copy-line-height': normalized.copyLineHeight,
    '--editorial-copy-letter-spacing': `${normalized.copyLetterSpacingEm}em`,
    '--editorial-gradient-debug-size': `${normalized.headlineGradientDebugSizePx}px`,
    '--editorial-headline-surface-color': surfaceColor,
    // var(--hero-sans) would be preferable (it carries /abstract's own
    // fallback chain) but .root doesn't actually sit inside .heroZone (the
    // only place --hero-sans is defined) — a set-but-unresolvable var()
    // reference invalidates the whole font-family declaration rather than
    // falling through, so this must resolve to something always defined.
    // --site-font-sans (set app-wide in pages/_app.tsx) always is.
    '--active-heading-font': resolvedHeadlineFontFamily === 'serif'
      ? 'var(--site-font-serif)'
      : 'var(--site-font-sans)',
    // Same reasoning as --active-heading-font above — always resolves to a
    // defined var so the whole font-family declaration on .root (consumed
    // by .copyBlock/.supportingCopy/the eyebrow via inheritance) can't be
    // invalidated by an unresolvable reference.
    '--active-body-font': resolvedParagraphFontFamily === 'serif'
      ? 'var(--site-font-serif)'
      : 'var(--site-font-sans)',
  } as CSSProperties;

  return (
    <div
      className={[
        styles.root,
        // This component deliberately owns no outer padding, margin,
        // max-width, vertical alignment, or optical translation. On the
        // split-column presentation those are all supplied by the enclosing
        // Polymorphic Layout content box. Keeping only a full-width row here
        // gives that owner a target without creating a second layout layer.
        'pointer-events-none relative z-[5] flex w-full min-h-0 min-w-0',
        horizontalPlacement,
        horizontalPlacementWide,
        horizontalPlacementLg,
      ].join(' ')}
      data-editorial-hero-root="true"
      data-action-ink-tone={actionInkTone}
      data-content-surface={gradientHeadlineActive ? 'light' : 'field'}
      data-copy-ink-tone={copyInkTone}
      data-designer-panel-open={gradientDebugPanelOpen ? 'true' : 'false'}
      data-layout-mode={layoutMode}
      style={style}
    >
      {/* The column fills its available row before contentMaxWidth caps it.
          This is essential: a shrink-wrapped flex item cannot reveal a
          selected cap larger than its intrinsic text width. Once capped,
          horizontalPlacement still positions the resulting column within
          any remaining row space. Headline and paragraph caps are applied
          independently to their own full-width boxes below. */}
      {/* Text-align is owned by PolymorphicLayout's own narrowColumnTextAlign/
          Wide/Lg (2026-08-20 — this component no longer carries its own
          competing textAlignment field, which won every time by sitting
          closer to this text than PolymorphicLayout's own content box). */}
      <div className={`${styles.copyColumn} pointer-events-auto relative min-w-0 ${contentWidthClassName}`}>
        <div className="min-w-0">
          <h1
            ref={setHeadlineElementRef}
            aria-label={headline}
            id="abstract-hero-title"
            className={`${styles.leadBlock} ${
              normalized.headlineMatchesBodySize
                ? normalized.bodyFontSizeNarrow
                : normalized.headlineFontSizeNarrow
            } ${
              normalized.headlineMatchesBodySize
                ? normalized.bodyFontSizeMid
                : normalized.headlineFontSizeMid
            } ${
              normalized.headlineMatchesBodySize
                ? normalized.bodyFontSizeWide
                : normalized.headlineFontSizeWide
            } ${normalized.headlineMatchesBodySize ? 'font-bold' : ''} relative m-0 p-0 w-full ${normalized.headlineMaxWidth}`}
            data-headline-fill={normalized.headlineFillMode}
            data-headline-match-body-size={normalized.headlineMatchesBodySize ? 'true' : 'false'}
          >
            {gradientHeadlineActive ? (
              <>
                <span aria-hidden="true" className={`${styles.headlineText} block`}>
                  <span data-gradient-headline-text="true">
                    {headline}
                  </span>
                </span>
                <canvas
                  ref={headlineCanvasRef}
                  aria-hidden="true"
                  className={styles.headlineCanvas}
                  data-gradient-headline-canvas="true"
                />
              </>
            ) : headline}
          </h1>
          {paragraphs.length > 0 ? (
            <div
              className={`${styles.supportingCopy} ${normalized.bodyFontSizeNarrow} ${normalized.bodyFontSizeMid} ${normalized.bodyFontSizeWide} ${normalized.leadGap} ${normalized.leadGapWide} ${normalized.leadGapLg} grid gap-[28px] w-full ${normalized.paragraphMaxWidth}`}
              data-editorial-supporting-copy="true"
            >
              {paragraphs.map((paragraph, index) => (
                <p key={index} className={`${styles.copyBlock} m-0 p-0`}>
                  {renderEmphasisText(
                    paragraph,
                    normalized.emphasisDimOpacity,
                    normalized.emphasisWordOpacity,
                    normalized.emphasisFontWeight,
                  )}
                </p>
              ))}
            </div>
          ) : null}
        </div>
        {normalized.composerVisible ? (
          <div
            className={`${styles.ctaMotionStage} pointer-events-none -mb-16 mt-[calc(56px_-_4rem)] overflow-visible py-16`}
            data-cta-motion-stage="true"
          >
            <AbstractHeroCtaComposer
              className="pointer-events-auto mb-0 mt-12 [font:inherit]"
              config={normalizedHeroCtaComposer}
              ctaButtonConfig={normalizedCta}
              // A panel edit to normalizedHeroCtaComposer only ever changes
              // config values — it doesn't, on its own, replay the composer's
              // one-shot mount effects (the intro-phase timer, the elevation
              // tween), which is exactly what you need to see while tuning
              // them. Keying on the config itself forces React to unmount +
              // remount the whole subtree on every edit, replaying those
              // effects fresh with the new values. Scoped to this composer's
              // own config only (not ctaButtonConfig/surfaceColor, which have
              // their own separate panels) — cheap either way, this object is
              // a dozen small fields.
              key={JSON.stringify(normalizedHeroCtaComposer)}
              surfaceColor={surfaceColor}
            />
          </div>
        ) : null}
      </div>
      {gradientHeadlineActive && normalized.headlineGradientDebugEnabled ? (
        <div
          aria-hidden="true"
          className={styles.gradientDebugPreview}
          data-gradient-headline-debug="true"
        >
          <canvas
            ref={gradientDebugCanvasRef}
            className={styles.gradientDebugCanvas}
            data-gradient-headline-debug-canvas="true"
          />
        </div>
      ) : null}
    </div>
  );
}
