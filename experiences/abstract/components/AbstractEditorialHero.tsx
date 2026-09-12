'use client';

import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import type { CSSProperties, MutableRefObject, Ref, RefObject } from 'react';
import { normalizeCtaButtonConfig, type CtaButtonConfig } from '../../../components/CtaButton/config/registered';
import { DEFAULT_PAGE_SURFACE_CONFIG } from '../../../components/PageSurface.config';
import { useElevationShadow } from '../../../components/proximity/useElevationShadow';
import { useSharedDesignConfig } from '../../../components/SharedDesignConfigProvider';
import { renderEmphasisText } from '../../../helpers/textEmphasis';
import { deriveSurfaceColor, resolveContrastAwareTextColor } from '../../../helpers/surfaceColorDerivation';
import type { SvgStop } from '../../../helpers/gradientMath';
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

// See paragraphGradientScrollLightenEnabled's own doc comment
// (AbstractEditorialHero.config.ts) for the full mechanism this CSS custom
// property drives.
const PARAGRAPH_GRADIENT_LIGHTEN_PROGRESS_VAR = '--paragraph-gradient-lighten-progress';

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
  /** PLAN-ABSTRACT-TYPOGRAPHY-COLOR-UNIFICATION.md Part C — when supplied,
   * used verbatim as the headline's own color (bypassing copyColorMode
   * entirely) and as the emphasis-word/link color (bypassing
   * emphasisWordOpacity's own tint, though not its opacity — see
   * renderEmphasisText's own doc comment). Additive and page-scoped, same
   * contract as SiteHeader's own titleColorOverride: this component's
   * existing copyColorMode/emphasisFontWeight fields stay fully independent
   * and untouched for every caller that doesn't supply this. */
  titleColorOverride?: string;
  /** Same contract as titleColorOverride above, for the paragraph's own
   * color (bypasses paragraphTextColorMode). */
  bodyColorOverride?: string;
  /** Same contract as titleColorOverride above, for **word**-marked
   * emphasis runs and inline links (bypasses emphasisWordOpacity's implicit
   * "same color as body, just less dim" — this is a genuinely distinct
   * color, not an opacity step on resolvedParagraphTextColor). */
  highlightColorOverride?: string;
  /** Bypasses emphasisDimOpacity for the paragraph's own non-emphasis text —
   * paired with bodyColorOverride above (GlobalTypographyConfig's own
   * bodyOpacity), since this component already applies color and opacity as
   * two separate style properties (renderEmphasisText's own dimOpacity
   * param), not one alpha-blended color. */
  bodyOpacityOverride?: number;
  /** Same contract as bodyOpacityOverride above, for emphasis words/links
   * (bypasses emphasisWordOpacity). */
  highlightOpacityOverride?: number;
  /** Same contract as bodyOpacityOverride above, for the headline — applied
   * as this element's own CSS `opacity` (the headline has no existing
   * opacity mechanism of its own to bypass, unlike bodyOpacityOverride/
   * emphasisDimOpacity above; it previously always rendered fully opaque
   * regardless of titleColorOverride). Without this, a caller resolving
   * titleColorOverride against a diluted target opacity (GlobalTypography-
   * Config's own titleOpacity — see resolveTypographyColors' own doc
   * comment) gets a color calibrated to survive a dilution that then never
   * actually happens: the resolver searches for an ever-darker/lighter ink
   * as its target opacity falls, on the assumption the caller will render it
   * at that same reduced opacity, same as body/highlight already do. */
  titleOpacityOverride?: number;
  /** Only meaningful while config.paragraphUsesWordmarkGradient is true —
   * PolymorphicLayout.tsx's own usePolymorphicLayoutColors() output
   * (colors.wordmarkGradientStops), passed straight through so this
   * component can render the exact same gradient (not a re-derived
   * approximation) across the ENTIRE paragraph — base copy, emphasis/link
   * runs, and the inline headline span alike, as one continuous fill.
   * undefined for every caller not opting in (about.tsx, contact.tsx,
   * posts/[slug].tsx) — byte-identical to before this prop existed. See
   * PLAN-WORDMARK-SCROLL-GRADIENT-INTEGRATION.md. */
  wordmarkGradientStops?: ReadonlyArray<SvgStop>;
  /** Only meaningful while config.paragraphGradientScrollLightenEnabled is
   * true — PolymorphicLayoutResolvedColors.scrollGradientResolved's own
   * viewportRangeVh/tauMs (the exact same values
   * <PolymorphicScrollGradientBackground> itself uses to time/ease its
   * darken overlay), passed straight through so this component's own
   * scroll-driven gradient-lighten effect tracks that curve exactly instead
   * of animating on an independent timer. undefined for every caller not
   * opting in. See paragraphGradientScrollLightenEnabled's own doc comment
   * (AbstractEditorialHero.config.ts). */
  scrollGradientDarkenViewportRangeVh?: number;
  scrollGradientDarkenTauMs?: number;
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
  titleColorOverride,
  bodyColorOverride,
  highlightColorOverride,
  bodyOpacityOverride,
  highlightOpacityOverride,
  titleOpacityOverride,
  layoutMode,
  copyInkTone,
  actionInkTone,
  gradientHeadlineActive = false,
  gradientDebugCanvasRef,
  gradientDebugPanelOpen = false,
  headlineCanvasRef,
  headlineRef,
  wordmarkGradientStops,
  scrollGradientDarkenViewportRangeVh,
  scrollGradientDarkenTauMs,
}: AbstractEditorialHeroProps) {
  const normalized = normalizeAbstractEditorialHeroConfig(config);
  // CSS background value built from the exact same stops the wordmark's own
  // SVG gradient uses (not a re-generation) — see
  // paragraphUsesWordmarkGradient's own doc comment
  // (AbstractEditorialHero.config.ts). undefined whenever the opt-in is off
  // or the page hasn't supplied stops (scroll-gradient background inactive
  // at the current tier), so every existing caller/state renders exactly as
  // before. Applied once, at each paragraph's own <p> root — never per-run
  // — so it reads as one continuous fill across the whole paragraph
  // (base copy, emphasis/link runs, and the inline headline span alike),
  // not a separate, independently-remapped 0-100% gradient inside each
  // individual run's own narrow bounding box.
  // paragraphGradientScrollLightenEnabled: whether to build each stop as a
  // CSS color-mix() toward white, driven by --paragraph-gradient-lighten-
  // progress (a single live custom property this component updates via rAF
  // below, mirroring PolymorphicScrollGradientBackground's own darken-
  // overlay technique — never React state, so scrolling never re-renders
  // this component). The mix amount at any instant is entirely the
  // browser's job at paint time; this memo only needs to rebuild when the
  // STOPS or the config's own max-amount ceiling change, not on every
  // scroll frame. See paragraphGradientScrollLightenEnabled's own doc
  // comment (AbstractEditorialHero.config.ts).
  const scrollLightenActive = normalized.paragraphUsesWordmarkGradient
    && normalized.paragraphGradientScrollLightenEnabled
    && scrollGradientDarkenViewportRangeVh !== undefined
    && scrollGradientDarkenTauMs !== undefined;
  const wordmarkGradientCss = useMemo(() => {
    if (!wordmarkGradientStops?.length) return undefined;
    if (!scrollLightenActive) {
      return `linear-gradient(90deg, ${wordmarkGradientStops.map(stop => `${stop.color} ${stop.at}%`).join(', ')})`;
    }
    const maxAmountPercent = normalized.paragraphGradientScrollLightenMaxAmount * 100;
    return `linear-gradient(90deg, ${wordmarkGradientStops.map(stop => {
      const whiteMix = `calc(var(${PARAGRAPH_GRADIENT_LIGHTEN_PROGRESS_VAR}, 0) * ${maxAmountPercent}%)`;
      return `color-mix(in srgb, ${stop.color} calc(100% - ${whiteMix}), white ${whiteMix}) ${stop.at}%`;
    }).join(', ')})`;
  }, [wordmarkGradientStops, scrollLightenActive, normalized.paragraphGradientScrollLightenMaxAmount]);
  const supportingCopyRef = useRef<HTMLDivElement | null>(null);
  // Ported from PolymorphicScrollGradientBackground.tsx's own rAF-smoothed
  // scroll effect (same tau-based easing, same viewport-range math) — kept
  // as an independent computation here rather than plumbed shared mutable
  // state across that unrelated fixed-position component, same architecture
  // precedent as this file's own wordmarkGradientStops recipe (fully
  // independent from the background's own resolved values at runtime).
  // Progress (0-1, NOT pre-multiplied by any darken ceiling) is written to
  // supportingCopyRef's own CSS custom property, which every descendant
  // <p>'s color-mix() background above reads live at paint time — no React
  // re-render, no per-frame JS color math.
  useEffect(() => {
    if (!scrollLightenActive) return undefined;
    const el = supportingCopyRef.current;
    if (!el || scrollGradientDarkenViewportRangeVh === undefined || scrollGradientDarkenTauMs === undefined) {
      return undefined;
    }

    const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
    const alphaFromTau = (dtMs: number, tau: number) => 1 - Math.exp(-dtMs / Math.max(1, tau));

    const targetRef = { current: 0 };
    const smoothRef = { current: 0 };
    const rafRef = { current: null as number | null };
    const lastTsRef = { current: 0 };

    const writeProgress = (value: number) => {
      el.style.setProperty(PARAGRAPH_GRADIENT_LIGHTEN_PROGRESS_VAR, clamp01(value).toFixed(3));
    };

    const computeTarget = () => {
      const viewport = window.innerHeight || 1;
      const rawProgress = window.scrollY / (viewport * scrollGradientDarkenViewportRangeVh);
      targetRef.current = clamp01(rawProgress);
    };

    const tick = (ts: number) => {
      const lastTs = lastTsRef.current || ts;
      lastTsRef.current = ts;
      rafRef.current = null;

      const dt = Math.max(0, ts - lastTs);
      const alpha = alphaFromTau(dt, scrollGradientDarkenTauMs);
      const target = targetRef.current;
      const current = smoothRef.current + (target - smoothRef.current) * alpha;
      smoothRef.current = current;

      writeProgress(current);

      if (Math.abs(target - current) >= 0.001) {
        rafRef.current = window.requestAnimationFrame(tick);
      }
    };

    const schedule = () => {
      if (rafRef.current !== null) return;
      rafRef.current = window.requestAnimationFrame(tick);
    };

    const onScroll = () => {
      computeTarget();
      schedule();
    };
    const onResize = () => {
      computeTarget();
      schedule();
    };

    writeProgress(0);
    computeTarget();
    schedule();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);

    return () => {
      if (rafRef.current !== null) window.cancelAnimationFrame(rafRef.current);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
    };
  }, [scrollLightenActive, scrollGradientDarkenViewportRangeVh, scrollGradientDarkenTauMs]);
  // 'clip' (background-clip:text) wins if both happen to be true — see
  // paragraphUsesWordmarkGradientBlend's own doc comment
  // (AbstractEditorialHero.config.ts).
  const paragraphGradientClipActive = normalized.paragraphUsesWordmarkGradient && !!wordmarkGradientCss;
  const paragraphGradientBlendActive = !paragraphGradientClipActive
    && normalized.paragraphUsesWordmarkGradientBlend
    && !!wordmarkGradientCss;
  const wordmarkGradientTextStyle: CSSProperties | undefined = paragraphGradientClipActive ? {
    background: wordmarkGradientCss,
    backgroundClip: 'text',
    WebkitBackgroundClip: 'text',
    color: 'transparent',
    WebkitTextFillColor: 'transparent',
  } : undefined;
  // Blend mode (PLAN-PARAGRAPH-BLEND-MODE-COLOR.md, Option A — "ambient
  // blend"): the paragraph's own opacity/font-weight distinctions (dim vs.
  // emphasis vs. headline) are left COMPLETELY normal — only the base COLOR
  // is overridden (paragraphGradientBlendColor, applied here so every
  // descendant inherits it via ordinary CSS color inheritance, same
  // mechanism 'clip' mode already relies on for its own transparent color).
  // `mix-blend-mode` is added alongside it, deliberately WITHOUT any local
  // backdrop layer or `isolation: isolate` — this hero's own ancestor chain
  // (.root/.copyColumn/.supportingCopy, AbstractEditorialHero.module.css)
  // carries no opaque background-color of its own, so the real page
  // background already visible behind the hero (the scroll-gradient, when
  // active) is what the text blends against. Option B ("local gradient
  // blend": a same-sized backdrop div painted behind the paragraph,
  // isolated to its own stacking context) was tried and reverted — that
  // backdrop div painted as a visible, opaque-looking rectangle wherever
  // the paragraph sat, not just under the glyphs (confirmed live via
  // screenshot) — `mix-blend-mode` only changes how an element's own
  // content composites, it does not clip/mask a sibling's background to
  // the text's own shape, so a same-sized backdrop is always visible in
  // the gaps between/around glyphs regardless of blend mode. Ambient mode
  // has no such layer to leak through: the "backdrop" is simply whatever
  // was already rendering on the page, so there is nothing new to see
  // outside the text itself.
  const paragraphBlendStyle: CSSProperties | undefined = paragraphGradientBlendActive ? {
    mixBlendMode: normalized.paragraphGradientBlendMode,
    color: normalized.paragraphGradientBlendColor,
  } : undefined;
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
  const resolvedCopyColor = titleColorOverride ?? (normalized.copyColorMode === 'surface'
    ? deriveSurfaceColor(surfaceColor, normalized.copySurfaceOffset)
    : normalized.copyColorMode === 'column'
      ? resolveContrastAwareTextColor(
        resolvedColumnBackgroundColor, normalized.copyMinContrast, normalized.copySurfaceOffset,
      )
      : normalized.copyColor);
  const resolvedParagraphTextColor = bodyColorOverride ?? (normalized.paragraphTextColorMode === 'surface'
    ? deriveSurfaceColor(surfaceColor, normalized.paragraphSurfaceOffset)
    : normalized.paragraphTextColorMode === 'column'
      ? resolveContrastAwareTextColor(
        resolvedColumnBackgroundColor,
        normalized.paragraphMinContrast,
        normalized.paragraphSurfaceOffset,
      )
      : normalized.paragraphTextColor);
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

  // Shared between the standalone-<h1> layout (default) and the inline-with-
  // first-paragraph layout below — same size/weight classes and same
  // gradient-vs-plain content, just a different wrapping element/position.
  const headlineSizeClassName = `${
    normalized.headlineMatchesBodySize ? normalized.bodyFontSizeNarrow : normalized.headlineFontSizeNarrow
  } ${
    normalized.headlineMatchesBodySize ? normalized.bodyFontSizeMid : normalized.headlineFontSizeMid
  } ${
    normalized.headlineMatchesBodySize ? normalized.bodyFontSizeWide : normalized.headlineFontSizeWide
  } ${normalized.headlineFontWeight}`;
  // Opt-in (AbstractEditorialHeroConfig.headlineInlineWithParagraph's own
  // doc comment) — independent of headlineMatchesBodySize (that field only
  // controls the merged headline's own font-size/weight, matching the h1
  // path below), gated only on there being a first paragraph to merge into.
  const inlineHeadlineActive = normalized.headlineInlineWithParagraph
    && paragraphs.length > 0;
  const headlineContent = gradientHeadlineActive ? (
    <>
      {/* `block` (below) is what the standalone-<h1> layout needs: the
          canvas overlay is a sibling of this span, absolutely positioned via
          the outer h1/span's own `relative`, so it doesn't strictly require
          this specific span to be block — but the h1 already is anyway, so
          it was harmless there. It's NOT harmless once this same content
          renders inside the inline role="heading" span (inlineHeadlineActive
          below): a `block` span inside an otherwise-inline flow forces its
          own line regardless of surrounding text, permanently defeating the
          "merge into the paragraph's own text run" this whole path exists
          for — confirmed live (computed style showed the inline span's color
          and font-size already matched the paragraph byte-for-byte; only the
          layout still broke onto its own line, traced to this exact class). */}
      <span aria-hidden="true" className={`${styles.headlineText} ${inlineHeadlineActive ? '' : 'block'}`}>
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
  ) : headline;

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
          {inlineHeadlineActive ? null : (
            <h1
              ref={setHeadlineElementRef}
              aria-label={headline}
              id="abstract-hero-title"
              className={`${styles.leadBlock} ${headlineSizeClassName} relative m-0 p-0 w-full ${normalized.headlineMaxWidth}`}
              data-headline-fill={normalized.headlineFillMode}
              data-headline-match-body-size={normalized.headlineMatchesBodySize ? 'true' : 'false'}
              style={{ opacity: titleOpacityOverride }}
            >
              {headlineContent}
            </h1>
          )}
          {paragraphs.length > 0 ? (
            <div
              ref={supportingCopyRef}
              className={`${styles.supportingCopy} ${normalized.bodyFontSizeNarrow} ${normalized.bodyFontSizeMid} ${normalized.bodyFontSizeWide} ${normalized.leadGap} ${normalized.leadGapWide} ${normalized.leadGapLg} grid gap-[28px] w-full ${normalized.paragraphMaxWidth}`}
              data-editorial-supporting-copy="true"
            >
              {paragraphs.map((paragraph, index) => (
                <p
                  key={index}
                  className={`${styles.copyBlock} m-0 p-0`}
                  // wordmarkGradientTextStyle applied once here, at the whole
                  // paragraph's own root — not per-run — so the gradient
                  // renders as one continuous fill across every run inside
                  // (base copy, emphasis/link runs, and the inline headline
                  // span below all inherit color/-webkit-text-fill-color
                  // from this element rather than each independently
                  // re-mapping the gradient's own 0-100% stops onto its own
                  // narrow bounding box). undefined (this component's normal
                  // behavior) whenever the opt-in is off. paragraphBlendStyle
                  // (mutually exclusive with wordmarkGradientTextStyle — see
                  // paragraphGradientBlendActive's own computation) instead
                  // only adds mix-blend-mode, blending this element's own
                  // (still fully normal) rendered content against whatever
                  // is already visually behind it on the page — leaving
                  // every other style/branch below at its ordinary,
                  // non-gradient behavior.
                  style={wordmarkGradientTextStyle ?? paragraphBlendStyle}
                >
                  {inlineHeadlineActive && index === 0 ? (
                    <>
                      {/* role="heading"/aria-level, not a nested <h1> — a
                          heading element isn't valid phrasing content inside
                          a <p>, so this keeps the same level-1 heading
                          semantics screen readers rely on (still targeted by
                          this page's own aria-labelledby="abstract-hero-title")
                          without invalid markup. */}
                      <span
                        ref={setHeadlineElementRef}
                        role="heading"
                        aria-level={1}
                        aria-label={headline}
                        id="abstract-hero-title"
                        // 'relative' only exists to give .headlineCanvas
                        // (the OTHER, canvas-based gradient system) a
                        // positioned ancestor for its own absolute
                        // positioning — irrelevant while
                        // wordmarkGradientTextStyle is active, since that
                        // path renders plain `headline` text instead of
                        // headlineContent's canvas markup (see the doc
                        // comment further down). Omitted specifically in
                        // that case because it's also the confirmed root
                        // cause of a real WebKit rendering bug: `position:
                        // relative` on this exact element made its
                        // (correctly computed, per getComputedStyle)
                        // gradient-clipped text paint fully blank on real
                        // iOS hardware — bisected live via Playwright's
                        // WebKit engine (which reproduces the same bug the
                        // Simulator does not) by removing one class at a
                        // time; removing only `relative` fixed the paint,
                        // confirmed by re-adding every other class. Every
                        // other usage of `relative` in this component
                        // (the standalone <h1> path, canvas positioning
                        // elsewhere) is untouched — this is scoped to only
                        // this one element, only in this one mode.
                        className={wordmarkGradientTextStyle
                          ? `${styles.leadBlock} ${headlineSizeClassName}`
                          : `${styles.leadBlock} ${headlineSizeClassName} relative`}
                        // AbstractEditorialHero.module.css's own
                        // [data-headline-fill="solid"/"surface"] rules set a
                        // flat `color` directly on this element (not merely a
                        // fallback for inherited color) — by design, for the
                        // OTHER (twilight-sky canvas) gradient system, whose
                        // own doc comment says solid/surface must "reliably
                        // show a flat color regardless of whatever gradient
                        // mode is active." That would silently override our
                        // wordmarkGradientTextStyle inheritance from the
                        // ancestor <p> the moment this attribute is present —
                        // omitted (not merely a different value) whenever our
                        // gradient is active, so neither stylesheet rule
                        // matches and this span's `color`/`-webkit-text-fill-
                        // color` stay genuinely inherited from the <p> above.
                        data-headline-fill={(wordmarkGradientTextStyle || paragraphBlendStyle)
                          ? undefined
                          : normalized.headlineFillMode}
                        data-headline-match-body-size={normalized.headlineMatchesBodySize ? 'true' : 'false'}
                        data-headline-inline="true"
                        // .supportingCopy (this span's own ancestor once
                        // inline) sets an explicit `color` for the paragraph
                        // copy — CSS inheritance would otherwise hand that
                        // same color to this span too, silently discarding
                        // resolvedCopyColor/titleColorOverride the moment the
                        // headline stops living outside .supportingCopy (the
                        // standalone <h1> path above never hits this, so it
                        // only ever surfaced here). An explicit color here
                        // wins regardless of DOM position — EXCEPT while
                        // wordmarkGradientTextStyle is active on the <p>
                        // above, where omitting color/fill entirely here (as
                        // below) lets this span inherit the ancestor's own
                        // transparent+gradient-clip fill instead, keeping the
                        // whole paragraph (headline included) one continuous
                        // gradient rather than a second, separately-mapped
                        // one. Opacity is handled differently here: any CSS
                        // opacity below 1 establishes a new stacking context,
                        // which real iOS hardware (unlike the Simulator's
                        // software rendering path — confirmed live: renders
                        // correctly in Simulator/desktop, fully invisible on
                        // a real iPhone in both Safari and Chrome, which is
                        // WebKit there too) promotes into its own GPU
                        // compositing layer. That layer paints only its OWN
                        // box's background (none), not the ancestor <p>'s
                        // clipped gradient bleeding through — so applying
                        // titleOpacityOverride here (if it happens to be
                        // below 1) would blank this element out on real
                        // devices while looking correct everywhere else.
                        // Omitted entirely (not merely set to 1 — omitting
                        // avoids the property existing at all) whenever the
                        // gradient is active.
                        style={wordmarkGradientTextStyle ? undefined : paragraphBlendStyle ? {
                          // color omitted — inherits paragraphGradientBlendColor
                          // from the ancestor <p>'s own paragraphBlendStyle,
                          // same reasoning as the clip-mode branch above (this
                          // element must not set its own color, or the
                          // deliberate ancestor override never reaches it).
                          opacity: titleOpacityOverride,
                        } : {
                          color: resolvedCopyColor,
                          opacity: titleOpacityOverride,
                        }}
                      >
                        {/* headlineContent (gradientHeadlineActive branch) is
                            the OTHER, older gradient system — a <canvas> the
                            legacy compositor (helpers/abstractLegacyHeadline-
                            Compositor.ts) paints a separate twilight-sky
                            gradient onto, imperatively marking this element
                            data-gradient-ready="true" once drawn, which also
                            unconditionally forces color:transparent on the
                            nested .headlineText span
                            (AbstractEditorialHero.module.css) so the canvas
                            shows through instead. That's a second,
                            independent transparent-text layer stacked on top
                            of our own wordmarkGradientTextStyle inheritance —
                            confirmed live: if the canvas's own draw ever
                            lags/fails to produce visible pixels before paint
                            (a real risk on slower real hardware, unlike the
                            Simulator), the result is two competing
                            transparent-text mechanisms and fully blank text,
                            not a graceful fallback to either gradient alone.
                            Plain `headline` text bypasses that system
                            entirely, applying our own gradient exactly the
                            same, uncontested way the rest of this paragraph
                            already renders. */}
                        {wordmarkGradientTextStyle ? headline : headlineContent}
                      </span>
                      {' '}
                    </>
                  ) : null}
                  {(() => {
                    const resolvedDimOpacity = bodyOpacityOverride ?? normalized.emphasisDimOpacity;
                    const resolvedHighlightOpacity = normalized.emphasisHighlightEnabled
                      ? (highlightOpacityOverride ?? normalized.emphasisWordOpacity)
                      : resolvedDimOpacity;
                    // Opt-out path (AbstractEditorialHeroConfig.emphasisHighlightEnabled's
                    // own doc comment): pass the same opacity for both roles and
                    // omit className/color override, so **word**/[text](href)
                    // runs render identically to plain body text — never
                    // touches the headline, which doesn't route through
                    // renderEmphasisText at all. highlightColorOverride is
                    // also suppressed whenever wordmarkGradientTextStyle is
                    // active, for the same reason as the headline span above
                    // — an explicit per-run color would defeat the ancestor
                    // <p>'s own inherited gradient fill. Both opacities are
                    // forced to 1 while the gradient is active — see the
                    // headline span's own doc comment above (same paragraph
                    // root) for why: emphasisDimOpacity/emphasisWordOpacity
                    // default to 0.5/0.88, both below 1, so every run this
                    // produces would otherwise get its own real CSS stacking
                    // context and be promoted to a separate GPU compositing
                    // layer on real iOS hardware, losing the ancestor <p>'s
                    // clipped gradient paint entirely (confirmed live: this
                    // is what made the ENTIRE paragraph — not just the dim
                    // text — render fully invisible on a real iPhone while
                    // working correctly in Simulator/desktop).
                    return renderEmphasisText(
                      paragraph,
                      wordmarkGradientTextStyle ? 1 : resolvedDimOpacity,
                      wordmarkGradientTextStyle ? 1 : resolvedHighlightOpacity,
                      normalized.emphasisHighlightEnabled ? normalized.emphasisFontWeight : undefined,
                      // Suppressed in both 'clip' AND blend mode — a
                      // page-supplied highlightColorOverride (e.g.
                      // pages/abstract.tsx's own wideColumnTypography/
                      // narrowColumnTypography-derived value) would
                      // otherwise win over paragraphGradientBlendColor for
                      // just the emphasis runs, splitting the paragraph
                      // into two different colors instead of the one
                      // shared override both modes intend.
                      normalized.emphasisHighlightEnabled && !wordmarkGradientTextStyle && !paragraphBlendStyle
                        ? highlightColorOverride
                        : undefined,
                    );
                  })()}
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
