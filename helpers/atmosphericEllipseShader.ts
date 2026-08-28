import { PROCEDURAL_COLOR_VERTEX_SOURCE } from './proceduralColorShader';

export const ATMOSPHERIC_ELLIPSE_VERTEX_SOURCE = PROCEDURAL_COLOR_VERTEX_SOURCE;

export const ATMOSPHERIC_ELLIPSE_UNIFORMS = [
  'uTime',
  'uResolution',
  'uPalette',
  'uCenter',
  'uRadius',
  'uDriftAmount',
  'uBreathAmount',
  'uTurbulence',
  'uSeed',
  'uDitherStrength',
] as const;

/**
 * A palette-stable atmospheric field. Time only displaces the ellipse's
 * geometry; it never changes hue or advances through the palette.
 */
export const ATMOSPHERIC_ELLIPSE_FRAGMENT_SOURCE = `
  precision highp float;

  uniform float uTime;
  uniform vec2 uResolution;
  uniform sampler2D uPalette;
  uniform vec2 uCenter;
  uniform vec2 uRadius;
  uniform float uDriftAmount;
  uniform float uBreathAmount;
  uniform float uTurbulence;
  uniform float uSeed;
  uniform float uDitherStrength;

  float hash12(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
  }

  void main() {
    vec2 uv = gl_FragCoord.xy / max(uResolution.xy, vec2(1.0));
    // WebGL's origin is bottom-left; the config and CSS gradient use top-left.
    uv.y = 1.0 - uv.y;

    float seed = uSeed * 0.001;
    vec2 drift = vec2(
      sin(uTime * 0.73 + seed * 1.91) + 0.38 * sin(uTime * 1.31 + seed * 2.77),
      cos(uTime * 0.61 + seed * 2.17) + 0.34 * sin(uTime * 1.07 + seed * 3.13)
    ) * uDriftAmount;
    float breath = 1.0 + sin(uTime * 0.47 + seed * 1.37) * uBreathAmount;
    vec2 radius = max(vec2(0.04), uRadius * breath);
    vec2 q = (uv - (uCenter + drift)) / radius;

    float distanceField = length(q);
    float organic = (
      sin(q.x * 4.7 + q.y * 3.1 + uTime * 0.29 + seed) +
      0.55 * sin(q.x * 8.3 - q.y * 5.9 - uTime * 0.21 + seed * 1.7)
    ) / 1.55;
    distanceField += organic * uTurbulence * smoothstep(0.08, 1.0, distanceField);

    float palettePosition = clamp(distanceField, 0.0, 1.0);
    vec3 color = texture2D(uPalette, vec2(palettePosition, 0.5)).rgb;
    float dither = (hash12(gl_FragCoord.xy + seed) - 0.5) * uDitherStrength / 255.0;

    gl_FragColor = vec4(clamp(color + dither, 0.0, 1.0), 1.0);
  }
`;
