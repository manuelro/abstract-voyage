import { clamp } from '../../../../../helpers/clamp';
import { PROCEDURAL_COLOR_VERTEX_SOURCE } from '../../../../../helpers/proceduralColorShader';
import { resolveProceduralColorResolution } from '../../../../../helpers/proceduralColorResolution';
import { SLIDER_PROCEDURAL_COLOR_FRAGMENT_SOURCE } from './shaderSource';
import type {
  LiquidSliderMotionValues,
  SliderGradientConfig,
  SliderSlide,
} from '../config/legacy';
import {
  DEFAULT_GRADIENT_OUTPUT_TREATMENT,
  type GradientOutputTreatment,
} from '../config/outputTreatment';

export type GradientProgram = {
  program: WebGLProgram;
  vertexBuffer: WebGLBuffer;
  vertexPositionAttribute: number;
  uTime: WebGLUniformLocation | null;
  uResolution: WebGLUniformLocation | null;
  uVariation: WebGLUniformLocation | null;
  uSaturation: WebGLUniformLocation | null;
  uBrightness: WebGLUniformLocation | null;
  uScale: WebGLUniformLocation | null;
  uSeed: WebGLUniformLocation | null;
  uRandomness: WebGLUniformLocation | null;
  uOffset: WebGLUniformLocation | null;
  uHueOffset: WebGLUniformLocation | null;
  uMorph: WebGLUniformLocation | null;
  uShimmer: WebGLUniformLocation | null;
  uPulse: WebGLUniformLocation | null;
  uMeshGeometryEnabled: WebGLUniformLocation | null;
  uDomainCurveBoost: WebGLUniformLocation | null;
  uBandCurveBoost: WebGLUniformLocation | null;
  uColorSoftness: WebGLUniformLocation | null;
  uVerticalRichness: WebGLUniformLocation | null;
  uSettledDriftTime: WebGLUniformLocation | null;
  uSettledDriftAmount: WebGLUniformLocation | null;
  uSettledDriftOrganic: WebGLUniformLocation | null;
  uPalette: WebGLUniformLocation | null;
  uPaletteEnabled: WebGLUniformLocation | null;
  uChromaDuck: WebGLUniformLocation | null;
  uValueRig: WebGLUniformLocation | null;
  uMasterContrast: WebGLUniformLocation | null;
  uBellStrokeWidth: WebGLUniformLocation | null;
  uBellStrokeIntensity: WebGLUniformLocation | null;
  uHueInfluenceEnabled: WebGLUniformLocation | null;
  uHueInfluenceMix: WebGLUniformLocation | null;
  uHueInfluenceTargetHue: WebGLUniformLocation | null;
  uHueInfluenceTargetChroma: WebGLUniformLocation | null;
  uHueInfluenceStrength: WebGLUniformLocation | null;
  uHueInfluenceChromaScale: WebGLUniformLocation | null;
  uHueInfluenceShadowChromaScale: WebGLUniformLocation | null;
  uHueInfluenceHighlightChromaScale: WebGLUniformLocation | null;
  uHueInfluenceChromaPivot: WebGLUniformLocation | null;
  uHueInfluenceNeutralRecovery: WebGLUniformLocation | null;
  uHueInfluenceNeutralThreshold: WebGLUniformLocation | null;
  uHueInfluenceTonalRegister: WebGLUniformLocation | null;
  uHueInfluenceLightnessContrast: WebGLUniformLocation | null;
  uHueInfluenceInkUnity: WebGLUniformLocation | null;
  uHueInfluenceCounterpointWidth: WebGLUniformLocation | null;
  uHueInfluenceCounterpointFalloff: WebGLUniformLocation | null;
  uHueInfluenceCounterpointChromaScale: WebGLUniformLocation | null;
  uHueInfluenceCounterpointChromaFloor: WebGLUniformLocation | null;
  uHueInfluenceDitherStrength: WebGLUniformLocation | null;
  uMetalLuminanceEnabled: WebGLUniformLocation | null;
  uMetalInputBlackPoint: WebGLUniformLocation | null;
  uMetalInputWhitePoint: WebGLUniformLocation | null;
  uMetalGamma: WebGLUniformLocation | null;
  uMetalBaseDarkness: WebGLUniformLocation | null;
  uMetalContrast: WebGLUniformLocation | null;
  uMetalBodyPoint: WebGLUniformLocation | null;
  uMetalHighlightKnee: WebGLUniformLocation | null;
  uMetalHighlightGain: WebGLUniformLocation | null;
  uMetalShadowColor: WebGLUniformLocation | null;
  uMetalBodyColor: WebGLUniformLocation | null;
  uMetalHighlightColor: WebGLUniformLocation | null;
};

