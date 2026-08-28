import { PROCEDURAL_COLOR_FRAGMENT_SOURCE } from './proceduralColorShader';

const LEGACY_RAINBOW_FUNCTION = `  vec3 rainbowColor(float t) {
    float r = 0.5 + 0.5 * cos(6.28318 * (t + 0.0));
    float g = 0.5 + 0.5 * cos(6.28318 * (t + 0.3333));
    float b = 0.5 + 0.5 * cos(6.28318 * (t + 0.6666));
    return vec3(r, g, b);
  }`;

const GLASS_PALETTE_FUNCTION = `  uniform vec3 uGlassColorA;
  uniform vec3 uGlassColorB;
  uniform vec3 uGlassColorC;
  uniform vec3 uGlassColorD;
  uniform float uGlassGradientAngle;

  vec3 rainbowColor(float t) {
    float position = 1.0 - abs(fract(t * 0.5) * 2.0 - 1.0);
    if (position < 0.333333) {
      return mix(uGlassColorA, uGlassColorB, smoothstep(0.0, 0.333333, position));
    }
    if (position < 0.666667) {
      return mix(uGlassColorB, uGlassColorC, smoothstep(0.333333, 0.666667, position));
    }
    return mix(uGlassColorC, uGlassColorD, smoothstep(0.666667, 1.0, position));
  }`;

const LEGACY_COORDINATE_START = '    vec2 st = gl_FragCoord.xy / uResolution.xy;';
const GLASS_COORDINATE_START = `    vec2 st = gl_FragCoord.xy / uResolution.xy;
    vec2 gradientCoordinate = st - 0.5;
    float gradientCos = cos(uGlassGradientAngle);
    float gradientSin = sin(uGlassGradientAngle);
    st = mat2(gradientCos, -gradientSin, gradientSin, gradientCos) * gradientCoordinate + 0.5;`;

/** The legacy procedural field with only its palette and orientation made explicit. */
export const GLASS_BAND_GRADIENT_FRAGMENT_SOURCE = PROCEDURAL_COLOR_FRAGMENT_SOURCE
  .replace(LEGACY_RAINBOW_FUNCTION, GLASS_PALETTE_FUNCTION)
  .replace(LEGACY_COORDINATE_START, GLASS_COORDINATE_START);
