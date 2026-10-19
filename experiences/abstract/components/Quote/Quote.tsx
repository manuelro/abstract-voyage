import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { tailwindTokenCssValue } from '../../../../components/Panel/config/tailwindFields';
import { useCardLiftPhysics } from '../../../../components/proximity/useCardLiftPhysics';
import { useBreakpointTier } from '../../../../components/useBreakpointTier';
import {
  usePointerProximity,
  type PointerProximityState,
} from '../../../../components/proximity/usePointerProximity';
import { DEFAULT_CTA_BUTTON_CONFIG, type CtaButtonConfig } from '../../../../components/CtaButton/config/registered';
import type { SliderContentSlide } from '../../../../helpers/postContent';
import type { DeckPaletteState } from '../../helpers/deckPalette';
import type { AbstractPostDockPaletteConfig } from '../AbstractPostDock/config/registered';
import type { LiquidSliderConfig } from '../AbstractPostDock/config/legacy';
import type { LiquidSliderMotion } from '../AbstractPostDock/hooks/motion';
import type { AbstractPostDockHologramConfig } from '../AbstractPostDock';
import { DEFAULT_ABSTRACT_POST_DOCK_HOLOGRAM_CONFIG } from '../AbstractPostDock/config/registered';
import type { AbstractPostDockGradientActivity } from '../AbstractPostDock/helpers/gradientActivity';
import { CardGradientMesh } from '../CardGradientMesh';
import { DEFAULT_COVER_FLOW_CONFIG } from '../CoverFlow/CoverFlow.config';
import { GradientInkSurface } from '../../../../components/GradientInkSurface';
import {
  buildQuoteCssInkGradientFromMeshSamples,
  deriveQuoteTextColor,
  generateQuotePalette,
  normalizeQuoteConfig,
  quoteSourceHeadingGapStyle,
  quoteMeshBrightnessMultiplier,
  QUOTE_PALETTE_SIZE,
  type QuoteConfig,
} from './config';
import { resolveQuoteCssInkFallback } from './cssInkFallback';
import { resolveParentQuoteConfig } from './parentQuoteConfig';
import { quoteGradientDiagnostic, resolveQuoteRenderState, resolveQuoteSourceIndex } from './renderState';
import { MinimalModeText, type MinimalModeTextProps } from '../AbstractPostDock/components/MinimalModeText';

// Sample along the CSS gradient's actual axis, within the padded text box.
const QUOTE_CSS_MESH_SAMPLE_COUNT = 5;
import styles from './Quote.module.css';

export type QuoteGradient = { dominant: string; support: string; counterpoint: string };

// CSS aspect-ratio values for QuoteConfig.geometryShape's three fixed-box
// options ('auto' sets no aspect-ratio at all -- today's unconstrained,
// content-driven height). Computed from whichever width the host already
// gives the figure (percentage/flex/grid width, not a hard pixel size), so
// the shape stays fluid/responsive at every breakpoint rather than snapping
// to a fixed box size. Portrait/landscape use a classic 3:4 / 4:3 editorial
// ratio -- noticeably non-square in either direction without being an
// extreme banner/column shape.
const QUOTE_GEOMETRY_ASPECT_RATIO: Record<'square' | 'portrait' | 'landscape', string> = {
  square: '1 / 1',
  portrait: '3 / 4',
  landscape: '4 / 3',
};

export type QuoteCoverFlowGradient = {
  slides: ReadonlyArray<SliderContentSlide>;
  palettes: ReadonlyArray<DeckPaletteState | null> | null;
  motion: LiquidSliderMotion;
  config: LiquidSliderConfig;
  /** The deck's own palette config (the same one that built `palettes`).
   * Supplying it lets the CSS-fallback render mode derive a card's three
   * representative colors via `computeDeckChord`; omit it and CSS mode has no
   * color source and falls back to the plain quote. Unused by unified-ink
   * mode, which reads the live mesh directly. */
  paletteConfig?: AbstractPostDockPaletteConfig;
  /** A design surface with several simultaneous previews can freeze each mesh
   * after its first frame; reader-facing quotes remain continuous by default. */
  activity?: AbstractPostDockGradientActivity;
  /** The SAME hologram tuning the host's own cards use (e.g. wall.tsx's
   * dockHologramConfig). Supplying it lets the quote's shared CardGradientMesh
   * render the identical holographic shimmer the cards have, driven by the
   * quote's own pointer-proximity signal. Omit it for a still (but still
   * live/animating) mesh with no hover hologram. */
  hologramConfig?: AbstractPostDockHologramConfig;
};

