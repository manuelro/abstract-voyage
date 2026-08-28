export type ProceduralColorUniformName =
  | 'uTime'
  | 'uResolution'
  | 'uVariation'
  | 'uSaturation'
  | 'uBrightness'
  | 'uScale'
  | 'uSeed'
  | 'uRandomness'
  | 'uOffset'
  | 'uHueOffset'
  | 'uMorph'
  | 'uShimmer'
  | 'uPulse';

export type ProceduralColorUniforms = {
  time: number;
  resolution: [number, number];
  variation: number;
  saturation: number;
  brightness: number;
  scale: number;
  seed: number;
  randomness: number;
  offset: [number, number];
  hueOffset: number;
  morph: number;
  shimmer: number;
  pulse: number;
};

export const PROCEDURAL_COLOR_REQUIRED_UNIFORMS: Array<{
  name: ProceduralColorUniformName;
  type: 'float' | 'vec2';
}> = [
  { name: 'uTime', type: 'float' },
  { name: 'uResolution', type: 'vec2' },
  { name: 'uVariation', type: 'float' },
  { name: 'uSaturation', type: 'float' },
  { name: 'uBrightness', type: 'float' },
  { name: 'uScale', type: 'float' },
  { name: 'uSeed', type: 'float' },
  { name: 'uRandomness', type: 'float' },
  { name: 'uOffset', type: 'vec2' },
  { name: 'uHueOffset', type: 'float' },
  { name: 'uMorph', type: 'float' },
  { name: 'uShimmer', type: 'float' },
  { name: 'uPulse', type: 'float' },
];

export const PROCEDURAL_COLOR_VERTEX_SOURCE = `
  attribute vec2 aVertexPosition;

  void main() {
    gl_Position = vec4(aVertexPosition, 0.0, 1.0);
  }
`;

type ProceduralColorFragmentOptions = {
  paletteGuard?: boolean;
};

const PALETTE_GUARD_UNIFORMS = `
  uniform float uPaletteGuardAmount;
  uniform float uPaletteGuardLayerPhase;
  uniform float uPalettePhase;
`;

export function createProceduralColorFragmentSource({
  paletteGuard = false,
}: ProceduralColorFragmentOptions = {}) {
  return `
  precision mediump float;

  uniform float uTime;
  uniform vec2 uResolution;
  uniform float uVariation;
  uniform float uSaturation;
  uniform float uBrightness;
  uniform float uScale;
  uniform float uSeed;
  uniform float uRandomness;
  uniform vec2 uOffset;
  uniform float uHueOffset;
  uniform float uMorph;
  uniform float uShimmer;
  uniform float uPulse;
  ${paletteGuard ? PALETTE_GUARD_UNIFORMS : ''}

  vec3 rainbowColor(float t) {
    float r = 0.5 + 0.5 * cos(6.28318 * (t + 0.0));
    float g = 0.5 + 0.5 * cos(6.28318 * (t + 0.3333));
    float b = 0.5 + 0.5 * cos(6.28318 * (t + 0.6666));
    return vec3(r, g, b);
  }

  vec3 applySaturation(vec3 color, float saturation) {
    float luminance = dot(color, vec3(0.299, 0.587, 0.114));
    vec3 gray = vec3(luminance);
    float safeSaturation = clamp(saturation, 0.0, 2.5);
    float chromaAmount = safeSaturation <= 1.0
      ? safeSaturation
      : 1.0 + (safeSaturation - 1.0) * 2.2;

    return clamp(gray + (color - gray) * chromaAmount, 0.0, 1.0);
  }

  void main() {
    vec2 st = gl_FragCoord.xy / uResolution.xy;
    st = (st - 0.5) / max(uScale, 0.001) + 0.5 + uOffset;
    float morph = clamp(uMorph, 0.0, 1.5);
    float shimmer = clamp(uShimmer, 0.0, 1.5);
    float pulse = clamp(uPulse, 0.0, 1.5);

    vec2 c = st - 0.5;
    float audioWarp = morph * 0.055 + pulse * 0.018;
    float ang = uRandomness * (uTime * 0.021 + 0.35 * sin(uTime * 0.0413 + uSeed)) +
      morph * 0.18 * sin(uTime * 0.113 + uSeed * 0.7);
    float cs = cos(ang), sn = sin(ang);
    c = mat2(cs, -sn, sn, cs) * c;
    c.x += (uRandomness * 0.06 + audioWarp) * sin(uTime * 0.037 + uSeed * 1.7 + c.y * 6.2831);
    c.y += (uRandomness * 0.06 + audioWarp * 0.78) * sin(uTime * 0.029 + uSeed * 2.3 + c.x * 6.2831);
    st = c + 0.5;

    float hueDrift = uHueOffset + ${paletteGuard ? 'uPalettePhase +' : ''} uRandomness * (
      0.13 * sin(uTime * 0.371 + uSeed) +
      0.09 * sin(uTime * 0.234 + uSeed * 1.7) +
      0.05 * sin(uTime * 0.157 + uSeed * 2.9)
    ) + shimmer * 0.018 * sin(uTime * 0.83 + st.x * 6.2831 + st.y * 3.1415);

    float slowTime = uTime / 2.0;

    float guardAmount = ${paletteGuard ? 'clamp(uPaletteGuardAmount, 0.0, 1.0)' : '0.0'};
    float guardLayerPhase = ${paletteGuard ? 'uPaletteGuardLayerPhase' : '0.0'};
    float guardPhaseSpread = guardAmount * 0.24;
    vec3 horizontalVoice = rainbowColor(
      st.x + uVariation * 0.10 + hueDrift + morph * 0.035 * (st.y - 0.5) -
        guardPhaseSpread - guardLayerPhase
    );
    vec3 verticalVoice = rainbowColor(
      st.y + 0.3333 + uVariation * 0.075 + hueDrift - morph * 0.028 * (st.x - 0.5) +
        guardPhaseSpread - guardLayerPhase
    );
    vec3 temporalVoice = rainbowColor(
      slowTime * 0.5 + 0.5 + uVariation * 0.12 + hueDrift + pulse * 0.025 +
        guardAmount * 0.5 + guardLayerPhase * 0.5
    );
    float temporalWeight = 1.0 - guardAmount * 0.58;
    vec3 color = (
      horizontalVoice + verticalVoice + temporalVoice * temporalWeight
    ) / (2.0 + temporalWeight);

    color = applySaturation(color, uSaturation);
    color *= uBrightness;

    gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
  }
`;
}

export const PROCEDURAL_COLOR_FRAGMENT_SOURCE = createProceduralColorFragmentSource();

export const ABSTRACT_LEGACY_PALETTE_GUARD_FRAGMENT_SOURCE =
  createProceduralColorFragmentSource({ paletteGuard: true });

export function createDefaultProceduralColorUniforms(): ProceduralColorUniforms {
  return {
    time: 0,
    resolution: [1, 1],
    variation: 0,
    saturation: 1,
    brightness: 1,
    scale: 1,
    seed: 0,
    randomness: 0,
    offset: [0, 0],
    hueOffset: 0,
    morph: 0,
    shimmer: 0,
    pulse: 0,
  };
}
