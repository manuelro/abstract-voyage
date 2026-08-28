import {
  PROCEDURAL_COLOR_FRAGMENT_SOURCE,
} from '../../../../../helpers/proceduralColorShader';
import { GRADIENT_LAYER_BLEED } from '../config/legacy';

export const SLIDER_PROCEDURAL_COLOR_FRAGMENT_SOURCE = PROCEDURAL_COLOR_FRAGMENT_SOURCE
  .replace(
    '  uniform float uPulse;',
    '  uniform float uPulse;\n  uniform float uMeshGeometryEnabled;\n  uniform float uDomainCurveBoost;\n  uniform float uBandCurveBoost;\n  uniform float uColorSoftness;\n  uniform float uVerticalRichness;\n  uniform float uSettledDriftTime;\n  uniform float uSettledDriftAmount;\n  uniform float uSettledDriftOrganic;\n  uniform sampler2D uPalette;\n  uniform float uPaletteEnabled;\n  uniform float uChromaDuck;\n  uniform float uValueRig;\n  uniform float uMasterContrast;\n  uniform float uBellStrokeWidth;\n  uniform float uBellStrokeIntensity;\n  uniform float uHueInfluenceEnabled;\n  uniform float uHueInfluenceMix;\n  uniform float uHueInfluenceTargetHue;\n  uniform float uHueInfluenceTargetChroma;\n  uniform float uHueInfluenceStrength;\n  uniform float uHueInfluenceChromaScale;\n  uniform float uHueInfluenceShadowChromaScale;\n  uniform float uHueInfluenceHighlightChromaScale;\n  uniform float uHueInfluenceChromaPivot;\n  uniform float uHueInfluenceNeutralRecovery;\n  uniform float uHueInfluenceNeutralThreshold;\n  uniform float uHueInfluenceTonalRegister;\n  uniform float uHueInfluenceLightnessContrast;\n  uniform float uHueInfluenceInkUnity;\n  uniform float uHueInfluenceCounterpointWidth;\n  uniform float uHueInfluenceCounterpointFalloff;\n  uniform float uHueInfluenceCounterpointChromaScale;\n  uniform float uHueInfluenceCounterpointChromaFloor;\n  uniform float uHueInfluenceDitherStrength;\n  uniform float uMetalLuminanceEnabled;\n  uniform float uMetalInputBlackPoint;\n  uniform float uMetalInputWhitePoint;\n  uniform float uMetalGamma;\n  uniform float uMetalBaseDarkness;\n  uniform float uMetalContrast;\n  uniform float uMetalBodyPoint;\n  uniform float uMetalHighlightKnee;\n  uniform float uMetalHighlightGain;\n  uniform vec3 uMetalShadowColor;\n  uniform vec3 uMetalBodyColor;\n  uniform vec3 uMetalHighlightColor;',
  )
  // Geometry-only journal shaping. The original domain warp executes first,
  // unchanged; the opt-in branch adds a bounded copy of the same wave. This
  // increases displacement without introducing a new frequency, phase, or
  // color trajectory. Zero/disabled therefore keeps the original operations.
  .replace(
    `    c.x += (uRandomness * 0.06 + audioWarp) * sin(uTime * 0.037 + uSeed * 1.7 + c.y * 6.2831);
    c.y += (uRandomness * 0.06 + audioWarp * 0.78) * sin(uTime * 0.029 + uSeed * 2.3 + c.x * 6.2831);`,
    `    float domainCurveBoost = uMeshGeometryEnabled > 0.5
      ? clamp(uDomainCurveBoost, 0.0, 1.0)
      : 0.0;
    float domainWaveX = sin(uTime * 0.037 + uSeed * 1.7 + c.y * 6.2831);
    float domainAmplitudeX = uRandomness * 0.06 + audioWarp;
    c.x += domainAmplitudeX * domainWaveX;
    if (domainCurveBoost > 0.0) {
      c.x += domainAmplitudeX * domainWaveX * domainCurveBoost * 0.65;
    }
    float domainWaveY = sin(uTime * 0.029 + uSeed * 2.3 + c.x * 6.2831);
    float domainAmplitudeY = uRandomness * 0.06 + audioWarp * 0.78;
    c.y += domainAmplitudeY * domainWaveY;
    if (domainCurveBoost > 0.0) {
      c.y += domainAmplitudeY * domainWaveY * domainCurveBoost * 0.65;
    }`,
  )
  // Directed Chord palette: when enabled, every colour lookup samples the
  // card's cyclic chord LUT instead of the full-wheel cosine rainbow. All call
  // sites (base field, vertical richness waves, softness taps) inherit the
  // constraint, so the field keeps its full geometric richness but can only
  // speak chord tones. Disabled ⇒ byte-for-byte legacy output.
  .replace(
    `    return vec3(r, g, b);
  }`,
    `    vec3 wheel = vec3(r, g, b);
    if (uPaletteEnabled < 0.5) return wheel;
    return texture2D(uPalette, vec2(fract(t), 0.5)).rgb;
  }`,
  )
  // Inactive chroma duck (ensemble sidechain) + value rig: calm/dark text zone
  // top-left graduating to the most luminous corner lower-right — the shared
  // "key light" that stages every card identically. Both no-ops at 0. The
  // canvas bleeds past the card (GRADIENT_LAYER_BLEED per side), so canvas UVs
  // are remapped to the visible card window before shading.
  .replace(
    `    color = applySaturation(color, uSaturation);
    color *= uBrightness;`,
    `    color = applySaturation(color, uSaturation * (1.0 - clamp(uChromaDuck, 0.0, 1.0)));
    color *= uBrightness;
    color = mix(vec3(0.5), color, clamp(uMasterContrast, 0.0, 2.0));
    vec2 rigUv = clamp(
      (gl_FragCoord.xy / uResolution.xy - vec2(GRADIENT_RIG_INSET)) / GRADIENT_RIG_SPAN,
      0.0,
      1.0
    );
    float rigT = clamp((rigUv.x * 0.6 + (1.0 - rigUv.y) * 0.7) / 1.3, 0.0, 1.0);
    color *= mix(1.0, mix(0.72, 1.10, smoothstep(0.0, 1.0, rigT)), clamp(uValueRig, 0.0, 1.0));`,
  )
  .replace(
    '  void main() {',
    `  float sliderSrgbChannelToLinear(float channel) {
    return channel <= 0.04045
      ? channel / 12.92
      : pow((channel + 0.055) / 1.055, 2.4);
  }

  float sliderLinearChannelToSrgb(float channel) {
    return channel <= 0.0031308
      ? channel * 12.92
      : 1.055 * pow(channel, 1.0 / 2.4) - 0.055;
  }

  vec3 sliderSrgbToLinear(vec3 color) {
    return vec3(
      sliderSrgbChannelToLinear(color.r),
      sliderSrgbChannelToLinear(color.g),
      sliderSrgbChannelToLinear(color.b)
    );
  }

  vec3 sliderLinearToSrgb(vec3 color) {
    return vec3(
      sliderLinearChannelToSrgb(color.r),
      sliderLinearChannelToSrgb(color.g),
      sliderLinearChannelToSrgb(color.b)
    );
  }

  float hueInfluenceSignedCbrt(float value) {
    return sign(value) * pow(abs(value), 1.0 / 3.0);
  }

  vec3 hueInfluenceLinearToOklab(vec3 color) {
    float l = hueInfluenceSignedCbrt(
      0.4122214708 * color.r + 0.5363325363 * color.g + 0.0514459929 * color.b
    );
    float m = hueInfluenceSignedCbrt(
      0.2119034982 * color.r + 0.6806995451 * color.g + 0.1073969566 * color.b
    );
    float s = hueInfluenceSignedCbrt(
      0.0883024619 * color.r + 0.2817188376 * color.g + 0.6299787005 * color.b
    );
    return vec3(
      0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
      1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
      0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s
    );
  }

  vec3 hueInfluenceOklabToLinear(vec3 color) {
    float l = color.x + 0.3963377774 * color.y + 0.2158037573 * color.z;
    float m = color.x - 0.1055613458 * color.y - 0.0638541728 * color.z;
    float s = color.x - 0.0894841775 * color.y - 1.2914855480 * color.z;
    l = l * l * l;
    m = m * m * m;
    s = s * s * s;
    return vec3(
      4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
      -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
      -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s
    );
  }

  bool hueInfluenceLinearInGamut(vec3 color) {
    return all(greaterThanEqual(color, vec3(0.0))) &&
      all(lessThanEqual(color, vec3(1.0)));
  }

  float hueInfluenceShortestAngle(float angle) {
    return atan(sin(angle), cos(angle));
  }

  float hueInfluenceSmoothMaximum(
    float leftValue,
    float rightValue,
    float softness
  ) {
    if (rightValue <= 0.0) return leftValue;
    float width = max(0.000001, softness);
    float amount = clamp(
      0.5 + 0.5 * (leftValue - rightValue) / width,
      0.0,
      1.0
    );
    return mix(rightValue, leftValue, amount) +
      width * amount * (1.0 - amount);
  }

  vec3 applyPerceptualHueInfluence(vec3 sourceColor) {
    vec3 sourceLinear = sliderSrgbToLinear(clamp(sourceColor, 0.0, 1.0));
    vec3 sourceLab = hueInfluenceLinearToOklab(sourceLinear);
    float sourceChroma = length(sourceLab.yz);
    float neutralRecovery = clamp(uHueInfluenceNeutralRecovery, 0.0, 1.0);
    if (sourceChroma < 0.00001 && neutralRecovery <= 0.0) {
      return sourceColor;
    }

    float neutralThreshold = clamp(
      uHueInfluenceNeutralThreshold,
      0.01,
      0.2
    );
    float neutralMask =
      1.0 - smoothstep(0.0, neutralThreshold, sourceChroma);
    float sourceHue = sourceChroma < 0.00001
      ? uHueInfluenceTargetHue
      : atan(sourceLab.z, sourceLab.y);
    float hueDelta = hueInfluenceShortestAngle(
      sourceHue - uHueInfluenceTargetHue
    );
    const float PI = 3.14159265359;
    float gradeMix = clamp(uHueInfluenceMix, 0.0, 1.0);
    float antipodeFeather = max(
      0.0001,
      clamp(uHueInfluenceCounterpointWidth, 0.0, PI * 0.66666667)
    );
    float counterpointFeather = smoothstep(
      PI - antipodeFeather,
      PI,
      abs(hueDelta)
    );
    float sourceCounterpointRetention = pow(
      counterpointFeather,
      clamp(uHueInfluenceCounterpointFalloff, 0.5, 10.0)
    );
    float neutralRecoveryMix =
      neutralMask * neutralRecovery * gradeMix;
    float counterpointRetention =
      sourceCounterpointRetention * (1.0 - neutralRecoveryMix);
    float effectiveStrength =
      clamp(uHueInfluenceStrength, 0.0, 1.0) *
      gradeMix *
      (1.0 - counterpointRetention);
    float influencedHue =
      uHueInfluenceTargetHue + hueDelta * (1.0 - effectiveStrength);
    float outputHue =
      uHueInfluenceTargetHue +
      hueInfluenceShortestAngle(
        influencedHue - uHueInfluenceTargetHue
      ) *
      (1.0 - neutralRecoveryMix);
    vec2 hueDirection = vec2(cos(outputHue), sin(outputHue));
    float chromaPivot = clamp(uHueInfluenceChromaPivot, 0.15, 0.85);
    float tonalWeight = smoothstep(
      chromaPivot - 0.16,
      chromaPivot + 0.16,
      sourceLab.x
    );
    float tonalChromaScale = mix(
      clamp(uHueInfluenceShadowChromaScale, 0.0, 2.0),
      clamp(uHueInfluenceHighlightChromaScale, 0.0, 2.0),
      tonalWeight
    );
    float counterpointChromaScale = mix(
      1.0,
      clamp(uHueInfluenceCounterpointChromaScale, 0.0, 1.5),
      counterpointRetention
    );
    float targetChroma =
      sourceChroma *
      clamp(uHueInfluenceChromaScale, 0.0, 1.75) *
      tonalChromaScale *
      counterpointChromaScale;
    const float INK_LIGHTNESS = 0.19848877943;
    const float INK_CHROMA = 0.05938238158;
    float inkUnity = clamp(uHueInfluenceInkUnity, 0.0, 1.0);
    targetChroma = mix(targetChroma, INK_CHROMA, inkUnity);
    float requestedChroma = mix(sourceChroma, targetChroma, gradeMix);
    float registeredLightness =
      sourceLab.x + clamp(uHueInfluenceTonalRegister, -1.0, 1.0) * 0.18;
    float contrastedLightness =
      0.5 +
      (registeredLightness - 0.5) *
      clamp(uHueInfluenceLightnessContrast, 0.5, 1.5);
    float targetLightness = mix(
      contrastedLightness,
      INK_LIGHTNESS,
      inkUnity
    );
    float outputLightness = clamp(
      mix(sourceLab.x, targetLightness, gradeMix),
      0.0,
      1.0
    );
    float shadowRecovery = smoothstep(0.08, 0.3, outputLightness);
    float highlightRecovery =
      1.0 - smoothstep(0.78, 0.96, outputLightness);
    float recoveryChromaFloor =
      clamp(uHueInfluenceTargetChroma, 0.0, 0.4) *
      neutralRecovery *
      gradeMix *
      shadowRecovery *
      highlightRecovery;
    requestedChroma = hueInfluenceSmoothMaximum(
      requestedChroma,
      recoveryChromaFloor,
      0.008
    );
    float counterpointChromaFloor =
      clamp(uHueInfluenceTargetChroma, 0.0, 0.4) *
      clamp(uHueInfluenceCounterpointChromaFloor, 0.0, 1.25) *
      counterpointRetention *
      gradeMix *
      shadowRecovery *
      highlightRecovery;
    requestedChroma = hueInfluenceSmoothMaximum(
      requestedChroma,
      counterpointChromaFloor,
      0.008
    );
    vec3 requestedLinear = hueInfluenceOklabToLinear(vec3(
      outputLightness,
      hueDirection * requestedChroma
    ));

    if (hueInfluenceLinearInGamut(requestedLinear)) {
      return clamp(sliderLinearToSrgb(requestedLinear), 0.0, 1.0);
    }

    float minimumChroma = 0.0;
    float maximumChroma = requestedChroma;
    for (int iteration = 0; iteration < 10; iteration++) {
      float testChroma = (minimumChroma + maximumChroma) * 0.5;
      vec3 testLinear = hueInfluenceOklabToLinear(vec3(
        outputLightness,
        hueDirection * testChroma
      ));
      if (hueInfluenceLinearInGamut(testLinear)) {
        minimumChroma = testChroma;
      } else {
        maximumChroma = testChroma;
      }
    }

    vec3 mappedLinear = hueInfluenceOklabToLinear(vec3(
      outputLightness,
      hueDirection * minimumChroma
    ));
    return clamp(sliderLinearToSrgb(mappedLinear), 0.0, 1.0);
  }

  float hueInfluenceDither(vec2 position) {
    vec2 seededPosition = position + vec2(
      uSeed * 0.013,
      uSeed * 0.017
    );
    return fract(
      52.9829189 * fract(dot(seededPosition, vec2(0.06711056, 0.00583715)))
    ) - 0.5;
  }

  vec3 applyMetalLuminanceTreatment(vec3 sourceColor) {
    vec3 sourceSrgb = clamp(sourceColor, 0.0, 1.0);
    vec3 sourceLinear = sliderSrgbToLinear(sourceSrgb);
    float relativeLuminance = dot(
      sourceLinear,
      vec3(0.2126, 0.7152, 0.0722)
    );
    float perceptualLuminance = sliderLinearChannelToSrgb(relativeLuminance);
    float blackPoint = clamp(uMetalInputBlackPoint, 0.0, 1.0);
    float whitePoint = max(
      blackPoint + 0.0001,
      clamp(uMetalInputWhitePoint, 0.0, 1.0)
    );
    float normalizedLuminance = clamp(
      (perceptualLuminance - blackPoint) / (whitePoint - blackPoint),
      0.0,
      1.0
    );
    float contrastedLuminance = clamp(
      (normalizedLuminance - 0.5) * max(0.05, uMetalContrast) + 0.5,
      0.0,
      1.0
    );
    float shapedLuminance = pow(
      contrastedLuminance,
      max(0.05, uMetalGamma)
    );
    float highlightShoulder =
      smoothstep(clamp(uMetalHighlightKnee, 0.0, 1.0), 1.0, shapedLuminance) *
      clamp(uMetalHighlightGain, 0.0, 1.0);
    float materialPosition = clamp(
      shapedLuminance + highlightShoulder * (1.0 - shapedLuminance),
      0.0,
      1.0
    );
    float bodyPoint = clamp(uMetalBodyPoint, 0.05, 0.95);
    float lowerAmount = smoothstep(0.0, bodyPoint, materialPosition);
    float upperAmount = smoothstep(bodyPoint, 1.0, materialPosition);
    vec3 shadowLinear = sliderSrgbToLinear(clamp(uMetalShadowColor, 0.0, 1.0));
    vec3 bodyLinear = sliderSrgbToLinear(clamp(uMetalBodyColor, 0.0, 1.0));
    vec3 highlightLinear = sliderSrgbToLinear(clamp(uMetalHighlightColor, 0.0, 1.0));
    vec3 materialLinear = mix(shadowLinear, bodyLinear, lowerAmount);
    materialLinear = mix(materialLinear, highlightLinear, upperAmount);
    float darknessStops = (0.5 - clamp(uMetalBaseDarkness, 0.0, 1.0)) * 3.0;
    materialLinear *= exp2(darknessStops);
    return clamp(sliderLinearToSrgb(materialLinear), 0.0, 1.0);
  }

  vec3 sampleSliderProceduralColor(vec2 sampleSt, float hueDrift, float morph, float pulse, float slowTime, float variation, float verticalRichness) {
    vec3 sampleColor = vec3(0.0);
    float bandCurveBoost = uMeshGeometryEnabled > 0.5
      ? clamp(uBandCurveBoost, 0.0, 1.0)
      : 0.0;

    float horizontalPhase =
      sampleSt.x + variation * 0.10 + hueDrift +
      morph * 0.035 * (sampleSt.y - 0.5);
    float verticalPhase =
      sampleSt.y + 0.3333 + variation * 0.075 + hueDrift -
      morph * 0.028 * (sampleSt.x - 0.5);
    if (bandCurveBoost > 0.0) {
      horizontalPhase +=
        morph * 0.035 * (sampleSt.y - 0.5) * bandCurveBoost * 0.85;
      verticalPhase -=
        morph * 0.028 * (sampleSt.x - 0.5) * bandCurveBoost * 0.85;
    }

    sampleColor += rainbowColor(horizontalPhase);
    sampleColor += rainbowColor(verticalPhase);
    sampleColor += rainbowColor(slowTime * 0.5 + 0.5 + variation * 0.12 + hueDrift + pulse * 0.025);

    vec3 baseColor = sampleColor / 3.0;
    float verticalFrequency = mix(1.0, 3.35, verticalRichness);
    float secondaryFrequency = mix(0.72, 2.15, verticalRichness);
    float verticalWave = sampleSt.y * verticalFrequency +
      hueDrift * mix(0.0, 0.48, verticalRichness) +
      morph * 0.055 * sin(sampleSt.x * 6.2831);
    float counterWave = (1.0 - sampleSt.y) * secondaryFrequency +
      0.27 +
      variation * 0.18 -
      hueDrift * mix(0.0, 0.32, verticalRichness) +
      morph * 0.04 * cos(sampleSt.x * 6.2831 + sampleSt.y * 3.1415);
    if (bandCurveBoost > 0.0) {
      verticalWave +=
        morph * 0.055 * sin(sampleSt.x * 6.2831) *
        bandCurveBoost * 0.85;
      counterWave +=
        morph * 0.04 *
        cos(sampleSt.x * 6.2831 + sampleSt.y * 3.1415) *
        bandCurveBoost * 0.85;
    }
    vec3 verticalColor = (
      rainbowColor(verticalWave) +
      rainbowColor(counterWave + 0.3333)
    ) * 0.5;

    return mix(baseColor, mix(baseColor, verticalColor, 0.62), verticalRichness);
  }

  void main() {`,
  )
  .replace(
    `    st = c + 0.5;

    float hueDrift =`,
    `    st = c + 0.5;

    float settledDriftAmount = smoothstep(0.0, 1.0, clamp(uSettledDriftAmount, 0.0, 1.0));
    float settledOrganic = smoothstep(0.0, 1.0, clamp(uSettledDriftOrganic, 0.0, 1.0));
    float settledDriftTime = uSettledDriftTime;
    vec2 biologicalDrift = vec2(
      sin(settledDriftTime * 0.73 + uSeed * 0.013 + c.y * 3.1) +
        0.45 * sin(settledDriftTime * 1.37 + c.x * 5.6 + uSeed * 0.029),
      cos(settledDriftTime * 0.61 + uSeed * 0.017 + c.x * 3.7) +
        0.50 * sin(settledDriftTime * 1.11 + c.y * 5.2 + uSeed * 0.031)
    );
    vec2 cellularDrift = vec2(
      sin((c.x + c.y) * 6.2831 + settledDriftTime * 0.43 + uSeed * 0.007),
      cos((c.x - c.y) * 6.2831 - settledDriftTime * 0.39 + uSeed * 0.011)
    );
    st += (biologicalDrift * 0.022 + cellularDrift * 0.012 * settledOrganic) * settledDriftAmount;
    float settledHueDrift = settledDriftAmount * (
      0.032 * sin(settledDriftTime * 0.47 + st.x * 2.7 + uSeed * 0.019) +
      0.021 * sin(settledDriftTime * 0.29 + st.y * 4.1 + uSeed * 0.023)
    );

    float hueDrift = settledHueDrift +`,
  )
  .replace(
    `    vec3 color = vec3(0.0);
    float slowTime = uTime / 2.0;

    color += rainbowColor(st.x + uVariation * 0.10 + hueDrift + morph * 0.035 * (st.y - 0.5));
    color += rainbowColor(st.y + 0.3333 + uVariation * 0.075 + hueDrift - morph * 0.028 * (st.x - 0.5));
    color += rainbowColor(slowTime * 0.5 + 0.5 + uVariation * 0.12 + hueDrift + pulse * 0.025);
    color /= 3.0;`,
    `    float slowTime = uTime / 2.0;
    float colorSoftness = smoothstep(0.0, 1.0, clamp(uColorSoftness, 0.0, 1.0));
    float verticalRichness = smoothstep(0.0, 1.0, clamp(uVerticalRichness, 0.0, 1.0));
    vec2 colorSoftnessStep = vec2(0.012 + colorSoftness * 0.06, 0.009 + colorSoftness * 0.045);
    // Gaussian bell, richness-preserving domain warp: THE sole mechanism
    // conveying the bell's shape now (the boundary mask/dark-shadow this
    // comment used to describe as a second layer is gone — operator
    // feedback was that the hard cutout should go, keep only the colour).
    // Rather than masking/cropping the mesh into the bell's shape (which
    // would show LESS of its own colour variety wherever the bell narrows —
    // a thin sliver near the tip would only ever sample a thin slice of the
    // noise field), rescale st.x itself around its own centre BEFORE colour
    // is sampled, by how much on-screen width is locally available at this
    // height (bellCurveX). A narrow row therefore still sweeps through the
    // mesh's full periodic colour range, just compressed into less physical
    // space — the bell's shape comes from where colours land on screen and
    // how densely they cycle, not from a light/dark cutoff. 0 intensity is
    // a complete no-op, byte-identical to every other consumer.
    if (uBellStrokeIntensity > 0.0001) {
      vec2 bellWarpUv = clamp(
        (gl_FragCoord.xy / uResolution.xy - vec2(GRADIENT_RIG_INSET)) / GRADIENT_RIG_SPAN,
        0.0,
        1.0
      );
      float bellWarpZ = (bellWarpUv.y - 0.5) * 6.0;
      float bellWarpDensity = exp(-0.5 * bellWarpZ * bellWarpZ);
      float bellWarpCurveX = mix(0.12, 0.85, bellWarpDensity);
      float bellWarpLocalWidth = max(0.02, bellWarpCurveX);
      st.x = (st.x - 0.5) / bellWarpLocalWidth + 0.5;
    }
    vec3 color = sampleSliderProceduralColor(st, hueDrift, morph, pulse, slowTime, uVariation, verticalRichness);
    vec3 softenedColor = color * 0.36;
    softenedColor += sampleSliderProceduralColor(st + colorSoftnessStep, hueDrift, morph, pulse, slowTime, uVariation, verticalRichness) * 0.16;
    softenedColor += sampleSliderProceduralColor(st - colorSoftnessStep, hueDrift, morph, pulse, slowTime, uVariation, verticalRichness) * 0.16;
    softenedColor += sampleSliderProceduralColor(st + vec2(colorSoftnessStep.x, -colorSoftnessStep.y), hueDrift, morph, pulse, slowTime, uVariation, verticalRichness) * 0.16;
    softenedColor += sampleSliderProceduralColor(st + vec2(-colorSoftnessStep.x, colorSoftnessStep.y), hueDrift, morph, pulse, slowTime, uVariation, verticalRichness) * 0.16;
    color = mix(color, softenedColor, colorSoftness);`,
  )
  // Hue influence grades the complete journal field. Metal remains the final
  // material operation and bypasses the hue branch entirely.
  // journal-style RGB field — including hover hue/saturation/brightness,
  // master grading, and value rig — exists first; labs then map that result to
  // dark-metal luminance without replacing the source palette.
  .replace(
    '    gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);',
    `    vec3 outputColor = clamp(color, 0.0, 1.0);
    if (
      uHueInfluenceEnabled > 0.5 &&
      uHueInfluenceMix > 0.00001 &&
      uMetalLuminanceEnabled < 0.5
    ) {
      outputColor = applyPerceptualHueInfluence(outputColor);
      float ditherAmount =
        clamp(uHueInfluenceDitherStrength, 0.0, 1.0) *
        clamp(uHueInfluenceMix, 0.0, 1.0) / 255.0;
      outputColor = clamp(
        outputColor + vec3(hueInfluenceDither(gl_FragCoord.xy) * ditherAmount),
        0.0,
        1.0
      );
    }
    if (uMetalLuminanceEnabled > 0.5) {
      outputColor = applyMetalLuminanceTreatment(outputColor);
    }
    // Gaussian bell: the boundary mask/dark-shadow treatment that used to
    // sit here is gone — operator feedback was that the cutout read as too
    // hard a contrast. The shape is now conveyed entirely by the early
    // domain-warp above (before colour sampling ever runs): it makes the
    // mesh's colour cycle more densely wherever the bell is narrow and
    // closer to its natural rate wherever it's wide, so the distribution
    // comes through in how the colour itself moves, not a light/dark cutoff.
    gl_FragColor = vec4(outputColor, 1.0);`,
  )
  // Bake the card-window remap constants (the canvas bleeds past the card).
  .replace(
    /GRADIENT_RIG_INSET/g,
    (GRADIENT_LAYER_BLEED / (1 + 2 * GRADIENT_LAYER_BLEED)).toFixed(5),
  )
  .replace(
    /GRADIENT_RIG_SPAN/g,
    (1 / (1 + 2 * GRADIENT_LAYER_BLEED)).toFixed(5),
  );