export type QuoteProps = {
  config?: Partial<QuoteConfig>;
  /** Optional overrides for the shared paragraph renderer; inherited by every editorial quote variant.
   * Tint applies to plain/palette quotes. Gradient modes keep their configured ink color. */
  textAppearance?: Partial<Pick<MinimalModeTextProps,
    'fontSize' | 'tracking' | 'lineHeight' | 'tint' | 'dimOpacity' | 'emphasisOpacity' | 'highlightedWordFontWeight' | 'fontFamily'>>;
  /** Live card height/width ratio when the host changes it from the default. */
  cardHeightToWidthRatio?: number;
  /** Heading rendered inside the quote; its vertical placement follows config. */
  sourceHeading?: ReactNode;
  beforeContent?: ReactNode;
  afterContent?: ReactNode;
  /** Additional editorial content inside the same ink surface, beneath the passage. */
  children?: ReactNode;
  /** Render only the quote surface and nested content. */
  decorative?: boolean;
  /** Blend a nested quote at the parent ink layer when that layer isolates descendants. */
  wrappedQuoteBlendMode?: QuoteConfig['cardBlendMode'];
  /** A host can give a full-width quote a viewport-height floor. */
  minHeight?: CSSProperties['minHeight'];
  /** Keep large authoring-token insets from consuming the whole lead card. */
  constrainInlinePadding?: boolean;
  fontSizeOverridePx?: number;
  /** Colors are supplied by the host, so the quote can reuse a live palette. */
  gradients?: ReadonlyArray<QuoteGradient>;
  /** The exact slides, palette states, motion and shader config used by CoverFlow. */
  coverFlowGradient?: QuoteCoverFlowGradient;
  className?: string;
  /** Extra inline styles merged onto the root — lets a host surface the quote
   * as a card (background/ink/border) on the very element the opt-in lift
   * physics below transforms, so the whole surface tilts/scales as one plane
   * rather than just the text inside it. */
  style?: CSSProperties;
  /** Opt-in: the exact same proximity-driven tilt/scale/lift the cards use
   * (via the shared `useCardLiftPhysics` engine). Pass a CtaButtonConfig — the
   * same shape the page already feeds its cards — to turn it on; omit it and
   * the quote stays perfectly flat, with zero proximity subscription. */
  liftPhysics?: CtaButtonConfig;
  /** Mount the WebGL mesh only near the viewport when a page repeats quotes. */
  deferGradientUntilVisible?: boolean;
};