export function createWebGlShader(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);

  if (!shader) return null;

  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const shaderKind = type === gl.FRAGMENT_SHADER ? 'fragment' : 'vertex';
    console.error(
      `[AbstractPostDock] ${shaderKind} shader compilation failed:`,
      gl.getShaderInfoLog(shader),
    );
    gl.deleteShader(shader);
    return null;
  }

  return shader;
}

export function createGradientProgram(gl: WebGLRenderingContext): GradientProgram | null {
  const vertexShader = createWebGlShader(gl, gl.VERTEX_SHADER, PROCEDURAL_COLOR_VERTEX_SOURCE);
  const fragmentShader = createWebGlShader(gl, gl.FRAGMENT_SHADER, SLIDER_PROCEDURAL_COLOR_FRAGMENT_SOURCE);

  if (!vertexShader || !fragmentShader) return null;

  const program = gl.createProgram();
  const vertexBuffer = gl.createBuffer();

  if (!program || !vertexBuffer) return null;

  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    gl.deleteProgram(program);
    return null;
  }

  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([
      -1, -1,
      1, -1,
      -1, 1,
      1, 1,
    ]),
    gl.STATIC_DRAW,
  );

  return {
    program,
    vertexBuffer,
    vertexPositionAttribute: gl.getAttribLocation(program, 'aVertexPosition'),
    uTime: gl.getUniformLocation(program, 'uTime'),
    uResolution: gl.getUniformLocation(program, 'uResolution'),
    uVariation: gl.getUniformLocation(program, 'uVariation'),
    uSaturation: gl.getUniformLocation(program, 'uSaturation'),
    uBrightness: gl.getUniformLocation(program, 'uBrightness'),
    uScale: gl.getUniformLocation(program, 'uScale'),
    uSeed: gl.getUniformLocation(program, 'uSeed'),
    uRandomness: gl.getUniformLocation(program, 'uRandomness'),
    uOffset: gl.getUniformLocation(program, 'uOffset'),
    uHueOffset: gl.getUniformLocation(program, 'uHueOffset'),
    uMorph: gl.getUniformLocation(program, 'uMorph'),
    uShimmer: gl.getUniformLocation(program, 'uShimmer'),
    uPulse: gl.getUniformLocation(program, 'uPulse'),
    uMeshGeometryEnabled: gl.getUniformLocation(program, 'uMeshGeometryEnabled'),
    uDomainCurveBoost: gl.getUniformLocation(program, 'uDomainCurveBoost'),
    uBandCurveBoost: gl.getUniformLocation(program, 'uBandCurveBoost'),
    uColorSoftness: gl.getUniformLocation(program, 'uColorSoftness'),
    uVerticalRichness: gl.getUniformLocation(program, 'uVerticalRichness'),
    uSettledDriftTime: gl.getUniformLocation(program, 'uSettledDriftTime'),
    uSettledDriftAmount: gl.getUniformLocation(program, 'uSettledDriftAmount'),
    uSettledDriftOrganic: gl.getUniformLocation(program, 'uSettledDriftOrganic'),
    uPalette: gl.getUniformLocation(program, 'uPalette'),
    uPaletteEnabled: gl.getUniformLocation(program, 'uPaletteEnabled'),
    uChromaDuck: gl.getUniformLocation(program, 'uChromaDuck'),
    uValueRig: gl.getUniformLocation(program, 'uValueRig'),
    uMasterContrast: gl.getUniformLocation(program, 'uMasterContrast'),
    uBellStrokeWidth: gl.getUniformLocation(program, 'uBellStrokeWidth'),
    uBellStrokeIntensity: gl.getUniformLocation(program, 'uBellStrokeIntensity'),
    uHueInfluenceEnabled: gl.getUniformLocation(program, 'uHueInfluenceEnabled'),
    uHueInfluenceMix: gl.getUniformLocation(program, 'uHueInfluenceMix'),
    uHueInfluenceTargetHue: gl.getUniformLocation(program, 'uHueInfluenceTargetHue'),
    uHueInfluenceTargetChroma: gl.getUniformLocation(program, 'uHueInfluenceTargetChroma'),
    uHueInfluenceStrength: gl.getUniformLocation(program, 'uHueInfluenceStrength'),
    uHueInfluenceChromaScale: gl.getUniformLocation(program, 'uHueInfluenceChromaScale'),
    uHueInfluenceShadowChromaScale: gl.getUniformLocation(program, 'uHueInfluenceShadowChromaScale'),
    uHueInfluenceHighlightChromaScale: gl.getUniformLocation(program, 'uHueInfluenceHighlightChromaScale'),
    uHueInfluenceChromaPivot: gl.getUniformLocation(program, 'uHueInfluenceChromaPivot'),
    uHueInfluenceNeutralRecovery: gl.getUniformLocation(program, 'uHueInfluenceNeutralRecovery'),
    uHueInfluenceNeutralThreshold: gl.getUniformLocation(program, 'uHueInfluenceNeutralThreshold'),
    uHueInfluenceTonalRegister: gl.getUniformLocation(program, 'uHueInfluenceTonalRegister'),
    uHueInfluenceLightnessContrast: gl.getUniformLocation(program, 'uHueInfluenceLightnessContrast'),
    uHueInfluenceInkUnity: gl.getUniformLocation(program, 'uHueInfluenceInkUnity'),
    uHueInfluenceCounterpointWidth: gl.getUniformLocation(program, 'uHueInfluenceCounterpointWidth'),
    uHueInfluenceCounterpointFalloff: gl.getUniformLocation(program, 'uHueInfluenceCounterpointFalloff'),
    uHueInfluenceCounterpointChromaScale: gl.getUniformLocation(program, 'uHueInfluenceCounterpointChromaScale'),
    uHueInfluenceCounterpointChromaFloor: gl.getUniformLocation(program, 'uHueInfluenceCounterpointChromaFloor'),
    uHueInfluenceDitherStrength: gl.getUniformLocation(program, 'uHueInfluenceDitherStrength'),
    uMetalLuminanceEnabled: gl.getUniformLocation(program, 'uMetalLuminanceEnabled'),
    uMetalInputBlackPoint: gl.getUniformLocation(program, 'uMetalInputBlackPoint'),
    uMetalInputWhitePoint: gl.getUniformLocation(program, 'uMetalInputWhitePoint'),
    uMetalGamma: gl.getUniformLocation(program, 'uMetalGamma'),
    uMetalBaseDarkness: gl.getUniformLocation(program, 'uMetalBaseDarkness'),
    uMetalContrast: gl.getUniformLocation(program, 'uMetalContrast'),
    uMetalBodyPoint: gl.getUniformLocation(program, 'uMetalBodyPoint'),
    uMetalHighlightKnee: gl.getUniformLocation(program, 'uMetalHighlightKnee'),
    uMetalHighlightGain: gl.getUniformLocation(program, 'uMetalHighlightGain'),
    uMetalShadowColor: gl.getUniformLocation(program, 'uMetalShadowColor'),
    uMetalBodyColor: gl.getUniformLocation(program, 'uMetalBodyColor'),
    uMetalHighlightColor: gl.getUniformLocation(program, 'uMetalHighlightColor'),
  };
}

