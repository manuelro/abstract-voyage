// One vertex (gl.POINTS) per star — all per-star state (angle, phase,
// depth, size, color, twinkle) lives in the static attribute buffer,
// uploaded once (see SpacefieldBackground.tsx); every frame only updates
// uTime/uOrigin/uParallax uniforms, so animating hundreds of stars is a
// single draw call with zero per-frame CPU work per star.
export const SPACEFIELD_VERTEX_SOURCE = `
  attribute float aAngle;
  attribute float aPhase;
  attribute float aDepth;
  attribute float aSize;
  attribute vec3 aColor;
  attribute float aTwinkleSpeed;
  attribute float aTwinklePhase;

  uniform float uTime;
  uniform vec2 uResolution;
  uniform vec2 uOrigin;
  uniform float uFieldRadius;
  uniform float uDriftSpeed;
  uniform float uDepthStrength;
  uniform float uPerspectiveStrength;
  uniform float uApproachSizeMin;
  uniform float uApproachSizeMax;
  uniform vec2 uParallax;
  uniform float uTwinkleAmount;
  uniform float uDpr;

  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    // t is plain wall-clock lifetime progress (0..1, linear) — used below
    // only for fade-in/out and twinkle timing, i.e. "how long has this
    // star been alive," not "how far has it traveled."
    float cycleSeconds = uFieldRadius / max(uDriftSpeed, 0.5);
    float t = fract(uTime / cycleSeconds + aPhase);

    // progress is the perspective-eased travel curve: real forward motion
    // through a 3D star field projects onto 2D as radius ∝ 1/depth, so a
    // star's apparent radius accelerates as it approaches rather than
    // growing linearly with time. At uPerspectiveStrength = 0 this reduces
    // to progress = t (the old, pre-perspective linear behavior); toward
    // its max, radius growth stays slow near the origin and then races
    // outward near the end of the cycle — "stars crawl, then rocket past."
    float k = uPerspectiveStrength;
    float progress = (t * (1.0 - k)) / max(1.0 - k * t, 0.0001);
    float radius = uFieldRadius * progress;

    vec2 direction = vec2(cos(aAngle), sin(aAngle));
    // Parallax is already damped/eased CPU-side (see
    // hooks/useSpacefieldParallax.ts) — the shader just scales the
    // resulting offset by depth so nearer stars shift more per pixel of
    // pointer movement than farther ones.
    vec2 parallaxOffset = uParallax * aDepth;
    vec2 positionPx = uOrigin + direction * radius + parallaxOffset;

    vec2 clip = (positionPx / uResolution) * 2.0 - 1.0;
    clip.y = -clip.y;
    gl_Position = vec4(clip, 0.0, 1.0);

    // Two independent size factors, layered rather than conflated: some
    // stars are just intrinsically bigger (a fixed-per-star roll, aDepth +
    // depthStrength — real stars vary in physical size), and every star
    // additionally grows as it nears the viewer (approachSizeMin/Max,
    // driven by the same progress curve as radius above) — the same
    // forward-motion cue, applied to size instead of position.
    float intrinsicSizeScale = mix(1.0, mix(0.4, 1.7, aDepth), uDepthStrength);
    float approachSizeScale = mix(uApproachSizeMin, uApproachSizeMax, progress);
    gl_PointSize = max(1.0, aSize * intrinsicSizeScale * approachSizeScale * uDpr);

    // Fades a star in as it leaves the origin and out again before it
    // wraps back to it, so the loop reads as continuous emergence rather
    // than a visible pop/reset at the field's edge. Based on t (lifetime),
    // not progress (position) — the fade window should stay a constant
    // fraction of a star's actual lifespan regardless of how nonlinear its
    // radius curve is.
    float fadeIn = smoothstep(0.0, 0.06, t);
    float fadeOut = 1.0 - smoothstep(0.85, 1.0, t);

    // Two overlaid sine waves at slightly different per-star frequencies —
    // approximates atmospheric-scintillation twinkle (irregular, not a
    // uniform blink) rather than one clean oscillation.
    float twinkleWave = sin(uTime * aTwinkleSpeed * 6.28318 + aTwinklePhase)
      * sin(uTime * aTwinkleSpeed * 2.63 + aTwinklePhase * 1.7);
    float twinkle = 1.0 - uTwinkleAmount * (0.5 - 0.5 * twinkleWave);

    vColor = aColor;
    vAlpha = fadeIn * fadeOut * twinkle;
  }
`;

export const SPACEFIELD_FRAGMENT_SOURCE = `
  precision mediump float;

  varying vec3 vColor;
  varying float vAlpha;
  uniform float uOpacity;

  void main() {
    vec2 centered = gl_PointCoord - vec2(0.5);
    float dist = length(centered) * 2.0;
    float core = smoothstep(1.0, 0.0, dist);
    float alpha = core * core * vAlpha * uOpacity;
    if (alpha <= 0.003) discard;
    gl_FragColor = vec4(vColor, alpha);
  }
`;