export function Quote({
  config, textAppearance, cardHeightToWidthRatio, sourceHeading, beforeContent, afterContent, children, decorative = false, wrappedQuoteBlendMode, minHeight, constrainInlinePadding = false, fontSizeOverridePx, coverFlowGradient, className, style: styleProp, liftPhysics, deferGradientUntilVisible = false,
}: QuoteProps) {
  const value = normalizeQuoteConfig(config);
  const { tier } = useBreakpointTier();
  // Corner radius for the active breakpoint (mobile is `borderRadius` itself),
  // so the corners can differ per tier, e.g. square on an edge-to-edge mobile
  // container and rounded on tablet/desktop. Undefined when radius is disabled.
  const resolvedBorderRadius = value.borderRadiusEnabled
    ? tier === 'lg'
      ? tailwindTokenCssValue('borderRadius', 'lg', value.borderRadiusLg)
      : tier === 'md'
        ? tailwindTokenCssValue('borderRadius', 'md', value.borderRadiusMd)
        : tailwindTokenCssValue('borderRadius', 'base', value.borderRadius)
    : undefined;
  const wrapsQuote = value.cardBlendEnabled && !decorative;
  const figureMinHeight = wrapsQuote ? undefined : minHeight;
  const cardRatio = typeof cardHeightToWidthRatio === 'number' && Number.isFinite(cardHeightToWidthRatio) && cardHeightToWidthRatio > 0
    ? cardHeightToWidthRatio : DEFAULT_COVER_FLOW_CONFIG.cardAspectRatio;
  const meshModulation = useMemo(() => ({
    brightnessMultiplier: quoteMeshBrightnessMultiplier(value.gradientInkMeshDarkeningPercent, value.gradientInkMeshLighteningPercent),
    saturationMultiplier: value.gradientInkMeshSaturationPercent / 100,
    scale: value.gradientInkMeshScale,
    scaleX: value.gradientInkMeshScaleX,
    scaleY: value.gradientInkMeshScaleY,
  }), [
    value.gradientInkMeshDarkeningPercent,
    value.gradientInkMeshLighteningPercent,
    value.gradientInkMeshSaturationPercent,
    value.gradientInkMeshScale,
    value.gradientInkMeshScaleX,
    value.gradientInkMeshScaleY,
  ]);
  const gradientElementRef = useRef<HTMLDivElement | null>(null);
  const [gradientVisible, setGradientVisible] = useState(!deferGradientUntilVisible);
  useEffect(() => {
    if (!deferGradientUntilVisible) {
      setGradientVisible(true);
      return undefined;
    }
    const element = gradientElementRef.current;
    if (!element || typeof IntersectionObserver === 'undefined') {
      setGradientVisible(true);
      return undefined;
    }
    const observer = new IntersectionObserver(entries => {
      setGradientVisible(entries.some(entry => entry.isIntersecting));
    }, { rootMargin: '300px 0px' });
    observer.observe(element);
    return () => observer.disconnect();
  }, [deferGradientUntilVisible]);
  // Same shared engine the cards use: the root becomes the transformed plane,
  // tilting/scaling toward the cursor exactly like a Card does. Elevation (the
  // lift/tilt/scale transform) and shadow casting (the drop shadow) are now
  // independently opt-in via config -- they used to be coupled, so any host
  // that provided lift physics got BOTH. The host still supplies the tuning
  // and gates the engine by providing `liftPhysics` at all (a page with no
  // physics stays inert regardless of config); within that, each effect is
  // switched on its own. Either effect alone keeps the shared engine running;
  // only with BOTH off does it fully disengage -- no transform, no shadow, no
  // proximity subscription (setRootRef/physicsHandlers below are already gated
  // on physicsEnabled, so neither the lift ref nor the pointer handlers attach).
  const hostProvidedPhysics = Boolean(liftPhysics);
  const elevationActive = hostProvidedPhysics && value.elevationEnabled;
  const shadowActive = hostProvidedPhysics && value.shadowEnabled;
  const physicsEnabled = elevationActive || shadowActive;
  // Shadow-only (elevation off): zero the lift/tilt/scale terms so the element
  // casts its shadow without physically moving. The elevation *value* still
  // tracks the pointer, so the shadow stays reactive -- it just drives no
  // transform. useCardLiftPhysics reads these as scalar fields (not by object
  // identity), so rebuilding this object each render is free: flipping
  // elevationActive changes the scalars and the engine recomputes; an
  // unchanged flag leaves them stable.
  const baseLiftConfig = liftPhysics ?? DEFAULT_CTA_BUTTON_CONFIG;
  const liftPhysicsConfig = elevationActive
    ? baseLiftConfig
    : { ...baseLiftConfig, proximityLiftPx: 0, proximityScale: 1, tiltEnabled: false };
  const {
    ref: liftRef,
    handleFocus: liftHandleFocus,
    handleBlur: liftHandleBlur,
    handlePointerDown: liftHandlePointerDown,
    handleRelease: liftHandleRelease,
    pressedRef: liftPressedRef,
  } = useCardLiftPhysics<HTMLDivElement>({
    config: liftPhysicsConfig,
    disabled: !physicsEnabled,
    // Fades the cast shadow fully transparent when shadow is off, independent
    // of whether the lift transform is active.
    shadowEnabled: shadowActive,
  });
  // Live pointer-proximity signal for the mesh's holographic shimmer -- the
  // quote's own counterpart to the card's interactionRef (FlipCard feeds the
  // identical ref to its CardGradientMesh). Attached to the root below so the
  // hologram responds to hover exactly as a card's does. The quote's own
  // config switch controls the effect independently of its host's setting.
  const hologramInteractionRef = useRef<PointerProximityState>({ proximity: 0, x: 0, y: 0 });
  const hologramNearRef = useRef(false);
  const [hologramNear, setHologramNear] = useState(false);
  const hologramProximityRef = usePointerProximity<HTMLDivElement>({
    disabled: !(value.gradientInkEnabled && value.gradientInkRenderMode === 'unified' && value.gradientInkHologramEnabled && Boolean(coverFlowGradient?.slides.length)),
    onChange: (_element, state) => {
      hologramInteractionRef.current = state;
      const near = state.proximity > 0.001;
      if (hologramNearRef.current !== near) {
        hologramNearRef.current = near;
        setHologramNear(near);
      }
    },
  });
  const setRootRef = useCallback((element: HTMLDivElement | null) => {
    gradientElementRef.current = element;
    if (physicsEnabled) liftRef(element);
    hologramProximityRef(element);
  }, [physicsEnabled, liftRef, hologramProximityRef]);
  const physicsHandlers = physicsEnabled ? {
    onFocus: liftHandleFocus,
    onBlur: liftHandleBlur,
    onPointerDown: liftHandlePointerDown,
    onPointerUp: liftHandleRelease,
    onPointerCancel: liftHandleRelease,
    onPointerLeave: () => { if (liftPressedRef.current) liftHandleRelease(); },
  } : {};

  // ---- CSS-fallback mesh color sampling ----
  // The CSS render mode must look like the live mesh, but the mesh's colors are
  // a procedural cosine-rainbow field (helpers/proceduralColorShader.ts), not
  // the deck chord the old fallback guessed from. So we render a hidden, frozen
  // copy of the SAME mesh and read its actual pixels back (CardGradientMesh ->
  // LiquidGradientAdapter's colorSampleUvs/onColorSample) at the padded text
  // positions, then build a static CSS gradient from those real colors.
  const meshSampleContainerRef = useRef<HTMLDivElement | null>(null);
  const textMeasureRef = useRef<HTMLParagraphElement | null>(null);
  const [sampleUvs, setSampleUvs] = useState<ReadonlyArray<readonly [number, number]> | null>(null);
  const [sampledMeshColors, setSampledMeshColors] = useState<ReadonlyArray<readonly [number, number, number]> | null>(null);
  const handleMeshColorSample = useCallback((colors: ReadonlyArray<readonly [number, number, number]>) => {
    setSampledMeshColors(colors);
  }, []);
  const cssSamplingEnabled = value.enabled
    && value.gradientInkEnabled
    && value.gradientInkRenderMode === 'css'
    && Boolean(coverFlowGradient?.slides.length);
  // The extreme corners along the CSS gradient axis are the gradient's 0%
  // and 100% positions. Measure the paragraph after responsive padding and
  // wrapping have resolved, then sample those positions in the mesh's box.
  useEffect(() => {
    if (!cssSamplingEnabled) { setSampleUvs(null); return undefined; }
    const container = meshSampleContainerRef.current;
    const textEl = textMeasureRef.current;
    if (!container || !textEl || typeof ResizeObserver === 'undefined') return undefined;
    const measure = () => {
      const cRect = container.getBoundingClientRect();
      const tRect = textEl.getBoundingClientRect();
      if (cRect.height <= 1 || cRect.width <= 1) return;
      const radians = value.gradientInkCssAngleDegrees * Math.PI / 180;
      const horizontal = Math.sin(radians);
      const vertical = -Math.cos(radians);
      const n = QUOTE_CSS_MESH_SAMPLE_COUNT;
      const next: Array<readonly [number, number]> = Array.from({ length: n }, (_, i) => {
        const t = i / (n - 1);
        const x = tRect.left + tRect.width * (horizontal > 0.001 ? t : horizontal < -0.001 ? 1 - t : 0.5);
        const y = tRect.top + tRect.height * (vertical > 0.001 ? t : vertical < -0.001 ? 1 - t : 0.5);
        return [
          Math.min(1, Math.max(0, (x - cRect.left) / cRect.width)),
          Math.min(1, Math.max(0, (y - cRect.top) / cRect.height)),
        ] as const;
      });
      setSampleUvs(prev => (
        prev && prev.length === next.length && prev.every((p, i) => Math.abs(p[0] - next[i][0]) < 0.002 && Math.abs(p[1] - next[i][1]) < 0.002)
          ? prev : next
      ));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    observer.observe(textEl);
    return () => observer.disconnect();
  }, [cssSamplingEnabled, value.gradientInkCssAngleDegrees, value.text, value.textTransform, value.measureCh, value.leading, value.textSize, value.textSizeMd, value.textSizeLg]);

  if (!value.enabled) return null;

  const blendIndex = resolveQuoteSourceIndex(value.gradientInkSourceCard, coverFlowGradient?.slides.length ?? 0);
  // Gradient ink has two mutually-exclusive render modes (QuoteConfig.
  // gradientInkRenderMode), both gated by the single gradientInkEnabled switch.
  const cssMode = value.gradientInkEnabled && value.gradientInkRenderMode === 'css';
  // UNIFIED uses the shared CardGradientMesh; renderState owns its availability
  // and blend contract, including the pending mesh state on the wall.
  // CSS FALLBACK: no live WebGL in the final paint, no overlay surface -- just
  // the text, filled by a static CSS linear-gradient. Preferred source is the
  // hidden sampling mesh's pixels, read along the chosen gradient axis inside
  // the padded text box and blended with the unified ink treatment. When no
  // deck is available to sample, or before the first sample lands, it falls
  // back to the deck chord so the quote still shows a
  // gradient rather than nothing.
  const cssSamplingPossible = cssMode && blendIndex >= 0 && Boolean(coverFlowGradient?.slides.length);
  const cssSampleSlide = cssSamplingPossible ? coverFlowGradient!.slides[blendIndex] : undefined;
  const cssSamplePalette = cssSamplingPossible ? coverFlowGradient!.palettes?.[blendIndex] ?? null : null;
  const cssSampledGradient = cssSamplingPossible && sampledMeshColors && sampledMeshColors.length > 0
    ? buildQuoteCssInkGradientFromMeshSamples(sampledMeshColors, `${value.gradientInkCssAngleDegrees}deg`, value)
    : null;
  const cssFallback = cssMode
    ? resolveQuoteCssInkFallback(value, coverFlowGradient?.slides.length ?? 0, coverFlowGradient?.paletteConfig)
    : null;
  const cssInkGradient = cssSampledGradient ?? cssFallback?.gradient;
  const renderState = resolveQuoteRenderState(value, {
    deckSize: coverFlowGradient?.slides.length ?? 0,
    meshVisible: gradientVisible,
    cssGradient: cssInkGradient ?? null,
  });
  const unifiedState = renderState.kind === 'unifiedInk' || renderState.kind === 'pendingMesh' ? renderState : null;
  const unifiedInkActive = Boolean(unifiedState);
  const cssInkActive = renderState.kind === 'cssInk';
  // A unique signature so the hidden sampling mesh remounts (and re-samples)
  // whenever anything that changes the mesh's colors OR the sample positions
  // changes -- a frozen mesh renders only once, so it needs a fresh mount to
  // re-read. Cheap: a hidden, frozen, one-frame canvas.
  const meshSampleKey = [
    value.gradientInkMeshSaturationPercent,
    value.gradientInkMeshDarkeningPercent,
    value.gradientInkMeshLighteningPercent,
    value.gradientInkMeshScale,
    value.gradientInkMeshScaleX,
    value.gradientInkMeshScaleY,
    value.gradientInkSourceCard,
    sampleUvs?.map(([u, v]) => `${u.toFixed(3)},${v.toFixed(3)}`).join('|') ?? '',
  ].join('|');
  const hologramEnabled = unifiedInkActive && value.gradientInkHologramEnabled;
  const hostHologramConfig = coverFlowGradient?.hologramConfig ?? DEFAULT_ABSTRACT_POST_DOCK_HOLOGRAM_CONFIG;
  const hologramStrength = value.gradientInkHologramStrengthPercent / 100;
  const quoteHologramConfig = hologramEnabled ? {
    ...hostHologramConfig,
    enabled: true,
    offsetGain: hostHologramConfig.offsetGain * hologramStrength,
    hueShiftAmount: hostHologramConfig.hueShiftAmount * hologramStrength,
    saturationBoost: hostHologramConfig.saturationBoost * hologramStrength,
    brightnessBoost: hostHologramConfig.brightnessBoost * hologramStrength,
  } : undefined;
  const gradientActivity = hologramEnabled && hologramNear && coverFlowGradient?.activity === 'frozen'
    ? 'continuous' : coverFlowGradient?.activity ?? 'continuous';
  const blendSlide = unifiedState ? coverFlowGradient!.slides[unifiedState.sourceIndex] : undefined;
  const blendPalette = unifiedState ? coverFlowGradient!.palettes?.[unifiedState.sourceIndex] ?? null : null;

  // Surface palette: a self-contained (no host/CoverFlow dependency), opt-in
  // solid background -- distinct from the `palette`/`blended` gradient-ink
  // system above, which derives its colors from a live CoverFlow deck.
  // Generated fresh every render from the two modulation knobs (cheap: 7
  // colord() calls), not memoized -- consistent with the rest of this
  // component, which recomputes its own derived style object on every render
  // rather than caching.
  // Suppressed in CSS-ink mode too: that mode paints the text with its own CSS
  // gradient and must render "just the text" -- a competing solid palette
  // background/ink would defeat that.
  const paletteSwatches = renderState.kind === 'palette'
    ? generateQuotePalette(value.paletteSaturationPercent, value.paletteLightnessPercent)
    : undefined;
  const paletteIndex = Math.min(QUOTE_PALETTE_SIZE, Math.max(1, value.paletteColorIndex)) - 1;
  const paletteBackgroundColor = paletteSwatches?.[paletteIndex];
  // Ink is DERIVED from the chosen background (same hue) but with its own
  // independently operator-set saturation/lightness ("chroma" and
  // "darkness/lightness") -- deriveQuoteTextColor honors those exactly
  // whenever the result is still legible, and nudges only the minimum
  // amount needed otherwise. See config.ts's own doc comment.
  const paletteTextColor = paletteBackgroundColor
    ? deriveQuoteTextColor(paletteBackgroundColor, value.textColorSaturationPercent, value.textColorLightnessPercent).color
    : undefined;

  // Per-breakpoint measure. Each tier's width is its Tailwind maxWidth token
  // (e.g. max-w-full = 100%, a percentage, or a rem cap) when set; `auto` falls
  // back to the character measure (`measureCh`). md/lg inherit the smaller tier
  // while left at `auto`. The CSS media queries in Quote.module.css consume the
  // three vars below.
  const measureBaseCss = value.measureMaxWidth === 'auto'
    ? `${value.measureCh}ch`
    : tailwindTokenCssValue('maxWidth', 'base', value.measureMaxWidth);
  const measureMdCss = value.measureMaxWidthMd === 'auto'
    ? measureBaseCss
    : tailwindTokenCssValue('maxWidth', 'md', value.measureMaxWidthMd);
  const measureLgCss = value.measureMaxWidthLg === 'auto'
    ? measureMdCss
    : tailwindTokenCssValue('maxWidth', 'lg', value.measureMaxWidthLg);

  const style = {
    '--quote-text-font': tailwindTokenCssValue('fontFamily', 'base', value.textFontFamily),
    '--quote-author-font': tailwindTokenCssValue('fontFamily', 'base', value.authorFontFamily),
    // Measure and leading are role-dependent (display Statements run tight and
    // narrow; reading Passages open up to ~60ch / leading-normal), so they
    // come off the config as custom properties the .text rule consumes.
    '--quote-measure': measureBaseCss,
    '--quote-measure-md': measureMdCss,
    '--quote-measure-lg': measureLgCss,
    '--quote-leading': tailwindTokenCssValue('lineHeight', 'base', value.leading),
    // Tracking/text-wrap/hyphens are the "paragraph formatting for enhanced
    // reading" trio (alongside measure/leading above) -- same CSS-custom-
    // -property handoff to Quote.module.css, same reasoning: role-dependent
    // values a single hardcoded stylesheet rule can't carry per-instance.
    '--quote-tracking': tailwindTokenCssValue('letterSpacing', 'base', value.tracking),
    '--quote-text-wrap': value.textWrap,
    '--quote-hyphens': value.hyphens ? 'auto' : 'none',
  } as CSSProperties;

  // Text size and padding are literal Tailwind utility classes straight off
  // the config (base + md: + lg:, Tailwind's own responsive system — no
  // per-breakpoint CSS custom property to keep in sync). Applied on .figure
  // itself, not .text directly, so the quotation marks (em-sized in CSS)
  // inherit the same resolved size without their own breakpoint fields.
  // Author size is independent, applied directly on the attribution element.
  const figureClassName = [
    styles.figure,
    value.textSize, value.textSizeMd, value.textSizeLg,
    value.paddingTop, value.paddingTopMd, value.paddingTopLg,
    value.paddingRight, value.paddingRightMd, value.paddingRightLg,
    value.paddingBottom, value.paddingBottomMd, value.paddingBottomLg,
    value.paddingLeft, value.paddingLeftMd, value.paddingLeftLg,
  ].join(' ');
  const activePaddingLeft = tier === 'lg'
    ? tailwindTokenCssValue('paddingLeft', 'lg', value.paddingLeftLg)
    : tier === 'md'
      ? tailwindTokenCssValue('paddingLeft', 'md', value.paddingLeftMd)
      : tailwindTokenCssValue('paddingLeft', 'base', value.paddingLeft);
  const activePaddingRight = tier === 'lg'
    ? tailwindTokenCssValue('paddingRight', 'lg', value.paddingRightLg)
    : tier === 'md'
      ? tailwindTokenCssValue('paddingRight', 'md', value.paddingRightMd)
      : tailwindTokenCssValue('paddingRight', 'base', value.paddingRight);
  const attributionClassName = [
    styles.attribution,
    value.authorSize, value.authorSizeMd, value.authorSizeLg,
    cssInkActive ? styles.cssInkText : '',
  ].filter(Boolean).join(' ');
  // CSS-ink mode clips the shared linear-gradient to each text element's own
  // glyphs (background-clip: text). Appended to the body text and both marks
  // so the whole quote reads as one gradient-filled voice.
  const cssInkTextClass = cssInkActive ? styles.cssInkText : '';

  // Vertical placement is centered when it fits. Horizontal placement follows
  // textAlign. In card-ratio mode, safe center keeps long copy reachable.
  // Inline (not a CSS class) so it always wins over .figure's stylesheet
  // align-items: flex-start with zero specificity fights, and so the
  // conditional aspect-ratio below can merge into the same object. Applied
  // via style, not a className, because aspect-ratio is a continuous CSS
  // value keyed off an enum, not a literal Tailwind token the generated
  // tailwindUtilities registry carries (components/Panel/config/
  // tailwindFields.ts's own "no hand-rolled Tailwind class unions" rule
  // governs *panel fields*, not plain inline styles like this).
  const figureStyle: CSSProperties = {
    ...(constrainInlinePadding ? {
      paddingInlineStart: `min(${activePaddingLeft}, 18%)`,
      paddingInlineEnd: `min(${activePaddingRight}, 18%)`,
    } : {}),
    // Without a unified ink layer, this is the parent's direct content group.
    // Blend here so the complete nested quote sees the parent's own surface.
    ...(decorative && wrappedQuoteBlendMode && !unifiedInkActive ? { mixBlendMode: wrappedQuoteBlendMode } : {}),
    ...(figureMinHeight ? { width: '100%' } : {}),
    ...(fontSizeOverridePx ? { fontSize: `${fontSizeOverridePx}px` } : {}),
    alignItems: value.textAlign === 'start' ? 'flex-start' : value.textAlign === 'end' ? 'flex-end' : 'center',
    justifyContent: value.cardAspectRatioEnabled ? 'safe center' : 'center',
    textAlign: value.textAlign,
    ...(value.cardAspectRatioEnabled
      ? { aspectRatio: `1 / ${cardRatio}`, minHeight: 0 }
      : value.geometryShape === 'auto' ? {} : { aspectRatio: QUOTE_GEOMETRY_ASPECT_RATIO[value.geometryShape] }),
    ...(figureMinHeight ? { minHeight: figureMinHeight } : {}),
    // Opt-in clip -- see QuoteConfig's own doc comment. Off by default
    // (overflow: visible), so a large/offset mark can bleed past the box
    // exactly as it always has, unless the operator asks for it to be cut.
    overflow: figureMinHeight ? 'visible' : value.cardAspectRatioEnabled ? 'auto' : value.clipOverflowEnabled ? 'hidden' : 'visible',
  };

  // Size/opacity/placement, fully segregated per mark (opening vs closing --
  // see QuoteConfig's own doc comment). Both marks are taken out of the flex
  // flow entirely (`position: absolute`) and placed via left/top percentages
  // of the FIGURE's own box -- 0%/0% is the figure's own top-left corner, per
  // the operator's explicit redefinition of these fields (previously a
  // flex-flow nudge keyed to the mark's own size). Being absolutely
  // positioned is also what makes "the quote's padding is respected even
  // with marks enabled" true for free: an absolutely positioned child never
  // participates in the flex box's own padding/sizing math, so it can't
  // compress or shift the text block no matter how large a mark gets.
  // opacity/fontFamily are still set inline so they reliably win over
  // .blendContent .mark's own `opacity: 1` class rule regardless of
  // blended/gradient-ink mode (plain inline styles always beat a
  // non-!important class rule).
  const markFontFamilyValue = tailwindTokenCssValue('fontFamily', 'base', value.markFontFamily);
  const openingMarkStyle: CSSProperties = {
    position: 'absolute',
    left: `${value.openingMarkOffsetXPercent}%`,
    top: `${value.openingMarkOffsetYPercent}%`,
    fontSize: `${value.openingMarkSizeEm}em`,
    opacity: value.openingMarkOpacityPercent / 100,
    fontFamily: markFontFamilyValue,
  };
  const closingMarkStyle: CSSProperties = {
    position: 'absolute',
    left: `${value.closingMarkOffsetXPercent}%`,
    top: `${value.closingMarkOffsetYPercent}%`,
    fontSize: `${value.closingMarkSizeEm}em`,
    opacity: value.closingMarkOpacityPercent / 100,
    fontFamily: markFontFamilyValue,
  };

  const resolvedSourceHeading = sourceHeading === undefined && value.sourceHeadingText
    ? <h3
      className={[styles.sourceHeading, value.sourceHeadingFontSize, value.sourceHeadingFontSizeMd, value.sourceHeadingFontSizeLg].join(' ')}
      data-quote-source-heading="" data-gradient-ink-color="" style={{
      color: unifiedInkActive ? undefined : 'inherit',
      letterSpacing: tailwindTokenCssValue('letterSpacing', 'base', value.sourceHeadingTracking),
      textTransform: tailwindTokenCssValue('textTransform', 'base', value.sourceHeadingTextTransform) as CSSProperties['textTransform'],
      opacity: value.sourceHeadingOpacityPercent / 100,
      textAlign: value.headingAlign,
      ...quoteSourceHeadingGapStyle(value, 'before'),
    }}>{value.sourceHeadingText}</h3>
    : sourceHeading;
  const topSourceHeading = Boolean(resolvedSourceHeading && value.sourceHeadingTopAligned);
  const figureBody = decorative ? children : (
    <>
        {!topSourceHeading ? resolvedSourceHeading : null}
        {beforeContent}
        {value.showQuotationMarks ? (
          <span
            data-gradient-ink-color=""
            className={[styles.mark, cssInkTextClass].filter(Boolean).join(' ')}
            style={openingMarkStyle}
            aria-hidden="true"
          >
            “
          </span>
        ) : null}
        <blockquote className={styles.blockquote} style={{ textAlign: value.textAlign }}>
          <MinimalModeText
            ref={textMeasureRef}
            data-gradient-ink-color=""
            presentation="inherit"
            text={value.text}
            dimOpacity={textAppearance?.dimOpacity ?? 1}
            emphasisOpacity={textAppearance?.emphasisOpacity ?? 1}
            fontSize={textAppearance?.fontSize}
            tracking={textAppearance?.tracking}
            lineHeight={textAppearance?.lineHeight}
            tint={unifiedInkActive || cssInkActive ? undefined : textAppearance?.tint}
            highlightedWordFontWeight={textAppearance?.highlightedWordFontWeight}
            fontFamily={textAppearance?.fontFamily}
            className={[styles.text, cssInkTextClass].filter(Boolean).join(' ')}
            style={{
              fontWeight: tailwindTokenCssValue('fontWeight', 'base', value.textFontWeight),
              textTransform: tailwindTokenCssValue('textTransform', 'base', value.textTransform) as CSSProperties['textTransform'],
              opacity: value.textOpacityPercent / 100,
            }}
          />
        </blockquote>
        {children ? <div className={styles.extraContent}>{children}</div> : null}
        {value.showQuotationMarks && value.showClosingQuotationMark ? (
          <span
            data-gradient-ink-color=""
            className={[styles.mark, styles.closingMark, cssInkTextClass].filter(Boolean).join(' ')}
            style={closingMarkStyle}
            aria-hidden="true"
          >
            ”
          </span>
        ) : null}
        {value.showAuthor ? (
          <figcaption
            data-gradient-ink-color=""
            className={attributionClassName}
            // .attribution's own stylesheet rule (Quote.module.css) sets a
            // fixed opacity: 0.68 ("quieter than the voice") for the normal,
            // flat-ink byline look. In gradient-ink mode that stacks ON TOP
            // of gradientInkTextOpacityPercent's own already-uniform rgba
            // alpha (confirmed live: markCssOpacity/figcaptionCssOpacity
            // both read 0.68 while textCssOpacity reads 1, i.e. the author
            // renders visibly fainter than the body text for no
            // operator-visible reason), defeating "the author is part of the
            // SAME unified ink layer." Overridden back to fully opaque here
            // so gradientInkTextOpacityPercent is the only opacity knob in
            // effect, same as it already is for the body text.
            style={unifiedInkActive ? { opacity: 1 } : undefined}
          >
            — {value.author}
          </figcaption>
        ) : null}
        {afterContent}
    </>
  );
  const figure = (
    <figure className={figureClassName} style={figureStyle} data-quote-source-position={topSourceHeading ? 'top' : 'content'}>
        {topSourceHeading ? resolvedSourceHeading : null}
        {topSourceHeading ? <div className={styles.centeredBody} style={{
          alignItems: value.textAlign === 'start' ? 'flex-start' : value.textAlign === 'end' ? 'flex-end' : 'center',
        }}>{figureBody}</div> : figureBody}
    </figure>
  );

  // The card-surface rounding (gradientBackdrop/blendContent below) is set
  // INLINE from the same borderRadiusEnabled/borderRadius knobs the root
  // itself uses -- not left to CSS-module inheritance -- so both layers stay
  // visually rounded to match the root even though the root's own overflow
  // is no longer unconditionally 'hidden' (see blendRootOverflow below).
  const blendSurfaceBorderRadius = resolvedBorderRadius;
  // Opt-in border on the unified-ink overlay (the content layer for a quote,
  // or the separate backdrop scrim for a textless parent). Width is a
  // Tailwind `borderWidth` token resolved to its CSS
  // length -- the same generated-token pathway blendSurfaceBorderRadius uses
  // just above (commit 7796da4). Style is a raw CSS border-style so the 3D
  // options the operator asked for (`inset`, and `outset`/`groove`/`ridge`)
  // work even though Tailwind carries no utility for them; color is an
  // arbitrary picked color. Only built in unified-ink mode -- the plain and
  // CSS-fallback paths don't render this overlay element at all, so the border
  // can't leak onto them. The quote content and parent scrim both receive the
  // same resolved radius so their border follows the quote surface.
  const blendOverlayBorder: CSSProperties | undefined = unifiedInkActive && value.gradientInkBorderEnabled
    ? {
        borderStyle: value.gradientInkBorderStyle,
        borderWidth: tailwindTokenCssValue('borderWidth', 'base', value.gradientInkBorderWidth),
        borderColor: value.gradientInkBorderColor,
      }
    : undefined;
  // Quote.module.css's `.blendRoot` used to force `overflow: hidden`
  // unconditionally, silently overriding clipOverflowEnabled whenever
  // gradient ink was on -- an oversized/offset quotation mark got clipped
  // against the card's own rounded edge even with "Clip overflow" explicitly
  // turned off (confirmed live: a mark positioned near the left edge showed
  // a hard vertical cut through its own glyph shape). Resolving overflow
  // inline here, off the SAME clipOverflowEnabled the figure already obeys,
  // makes blended mode match non-blended mode's behavior instead of quietly
  // disagreeing with it.
  const blendRootOverflow = unifiedInkActive ? (value.clipOverflowEnabled ? 'hidden' : 'visible') : undefined;

  const quoteNode = (
    <div
      ref={setRootRef}
      className={[
        styles.root, unifiedInkActive ? styles.blendRoot : '', className,
        value.marginTop, value.marginTopMd, value.marginTopLg,
        value.marginBottom, value.marginBottomMd, value.marginBottomLg,
      ].filter(Boolean).join(' ')}
      style={{
        ...styleProp,
        ...style,
        // The solid palette is the plain quote's tint and derived text ink.
        // Unified ink owns its own base, mesh, and foreground colors, so the
        // palette must not leave a competing inline background on this root.
        ...(paletteBackgroundColor ? { backgroundColor: paletteBackgroundColor, color: paletteTextColor } : {}),
        ...(unifiedInkActive ? { '--quote-base-color': value.gradientInkBaseColor, overflow: blendRootOverflow } : {}),
        // CSS-ink mode: the gradient and its zoom (background-size, driven by
        // the independent gradient X/Y scales) are handed to .cssInkText via custom
        // properties the text elements consume to clip the gradient to glyphs.
        ...(cssInkActive ? {
          '--quote-css-ink-gradient': cssInkGradient,
          // Sampled gradients already encode the mesh's own position/scale, so
          // they map 1:1 onto the glyphs (100%). The chord fallback keeps the
          // scale-driven background-size zoom it always had.
          '--quote-css-ink-size': cssSampledGradient ? '100%' : cssFallback?.backgroundSize,
          // The parent quote is textless, so CSS mode paints its surface.
          ...(decorative ? { backgroundImage: cssInkGradient,
            backgroundSize: cssSampledGradient ? '100%' : cssFallback?.backgroundSize,
            backgroundPosition: 'center' } : {}),
        } : {}),
        // The hidden sampling mesh is absolutely positioned against the root, so
        // the root must establish a containing block while sampling.
        ...(cssSamplingPossible ? { position: 'relative' } : {}),
        ...(physicsEnabled ? { willChange: 'transform' } : {}),
        // Opt-in corner rounding on the root box -- see QuoteConfig's own
        // doc comment. Omitted (not 0) when disabled, so it never overrides
        // a border-radius a host supplied via `className`/`style`. Resolved
        // from the Tailwind `borderRadius` token the same way leading/
        // tracking above are.
        ...(resolvedBorderRadius
          ? { borderRadius: resolvedBorderRadius }
          : {}),
        // Opt-in solid fill: a plain background color so the quote can act as a
        // solid card -- e.g. the backdrop another, blended quote is nested in.
        ...(value.solidFillEnabled ? { backgroundColor: value.solidFillColor } : {}),
        // A decorative parent can still blend as its own surface. The nested
        // quote's blend belongs to the parent's content group, outside the
        // child's isolated gradient-ink compositing context.
        ...(decorative && value.cardBlendEnabled ? { mixBlendMode: value.cardBlendMode } : {}),
      } as CSSProperties}
      data-quote-card-blend={decorative && value.cardBlendEnabled ? value.cardBlendMode : 'off'}
      data-quote-solid-fill={value.solidFillEnabled ? 'on' : 'off'}
      data-quote-color-source={value.textColorSource}
      data-quote-blend={unifiedState?.ink.blendMode ?? 'off'}
      data-quote-gradient-state={quoteGradientDiagnostic(renderState)}
      data-quote-css-ink={cssInkActive ? 'on' : 'off'}
      data-quote-hologram={hologramEnabled ? 'on' : 'off'}
      data-quote-palette={paletteBackgroundColor ? value.paletteColorIndex : 'off'}
      data-quote-card-ratio={value.cardAspectRatioEnabled ? 'on' : 'off'}
      {...physicsHandlers}
    >
      {unifiedInkActive ? (
        <GradientInkSurface
          backdrop={
            <CardGradientMesh
              slide={renderState.kind === 'unifiedInk' ? blendSlide : undefined}
              palette={blendPalette}
              motion={coverFlowGradient!.motion}
              config={coverFlowGradient!.config}
              hologramConfig={quoteHologramConfig}
              hologramInteraction={hologramEnabled ? hologramInteractionRef : null}
              meshModulation={meshModulation}
              activity={gradientActivity}
              style={{ borderRadius: blendSurfaceBorderRadius }}
            />
          }
          // A textless parent owns its backdrop and overlay, but must not
          // apply its foreground ink blend to the entire nested child quote.
          ink={decorative ? undefined : unifiedState!.ink}
          scrim={decorative ? (
            <div
              aria-hidden="true"
              data-quote-parent-gradient-scrim=""
              style={{
                position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none',
                backgroundColor: `color-mix(in srgb, ${value.gradientInkSurfaceColor} ${value.gradientInkOverlayOpacityPercent}%, transparent)`,
                mixBlendMode: value.gradientInkBlendMode,
                borderRadius: blendSurfaceBorderRadius,
                ...blendOverlayBorder,
              }}
            />
          ) : undefined}
          contentClassName={styles.blendContent}
          contentStyle={decorative ? {
            borderRadius: blendSurfaceBorderRadius,
            // This z-indexed content group sits above the parent's gradient.
            // A blend on its descendant cannot reach that backdrop.
            ...(wrappedQuoteBlendMode ? { mixBlendMode: wrappedQuoteBlendMode } : {}),
          } : {
            textShadow: value.gradientInkOverlayOpacityPercent > 0 ? undefined : '0 1px 2px rgba(0,0,0,0.6), 0 2px 16px rgba(0,0,0,0.45)',
            borderRadius: blendSurfaceBorderRadius,
            ...blendOverlayBorder,
          }}
        >
          {figure}
        </GradientInkSurface>
      ) : (
        <>
          {cssSamplingPossible ? (
            // Hidden, frozen copy of the SAME mesh, at the figure's own size so
            // its crop matches, used only to read the mesh's real colors back
            // at the padded text positions. opacity:0 + z-index:-1 keep it
            // invisible; absolute positioning keeps it out of layout. It
            // remounts (meshSampleKey) whenever the mesh colors or sample
            // positions change, so a frozen one-frame canvas still re-samples.
            <div
              ref={meshSampleContainerRef}
              aria-hidden="true"
              style={{ position: 'absolute', inset: 0, opacity: 0, pointerEvents: 'none', zIndex: -1, overflow: 'hidden' }}
            >
              {sampleUvs ? (
                <CardGradientMesh
                  key={meshSampleKey}
                  slide={cssSampleSlide}
                  palette={cssSamplePalette}
                  motion={coverFlowGradient!.motion}
                  config={coverFlowGradient!.config}
                  meshModulation={meshModulation}
                  activity="frozen"
                  colorSampleUvs={sampleUvs}
                  onColorSample={handleMeshColorSample}
                />
              ) : null}
            </div>
          ) : null}
          {figure}
        </>
      )}
    </div>
  );
  if (!wrapsQuote) return quoteNode;
  return (
    <Quote
      config={resolveParentQuoteConfig(value)}
      decorative
      wrappedQuoteBlendMode={value.cardBlendMode}
      style={{ isolation: 'isolate' }}
      cardHeightToWidthRatio={cardHeightToWidthRatio}
      coverFlowGradient={coverFlowGradient}
      liftPhysics={liftPhysics}
      minHeight={minHeight}
      deferGradientUntilVisible={deferGradientUntilVisible}
    >
      <div
        data-quote-card-blend={value.cardBlendMode}
        data-quote-whole-blend={value.cardBlendMode}
        style={{ width: '100%' }}
      >
        {quoteNode}
      </div>
    </Quote>
  );
}