export function resolveGradientCanvasBufferSize(canvas: HTMLCanvasElement, config: SliderGradientConfig) {
  const rect = canvas.getBoundingClientRect();
  const cssWidth = Math.max(1, Math.round(canvas.offsetWidth || rect.width || 1));
  const cssHeight = Math.max(1, Math.round(canvas.offsetHeight || rect.height || 1));
  const resolved = resolveProceduralColorResolution({
    configuredResolution: config.shaderColorResolution,
    viewportWidth: cssWidth,
    viewportHeight: cssHeight,
    devicePixelRatio: window.devicePixelRatio || 1,
    visualSizeVmin: 100,
    faceReach: 1,
  });
  const bufferScale = resolved.resolution / Math.max(1, Math.min(cssWidth, cssHeight));

  return {
    width: Math.max(1, Math.round(cssWidth * bufferScale)),
    height: Math.max(1, Math.round(cssHeight * bufferScale)),
  };
}

export function applySliderGradientUniforms({
  gl,
  gradientProgram,
  slide,
  motionValues,
  config,
  shaderTime,
  settledDriftTime,
  settledDriftInfluence,
  width,
  height,
  paletteEnabled = false,
  paletteChromaDuck = 0,
  paletteValueRig = 0,
  paletteSeed,
  paletteHueOffset,
  paletteOffsetX,
  paletteSaturation = 1,
  paletteBrightness = 1,
  paletteContrast = 1,
  paletteSoftness = 0,
  hueInfluenceEnabled = false,
  hueInfluenceMix = 0,
  hueInfluenceTargetRadians = 0,
  hueInfluenceTargetChroma = 0,
  hueInfluenceStrength = 0,
  hueInfluenceChromaScale = 1,
  hueInfluenceShadowChromaScale = 1,
  hueInfluenceHighlightChromaScale = 1,
  hueInfluenceChromaPivot = 0.52,
  hueInfluenceNeutralRecovery = 0,
  hueInfluenceNeutralThreshold = 0.08,
  hueInfluenceTonalRegister = 0,
  hueInfluenceLightnessContrast = 1,
  hueInfluenceInkUnity = 0,
  hueInfluenceCounterpointWidthRadians = Math.PI / 10,
  hueInfluenceCounterpointFalloff = 4,
  hueInfluenceCounterpointChromaScale = 1,
  hueInfluenceCounterpointChromaFloor = 0,
  hueInfluenceDitherStrength = 0,
  meshGeometryEnabled = false,
  domainCurveBoost = 0,
  bandCurveBoost = 0,
  hologramOffsetX = 0,
  hologramOffsetY = 0,
  hologramHueShift = 0,
  hologramSaturationBoost = 0,
  hologramBrightnessBoost = 0,
  outputTreatment = DEFAULT_GRADIENT_OUTPUT_TREATMENT,
  outputTreatmentInteractionStrength = 0,
}: {
  gl: WebGLRenderingContext;
  gradientProgram: GradientProgram;
  slide: SliderSlide;
  motionValues: LiquidSliderMotionValues;
  config: SliderGradientConfig;
  shaderTime: number;
  settledDriftTime: number;
  settledDriftInfluence: number;
  width: number;
  height: number;
  paletteEnabled?: boolean;
  paletteChromaDuck?: number;
  paletteValueRig?: number;
  paletteSeed?: number;
  paletteHueOffset?: number | null;
  paletteOffsetX?: number | null;
  paletteSaturation?: number;
  paletteBrightness?: number;
  paletteContrast?: number;
  paletteSoftness?: number;
  hueInfluenceEnabled?: boolean;
  hueInfluenceMix?: number;
  hueInfluenceTargetRadians?: number;
  hueInfluenceTargetChroma?: number;
  hueInfluenceStrength?: number;
  hueInfluenceChromaScale?: number;
  hueInfluenceShadowChromaScale?: number;
  hueInfluenceHighlightChromaScale?: number;
  hueInfluenceChromaPivot?: number;
  hueInfluenceNeutralRecovery?: number;
  hueInfluenceNeutralThreshold?: number;
  hueInfluenceTonalRegister?: number;
  hueInfluenceLightnessContrast?: number;
  hueInfluenceInkUnity?: number;
  hueInfluenceCounterpointWidthRadians?: number;
  hueInfluenceCounterpointFalloff?: number;
  hueInfluenceCounterpointChromaScale?: number;
  hueInfluenceCounterpointChromaFloor?: number;
  hueInfluenceDitherStrength?: number;
  meshGeometryEnabled?: boolean;
  domainCurveBoost?: number;
  bandCurveBoost?: number;
  // Hover-hologram deltas (scattered mode, pointer devices) — precomputed by
  // the caller from the card's own tilt signal (see LiquidGradientAdapter),
  // in the same raw units as the drag-driven motionValues.gradientX/Y and
  // config.shaderColorHueOffset/shaderColorSaturation/shaderColorBrightness
  // they're composed alongside, so they fold into the exact same clamp
  // expressions rather than needing their own.
  hologramOffsetX?: number;
  hologramOffsetY?: number;
  hologramHueShift?: number;
  hologramSaturationBoost?: number;
  hologramBrightnessBoost?: number;
  outputTreatment?: GradientOutputTreatment;
  outputTreatmentInteractionStrength?: number;
}) {
  const intensity = clamp(motionValues.gradientIntensity, 0, 1);
  const displacementScale = 1 / Math.max(220, Math.min(width, height));

  gl.uniform1f(gradientProgram.uTime, shaderTime);
  gl.uniform2f(gradientProgram.uResolution, width, height);
  gl.uniform1f(gradientProgram.uVariation, clamp(config.shaderColorVariation + slide.variationBias + intensity * 0.055, 0, 0.4));
  gl.uniform1f(gradientProgram.uSaturation, clamp((config.shaderColorSaturation + intensity * 0.18 + hologramSaturationBoost) * paletteSaturation, 0, 2.5));
  gl.uniform1f(gradientProgram.uBrightness, clamp((config.shaderColorBrightness + motionValues.settlingIntensity * 0.08 + hologramBrightnessBoost) * paletteBrightness, 0.3, 1.8));
  gl.uniform1f(gradientProgram.uScale, clamp(config.shaderColorScale * (1 + (motionValues.gradientStretch - 1) * 1.8), 0.5, 4));
  gl.uniform1f(gradientProgram.uSeed, (config.seed + (paletteSeed ?? slide.seed)) * 1000);
  gl.uniform1f(gradientProgram.uRandomness, clamp(config.shaderColorRandomness + motionValues.gradientDistortion * 0.12, 0, 1));
  gl.uniform2f(
    gradientProgram.uOffset,
    // The shader samples `st + uOffset`, so the visual movement is inverse.
    // Inverting here keeps normalized gradientX semantic: negative means left.
    // Window mode replaces the slide's stored offset with its deterministic
    // window position in the shared field. hologramOffsetX/Y are folded into
    // the same drag-displacement term (and the same inversion/scale) rather
    // than composed separately, so a hover-tilt and a drag never fight over
    // two independently-scaled offsets.
    (paletteOffsetX ?? slide.offsetX) - (motionValues.gradientX + hologramOffsetX) * displacementScale,
    slide.offsetY - (motionValues.gradientY + hologramOffsetY) * displacementScale,
  );
  gl.uniform1f(gradientProgram.uHueOffset, clamp(config.shaderColorHueOffset + (paletteHueOffset ?? slide.hueOffset) + motionValues.velocity * 0.012 + hologramHueShift, -0.36, 0.36));
  gl.uniform1f(gradientProgram.uMorph, clamp(config.shaderColorMorph + intensity * 0.42 + Math.abs(motionValues.progress) * 0.18, 0, 1.45));
  gl.uniform1f(gradientProgram.uShimmer, clamp(config.shaderColorShimmer + motionValues.settlingIntensity * 0.34, 0, 1.5));
  gl.uniform1f(gradientProgram.uPulse, clamp(config.shaderColorPulse + intensity * 0.46, 0, 1.5));
  const journalMeshGeometryEnabled =
    meshGeometryEnabled && outputTreatment.mode === 'color';
  gl.uniform1f(
    gradientProgram.uMeshGeometryEnabled,
    journalMeshGeometryEnabled ? 1 : 0,
  );
  gl.uniform1f(
    gradientProgram.uDomainCurveBoost,
    journalMeshGeometryEnabled ? clamp(domainCurveBoost, 0, 1) : 0,
  );
  gl.uniform1f(
    gradientProgram.uBandCurveBoost,
    journalMeshGeometryEnabled ? clamp(bandCurveBoost, 0, 1) : 0,
  );
  gl.uniform1f(gradientProgram.uColorSoftness, clamp(config.shaderColorSoftness + paletteSoftness, 0, 1));
  gl.uniform1f(gradientProgram.uVerticalRichness, clamp(config.shaderColorVerticalRichness, 0, 1));
  gl.uniform1f(gradientProgram.uSettledDriftTime, settledDriftTime);
  gl.uniform1f(
    gradientProgram.uSettledDriftAmount,
    clamp(config.shaderSettledDriftAmount, 0, 1) * clamp(settledDriftInfluence, 0, 1),
  );
  gl.uniform1f(gradientProgram.uSettledDriftOrganic, clamp(config.shaderSettledDriftOrganic, 0, 1));
  gl.uniform1f(gradientProgram.uPaletteEnabled, paletteEnabled ? 1 : 0);
  gl.uniform1f(gradientProgram.uChromaDuck, clamp(paletteChromaDuck, 0, 1));
  gl.uniform1f(gradientProgram.uValueRig, clamp(paletteValueRig, 0, 1));
  gl.uniform1f(gradientProgram.uMasterContrast, clamp(paletteContrast, 0, 2));
  gl.uniform1f(gradientProgram.uBellStrokeWidth, clamp(config.shaderBellStrokeWidth, 0, 1));
  gl.uniform1f(gradientProgram.uBellStrokeIntensity, clamp(config.shaderBellStrokeIntensity, 0, 1));
  gl.uniform1f(
    gradientProgram.uHueInfluenceEnabled,
    hueInfluenceEnabled ? 1 : 0,
  );
  gl.uniform1f(
    gradientProgram.uHueInfluenceMix,
    clamp(hueInfluenceMix, 0, 1),
  );
  gl.uniform1f(
    gradientProgram.uHueInfluenceTargetHue,
    // Keep the operator-selected hue family as a stable grading anchor.
    // Hover still rotates the procedural source field through uHueOffset;
    // shifting this target as well used to move blue by up to ±57.6° and
    // made a fully tilted card read purple. The perceptual grade now absorbs
    // that source movement according to its configured strength, preserving
    // iridescent motion without changing the chosen family itself.
    hueInfluenceTargetRadians,
  );
  gl.uniform1f(
    gradientProgram.uHueInfluenceTargetChroma,
    clamp(hueInfluenceTargetChroma, 0, 0.4),
  );
  gl.uniform1f(
    gradientProgram.uHueInfluenceStrength,
    clamp(hueInfluenceStrength, 0, 1),
  );
  gl.uniform1f(
    gradientProgram.uHueInfluenceChromaScale,
    clamp(hueInfluenceChromaScale, 0, 1.75),
  );
  gl.uniform1f(
    gradientProgram.uHueInfluenceShadowChromaScale,
    clamp(hueInfluenceShadowChromaScale, 0, 2),
  );
  gl.uniform1f(
    gradientProgram.uHueInfluenceHighlightChromaScale,
    clamp(hueInfluenceHighlightChromaScale, 0, 2),
  );
  gl.uniform1f(
    gradientProgram.uHueInfluenceChromaPivot,
    clamp(hueInfluenceChromaPivot, 0.15, 0.85),
  );
  gl.uniform1f(
    gradientProgram.uHueInfluenceNeutralRecovery,
    clamp(hueInfluenceNeutralRecovery, 0, 1),
  );
  gl.uniform1f(
    gradientProgram.uHueInfluenceNeutralThreshold,
    clamp(hueInfluenceNeutralThreshold, 0.01, 0.2),
  );
  gl.uniform1f(
    gradientProgram.uHueInfluenceTonalRegister,
    clamp(hueInfluenceTonalRegister, -1, 1),
  );
  gl.uniform1f(
    gradientProgram.uHueInfluenceLightnessContrast,
    clamp(hueInfluenceLightnessContrast, 0.5, 1.5),
  );
  gl.uniform1f(
    gradientProgram.uHueInfluenceInkUnity,
    clamp(hueInfluenceInkUnity, 0, 1),
  );
  gl.uniform1f(
    gradientProgram.uHueInfluenceCounterpointWidth,
    clamp(hueInfluenceCounterpointWidthRadians, 0, Math.PI * 2 / 3),
  );
  gl.uniform1f(
    gradientProgram.uHueInfluenceCounterpointFalloff,
    clamp(hueInfluenceCounterpointFalloff, 0.5, 10),
  );
  gl.uniform1f(
    gradientProgram.uHueInfluenceCounterpointChromaScale,
    clamp(hueInfluenceCounterpointChromaScale, 0, 1.5),
  );
  gl.uniform1f(
    gradientProgram.uHueInfluenceCounterpointChromaFloor,
    clamp(hueInfluenceCounterpointChromaFloor, 0, 1.25),
  );
  gl.uniform1f(
    gradientProgram.uHueInfluenceDitherStrength,
    clamp(hueInfluenceDitherStrength, 0, 1),
  );
  const metalTreatment =
    outputTreatment.mode === 'metal-luminance' ? outputTreatment : null;
  gl.uniform1f(
    gradientProgram.uMetalLuminanceEnabled,
    metalTreatment ? 1 : 0,
  );
  if (metalTreatment) {
    gl.uniform1f(
      gradientProgram.uMetalInputBlackPoint,
      clamp(metalTreatment.inputBlackPoint, 0, 1),
    );
    gl.uniform1f(
      gradientProgram.uMetalInputWhitePoint,
      clamp(metalTreatment.inputWhitePoint, 0, 1),
    );
    gl.uniform1f(
      gradientProgram.uMetalGamma,
      clamp(metalTreatment.gamma, 0.05, 4),
    );
    gl.uniform1f(
      gradientProgram.uMetalBaseDarkness,
      clamp(metalTreatment.baseDarkness, 0, 1),
    );
    gl.uniform1f(
      gradientProgram.uMetalContrast,
      clamp(
        metalTreatment.baseContrast +
          clamp(outputTreatmentInteractionStrength, 0, 1) *
            metalTreatment.interactionContrastBoost,
        0.05,
        4,
      ),
    );
    gl.uniform1f(
      gradientProgram.uMetalBodyPoint,
      clamp(metalTreatment.bodyPoint, 0.05, 0.95),
    );
    gl.uniform1f(
      gradientProgram.uMetalHighlightKnee,
      clamp(metalTreatment.highlightKnee, 0, 1),
    );
    gl.uniform1f(
      gradientProgram.uMetalHighlightGain,
      clamp(metalTreatment.highlightGain, 0, 1),
    );
    gl.uniform3f(
      gradientProgram.uMetalShadowColor,
      ...metalTreatment.shadowColor,
    );
    gl.uniform3f(
      gradientProgram.uMetalBodyColor,
      ...metalTreatment.bodyColor,
    );
    gl.uniform3f(
      gradientProgram.uMetalHighlightColor,
      ...metalTreatment.highlightColor,
    );
  }
  if (gradientProgram.uPalette) gl.uniform1i(gradientProgram.uPalette, 0);
}
