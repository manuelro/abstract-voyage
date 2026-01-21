// pages/strings/index.tsx
// @ts-nocheck

import { useEffect, useRef } from 'react'
import Head from 'next/head'
import * as THREE from 'three'

import Nav from '../../experiences/space/components/Nav'
import { STARFIELD_VERT, STARFIELD_FRAG, CFG_V3 } from '../../experiences/space/ParticleV3'
import { buildStarfieldModule } from '../../experiences/space/buildStarfieldModule'

// -----------------------------------------------------------------------------
// Spline config: mirrors the original RING_CONFIG from /pages/circle
// -----------------------------------------------------------------------------
const STRINGS_RING_CONFIG = {
  baseRadius: 0.31,
  // Slightly calmer radial breathing
  minRadiusAmplitude: 0.03,
  maxRadiusAmplitude: 0.08,
  minThickness: 0.1,
  maxThickness: 0.02,

  // Move silhouette detail into effective range for softer wobble
  silhouetteDetailMin: 0.1,
  silhouetteDetailMax: 1.3,

  // Slower loop: 8s -> 13s (~1.6x slower)
  loopDurationSeconds: 13.0,

  // Calmer, wider, fewer tapers
  dynamicTaperCount: 5,
  dynamicTaperMinWidth: 0.05,
  dynamicTaperMaxWidth: 0.14,
  dynamicTaperMinTravel: 0.03,
  dynamicTaperMaxTravel: 0.12,
  dynamicTaperMinSpeed: 0.8,
  dynamicTaperMaxSpeed: 1.8,
  dynamicTaperStrength: 0.8,
  taperSpacingRandomness: 0.7,

  tempoEnabled: false,
  tempoBeatsPerLoop: 16,
  tempoThicknessPulseStrength: 0.55,
  tempoTaperPulseStrength: 0.9,

  velocityWarpStrength: 0.85,

  shapeBreathingStrength: 0.2,
  // Softer jitter + noise
  taperJitterStrength: 0.06,
  thicknessNoiseStrength: 0.11,

  // Softer structural + radial warp
  structureMorphStrength: 0.07,
  radialWarpStrength: 0.12,
  radialWarpDetail: 1.3,

  // Infinity morph is kept enabled so the internal wobble / breathing
  // semantics match the ring, even though we draw straight strings.
  infinityMorphEnabled: true,

  cameraPerspectiveStrength: 0,
} as const

// -----------------------------------------------------------------------------
// Connection-level config (how strings pick & join "stars")
// -----------------------------------------------------------------------------
const STRINGS_VIS_CONFIG = {
  // Max number of fabric stars we’ll sample per frame
  nodeCount: 120,

  // Max number of links to draw (each star links to at most its nearest neighbor)
  maxLinks: 80,

  // Number of sample points per link (higher = smoother / less dotted)
  segmentsPerLink: 96,

  // Distance thresholds in NDC space for linking [-1, 1].
  // Tuned for typical nearest-neighbour spacing in the Fibonacci fabric.
  minLinkDist: 0.005,
  maxLinkDist: 2,

  // (Drift settings no longer used; stars come from fabric snapshot.)
  driftSpeedNdcPerSec: 0.22,
  driftNoiseStrength: 0.55,
  driftFriction: 0.94,

  // How much lateral wiggle a straight string gets (NDC units)
  maxWiggleNdc: 0.015,

  // Visible tube thickness in CSS pixels (after DPR scaling)
  pointSizeMinPx: 5.0,
  pointSizeMaxPx: 24.0,

  // Motion scaling for prefers-reduced-motion
  reducedMotionScale: 0.35,
} as const

// -----------------------------------------------------------------------------
// String shaders — vertex passes param t & intensity, fragment reuses ring logic
// -----------------------------------------------------------------------------
const STRINGS_VERT = /* glsl */ `
  attribute float aT;
  attribute float aIntensity;
  attribute float aSeed;

  varying float vT;
  varying float vIntensity;
  varying float vSeed;

  uniform float uPointSizeMin;
  uniform float uPointSizeMax;
  uniform float uDpr;

  void main() {
    vT = aT;
    vIntensity = aIntensity;
    vSeed = aSeed;

    // positions are already in clip / NDC space (-1..1)
    gl_Position = vec4(position.xy, 0.0, 1.0);

    // Thicker in the middle of the link, thinner at the ends.
    float centerBias = 1.0 - abs(2.0 * aT - 1.0);
    centerBias = pow(centerBias, 0.6);

    float sizeT = clamp(centerBias * aIntensity, 0.0, 1.0);
    float sizePx = mix(uPointSizeMin, uPointSizeMax, sizeT);

    gl_PointSize = sizePx * uDpr;
  }
`

const STRINGS_FRAG = /* glsl */ `
// neon tube fragment shader (same as entanglement page)
#ifdef GL_OES_standard_derivatives
#extension GL_OES_standard_derivatives : enable
#endif

precision highp float;

varying float vT;
varying float vIntensity;
varying float vSeed;

uniform float uTime;
uniform float uLoopDuration;
uniform float uMotionScale;

uniform float uMinThickness;
uniform float uMaxThickness;

uniform float uDynamicTaperCount;
uniform float uDynamicTaperMinWidth;
uniform float uDynamicTaperMaxWidth;
uniform float uDynamicTaperMinTravel;
uniform float uDynamicTaperMaxTravel;
uniform float uDynamicTaperMinSpeed;
uniform float uDynamicTaperMaxSpeed;
uniform float uDynamicTaperStrength;
uniform float uDynamicTaperSeed;
uniform float uTaperSpacingRandomness;

uniform float uTempoEnabled;
uniform float uTempoBeatsPerLoop;
uniform float uTempoThicknessPulseStrength;
uniform float uTempoTaperPulseStrength;

uniform float uVelocityWarpStrength;

uniform float uShapeBreathingStrength;
uniform float uTaperJitterStrength;
uniform float uThicknessNoiseStrength;

uniform float uWobblePhase1;
uniform float uWobblePhase2;
uniform float uWobblePhase3;
uniform float uWobblePhase4;
uniform float uWobbleDetail;

const float PI = 3.14159265358979323846;

float hash(float x) {
  return fract(sin(x) * 43758.5453123);
}

vec2 hash2D(vec2 p) {
  p = vec2(
    dot(p, vec2(127.1, 311.7)),
    dot(p, vec2(269.5, 183.3))
  );
  return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
}

float noise2D(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);

  vec2 u = f * f * (3.0 - 2.0 * f);

  float n00 = dot(hash2D(i + vec2(0.0, 0.0)), f - vec2(0.0, 0.0));
  float n10 = dot(hash2D(i + vec2(1.0, 0.0)), f - vec2(1.0, 0.0));
  float n01 = dot(hash2D(i + vec2(0.0, 1.0)), f - vec2(0.0, 1.0));
  float n11 = dot(hash2D(i + vec2(1.0, 1.0)), f - vec2(1.0, 1.0));

  float nx0 = mix(n00, n10, u.x);
  float nx1 = mix(n01, n11, u.x);
  float nxy = mix(nx0, nx1, u.y);

  return 0.5 + 0.5 * nxy;
}

vec2 circleCoord(float u, float scale) {
  float a = 2.0 * PI * u;
  return vec2(cos(a), sin(a)) * scale;
}

float wrappedDistance(float a, float b) {
  float d = abs(a - b);
  return min(d, 1.0 - d);
}

float easeInOutQuad(float t) {
  t = clamp(t, 0.0, 1.0);
  if (t < 0.5) {
    return 2.0 * t * t;
  } else {
    float inv = 1.0 - t;
    return 1.0 - 2.0 * inv * inv;
  }
}

vec3 hsv2rgb(vec3 c) {
  vec3 rgb = clamp(
    abs(mod(c.x * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0,
    0.0,
    1.0
  );
  rgb = rgb * rgb * (3.0 - 2.0 * rgb);
  return c.z * mix(vec3(1.0), rgb, c.y);
}

void main() {
  vec2 uv = gl_PointCoord - 0.5;
  float r = length(uv);
  float spriteMask = smoothstep(0.5, 0.0, r);
  if (spriteMask <= 0.0) discard;

  float loopPhase = (uTime * uMotionScale) / max(uLoopDuration, 0.0001);
  float loopPhase01 = fract(loopPhase);

  float t = clamp(vT, 0.0, 1.0);

  float detail = clamp(uWobbleDetail, 0.0, 1.5);

  float a1 = 0.7;
  float a2 = 0.25 * detail;
  float a3 = 0.12 * detail * detail;
  float a4 = 0.05 * detail * detail * detail;

  float wobble =
    a1 * sin(2.0 * PI * (1.0 * t) + uWobblePhase1) +
    a2 * sin(2.0 * PI * (2.0 * t) + uWobblePhase2) +
    a3 * sin(2.0 * PI * (3.0 * t) + uWobblePhase3) +
    a4 * sin(2.0 * PI * (5.0 * t) + uWobblePhase4);

  float norm = a1 + a2 + a3 + a4 + 1e-4;
  wobble /= norm;

  float breath =
    0.8 * sin(2.0 * PI * (0.6 * loopPhase01) + uWobblePhase1 * 0.73) +
    0.2 * sin(2.0 * PI * (1.2 * loopPhase01) + uWobblePhase2 * 1.19);
  breath /= (0.8 + 0.2);

  float wobbleGain = 1.0 + breath * uShapeBreathingStrength;
  wobble *= wobbleGain;

  float baseThicknessT = 0.55 + 0.35 * wobble;

  float beatsPerLoop = max(uTempoBeatsPerLoop, 1.0);
  float tempoOn = step(0.5, uTempoEnabled);

  float beatPos = loopPhase01 * beatsPerLoop;
  float beatIndex = floor(beatPos);
  float beatT = fract(beatPos);

  float beatPulse = exp(-6.0 * beatT) * tempoOn;

  float easedBeatTraw = easeInOutQuad(beatT);
  float warpStrength = clamp(uVelocityWarpStrength, 0.0, 1.0) * tempoOn;
  float easedBeatT = mix(beatT, easedBeatTraw, warpStrength);

  float loopPhaseWarped = fract((beatIndex + easedBeatT) / beatsPerLoop);

  float segmentCount = 12.0;
  float segmentPos = t * segmentCount;
  float segIndex0 = floor(segmentPos);
  float segIndex1 = mod(segIndex0 + 1.0, segmentCount);
  float segF = fract(segmentPos);
  float segBlend = segF * segF * (3.0 - 2.0 * segF);

  float nextBeatIndex = mod(beatIndex + 1.0, beatsPerLoop);

  float baseSeed = uDynamicTaperSeed * 1.37 + vSeed * 31.0;

  float seed0 = baseSeed + segIndex0 * 37.0;
  float seed1 = baseSeed + segIndex1 * 37.0;

  float noise0A = hash(seed0 + beatIndex * 13.0);
  float noise0B = hash(seed0 + nextBeatIndex * 13.0);
  float noise1A = hash(seed1 + beatIndex * 13.0);
  float noise1B = hash(seed1 + nextBeatIndex * 13.0);

  float noise0 = mix(noise0A, noise0B, beatT);
  float noise1 = mix(noise1A, noise1B, beatT);

  float segmentNoise = mix(noise0, noise1, segBlend);

  float signedNoise = (segmentNoise - 0.5) * 2.0;
  float tempoOffset = signedNoise * beatPulse * uTempoThicknessPulseStrength;

  float baseThicknessTempo = clamp(baseThicknessT + tempoOffset, 0.0, 1.0);

  float baseThicknessOrganic;
  {
    float thickSeed = uDynamicTaperSeed * 2.41 + vSeed * 59.0;

    float angleScaleN = 4.0;
    float timeScaleN = 1.5;

    vec2 aPos = circleCoord(t + thickSeed * 0.013, angleScaleN);
    vec2 tPos = circleCoord(loopPhase01 + thickSeed * 0.021, timeScaleN);

    vec2 np = aPos + tPos;

    float n1 = noise2D(np);
    float n2 = noise2D(np * 2.1 + 5.7);

    float n = (n1 + 0.5 * n2) / 1.5;
    float signedN = (n - 0.5) * 2.0;

    float thicknessNoiseOffset = signedN * uThicknessNoiseStrength;

    baseThicknessOrganic = clamp(
      baseThicknessTempo + thicknessNoiseOffset,
      0.0,
      1.0
    );
  }

  const int MAX_TAPERS = 8;
  float thinAccum = 0.0;
  float tapers = clamp(uDynamicTaperCount, 0.0, float(MAX_TAPERS));

  float spacingRand = clamp(uTaperSpacingRandomness, 0.0, 1.0);

  for (int i = 0; i < MAX_TAPERS; i++) {
    float fi = float(i);
    if (fi >= tapers) break;

    float seed = uDynamicTaperSeed + fi * 19.19 + vSeed * 17.0;

    float baseSpacing   = 1.0 / max(tapers, 1.0);
    float uniformCenter = (fi + 0.5) * baseSpacing;
    float randomCenter  = hash(seed + 1.0);
    float baseCenter  = mix(uniformCenter, randomCenter, spacingRand);

    float travel = mix(
      uDynamicTaperMinTravel,
      uDynamicTaperMaxTravel,
      hash(seed + 2.0)
    );

    float width = mix(
      uDynamicTaperMinWidth,
      uDynamicTaperMaxWidth,
      hash(seed + 3.0)
    );

    float speedRand = mix(
      uDynamicTaperMinSpeed,
      uDynamicTaperMaxSpeed,
      hash(seed + 4.0)
    );
    float speed = floor(speedRand + 0.5);
    speed = max(1.0, speed);

    float dirSign = (hash(seed + 5.0) < 0.5) ? -1.0 : 1.0;
    float phase = hash(seed + 6.0) * 2.0 * PI;

    float localThinStrength = mix(0.4, 1.2, hash(seed + 7.0));

    float basePhase = mix(loopPhase01, loopPhaseWarped, tempoOn);

    float jitterSeed = seed * 1.31;
    float j1 = sin(
      2.0 * PI * (
        1.0 * loopPhase01 +
        hash(jitterSeed + 20.0) * 4.0
      )
    );
    float j2 = sin(
      2.0 * PI * (
        2.0 * loopPhase01 +
        hash(jitterSeed + 21.0) * 4.0
      )
    );
    float j = (j1 * 0.6 + j2 * 0.4) * 0.5;
    float timeJitter = j * uTaperJitterStrength;

    float taperPhase = fract(basePhase + timeJitter);

    float center =
      baseCenter +
      travel * sin(2.0 * PI * (speed * taperPhase * dirSign) + phase);
    center = fract(center);

    float dist = wrappedDistance(t, center);
    float influence = 1.0 - smoothstep(0.0, width, dist);

    thinAccum += influence * localThinStrength;
  }

  float thinRaw = clamp(thinAccum, 0.0, 1.0);

  float thinStrength = max(uDynamicTaperStrength, 0.0);
  float thinMask = clamp(thinRaw * thinStrength, 0.0, 1.0);

  float tempoThinBoost = 1.0 + uTempoTaperPulseStrength * beatPulse;
  thinMask = clamp(thinMask * tempoThinBoost, 0.0, 1.0);

  float attenuationExp = 1.0 + 4.0 * thinStrength;
  float attenuation = pow(1.0 - thinMask, attenuationExp);

  float edgeMask = thinMask * (1.0 - thinMask);
  float edgeBoost = 1.0 + edgeMask * (0.5 + 1.5 * thinStrength);

  float thicknessT = baseThicknessOrganic * attenuation * edgeBoost;
  thicknessT = clamp(thicknessT, 0.0, 1.0);

  float localThickness = mix(uMinThickness, uMaxThickness, thicknessT);

  float hueOffset = hash(uDynamicTaperSeed + 100.0 + vSeed * 11.0);
  float dirPick = hash(uDynamicTaperSeed + 200.0 + vSeed * 13.0);
  float hueDir = (dirPick < 0.5) ? -1.0 : 1.0;
  float hue = fract(t * hueDir + hueOffset);

  float paletteBias = hash(uDynamicTaperSeed + 300.0 + vSeed * 17.0) - 0.5;
  hue = fract(hue + 0.12 * paletteBias);

  float sat = 0.85 + 0.1 * hash(uDynamicTaperSeed + 400.0 + vSeed * 23.0);

  float val = 0.82 + 0.18 * thicknessT;
  vec3 baseColor = hsv2rgb(vec3(hue, sat, val));

  float thicknessRadius = mix(0.06, 0.23, thicknessT);
  float aa = fwidth(r);
  float ring = 1.0 - smoothstep(thicknessRadius, thicknessRadius + aa, r);

  float strokePos = clamp(
    1.0 - r / max(thicknessRadius * 1.2, 1e-4),
    0.0,
    1.0
  );

  float core = smoothstep(0.6, 1.0, strokePos);

  float coreMix = 0.7 + 0.3 * thicknessT;
  vec3 coreBase = baseColor * (0.65 + 0.25 * thicknessT);
  vec3 neonCore = mix(coreBase, vec3(1.0), core * coreMix);

  float brightness = 0.9 + 0.35 * thicknessT;
  neonCore *= brightness;

  float glowRadius = thicknessRadius * (2.0 + 1.5 * thicknessT);
  float glowNorm = r / max(glowRadius, 1e-4);
  float glowMask = exp(-glowNorm * glowNorm * 3.0);

  vec3 glowColor = baseColor * (0.7 + 0.3 * thicknessT);

  vec3 color = vec3(0.0);
  color += glowColor * glowMask * 0.85;
  color += neonCore * ring;

  float alpha = spriteMask * ring * vIntensity;
  gl_FragColor = vec4(color * alpha, alpha);
}
`

// -----------------------------------------------------------------------------
// Starfield runtime injection (same engine as /space, simpler wrapper)
// -----------------------------------------------------------------------------
const useStarfield = () => {
  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return

    const SCRIPT_ID = 'starfield-strings-module'

    const disposePrev = () => {
      try {
        ;(window as any)?.STARFIELD?.dispose?.()
      } catch {}
      const prev = document.getElementById(SCRIPT_ID)
      if (prev && prev.parentNode) {
        prev.parentNode.removeChild(prev)
      }
    }

    disposePrev()

    const cfg = CFG_V3

    const el = document.createElement('script')
    el.type = 'module'
    el.id = SCRIPT_ID
    el.textContent = buildStarfieldModule({
      cfg,
      vert: STARFIELD_VERT,
      frag: STARFIELD_FRAG,
    })

    const parent = document.head || document.body || document.documentElement
    ;(parent || document.documentElement).appendChild(el)

    return () => {
      disposePrev()
    }
  }, [])
}

// -----------------------------------------------------------------------------
// Strings overlay scene — straight, stretchy neon connections between stars
// -----------------------------------------------------------------------------
const StringsOverlay = () => {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const frameRef = useRef<number | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const container = containerRef.current
    if (!container) return

    const prefersReducedMotion =
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const motionScale = prefersReducedMotion
      ? STRINGS_VIS_CONFIG.reducedMotionScale
      : 1.0

    const dpr = window.devicePixelRatio || 1
    const width = window.innerWidth || 1
    const height = window.innerHeight || 1

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
    })
    renderer.setPixelRatio(dpr)
    renderer.setSize(width, height)
    renderer.setClearColor(0x000000, 0)
    renderer.autoClear = true
    container.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -1, 1)

    // --- Link geometry: many points along many straight connections ---
    const maxLinks = STRINGS_VIS_CONFIG.maxLinks
    const segmentsPerLink = STRINGS_VIS_CONFIG.segmentsPerLink
    const maxPoints = maxLinks * segmentsPerLink

    const positions = new Float32Array(maxPoints * 3)
    const aT = new Float32Array(maxPoints)
    const aIntensity = new Float32Array(maxPoints)
    const aSeed = new Float32Array(maxPoints)

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('aT', new THREE.BufferAttribute(aT, 1))
    geometry.setAttribute('aIntensity', new THREE.BufferAttribute(aIntensity, 1))
    geometry.setAttribute('aSeed', new THREE.BufferAttribute(aSeed, 1))
    geometry.getAttribute('position').setUsage(THREE.DynamicDrawUsage)
    geometry.getAttribute('aT').setUsage(THREE.DynamicDrawUsage)
    geometry.getAttribute('aIntensity').setUsage(THREE.DynamicDrawUsage)
    geometry.getAttribute('aSeed').setUsage(THREE.DynamicDrawUsage)

    const randomInRange = (min: number, max: number) =>
      min + Math.random() * (max - min)

    const ring = STRINGS_RING_CONFIG
    const radiusAmplitude = randomInRange(
      ring.minRadiusAmplitude,
      ring.maxRadiusAmplitude,
    )

    const silhouetteDetail = randomInRange(
      ring.silhouetteDetailMin,
      ring.silhouetteDetailMax,
    )

    const wobblePhase1 = randomInRange(0, Math.PI * 2)
    const wobblePhase2 = randomInRange(0, Math.PI * 2)
    const wobblePhase3 = randomInRange(0, Math.PI * 2)
    const wobblePhase4 = randomInRange(0, Math.PI * 2)

    const dynamicTaperSeed = Math.random() * 1000.0

    const infinityMorphAmount =
      ring.infinityMorphEnabled
        ? prefersReducedMotion
          ? 0.7
          : 1.0
        : 0.0

    const motionScaleForShader = motionScale

    const uniforms = {
      uTime: { value: 0 },
      uLoopDuration: { value: ring.loopDurationSeconds },
      uMotionScale: { value: motionScaleForShader },

      uMinThickness: { value: ring.minThickness },
      uMaxThickness: { value: ring.maxThickness },

      uDynamicTaperCount: { value: ring.dynamicTaperCount },
      uDynamicTaperMinWidth: { value: ring.dynamicTaperMinWidth },
      uDynamicTaperMaxWidth: { value: ring.dynamicTaperMaxWidth },
      uDynamicTaperMinTravel: { value: ring.dynamicTaperMinTravel },
      uDynamicTaperMaxTravel: { value: ring.dynamicTaperMaxTravel },
      uDynamicTaperMinSpeed: { value: ring.dynamicTaperMinSpeed },
      uDynamicTaperMaxSpeed: { value: ring.dynamicTaperMaxSpeed },
      uDynamicTaperStrength: { value: ring.dynamicTaperStrength },
      uDynamicTaperSeed: { value: dynamicTaperSeed },
      uTaperSpacingRandomness: { value: ring.taperSpacingRandomness },

      uTempoEnabled: { value: ring.tempoEnabled ? 1 : 0 },
      uTempoBeatsPerLoop: { value: ring.tempoBeatsPerLoop },
      uTempoThicknessPulseStrength: {
        value: ring.tempoThicknessPulseStrength,
      },
      uTempoTaperPulseStrength: {
        value: ring.tempoTaperPulseStrength,
      },

      uVelocityWarpStrength: { value: ring.velocityWarpStrength },

      uShapeBreathingStrength: { value: ring.shapeBreathingStrength },
      uTaperJitterStrength: { value: ring.taperJitterStrength },
      uThicknessNoiseStrength: { value: ring.thicknessNoiseStrength },

      uWobblePhase1: { value: wobblePhase1 },
      uWobblePhase2: { value: wobblePhase2 },
      uWobblePhase3: { value: wobblePhase3 },
      uWobblePhase4: { value: wobblePhase4 },

      uWobbleDetail: { value: silhouetteDetail },

      uInfinityMorphAmount: { value: infinityMorphAmount },
      uRadiusAmplitude: { value: radiusAmplitude },

      // point-size / thickness uniforms wired to config
      uPointSizeMin: { value: STRINGS_VIS_CONFIG.pointSizeMinPx },
      uPointSizeMax: { value: STRINGS_VIS_CONFIG.pointSizeMaxPx },
      uDpr: { value: dpr },
    }

    const material = new THREE.ShaderMaterial({
      vertexShader: STRINGS_VERT,
      fragmentShader: STRINGS_FRAG,
      uniforms,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: THREE.AdditiveBlending,
    })
    material.transparent = true
    material.blending = THREE.AdditiveBlending
    material.extensions = { derivatives: true }

    const points = new THREE.Points(geometry, material)
    points.frustumCulled = false
    scene.add(points)

    const minLinkDist = STRINGS_VIS_CONFIG.minLinkDist
    const maxLinkDist = STRINGS_VIS_CONFIG.maxLinkDist
    const linkDistRange = Math.max(1e-4, maxLinkDist - minLinkDist)
    const maxWiggle = STRINGS_VIS_CONFIG.maxWiggleNdc * motionScale

    // ------- Fabric snapshot plumbing (live star positions) -------
    const candidateCapacity = STRINGS_VIS_CONFIG.nodeCount
    const candX = new Float32Array(candidateCapacity)
    const candY = new Float32Array(candidateCapacity)
    const candWeight = new Float32Array(candidateCapacity)
    const candIndex = new Uint16Array(candidateCapacity)

    // Extended per-star fields (only populated when snapshot V2 is available)
    const candSizePx = new Float32Array(candidateCapacity)
    const candDepth = new Float32Array(candidateCapacity)
    const candRadius01 = new Float32Array(candidateCapacity)
    const candBirthAgeMs = new Float32Array(candidateCapacity)
    const candActorScore = new Float32Array(candidateCapacity)

    let snapshotBasicBuffer: Float32Array | null = null
    let snapshotExtendedBuffer: Float32Array | null = null

    const clamp01 = (v: number) => Math.max(0, Math.min(1, v))

    const computeActorScore = (params: {
      alpha: number
      bright: number
      sizePx: number
      r01: number
      birthAgeMs: number
    }): number => {
      const { alpha, bright, sizePx, r01, birthAgeMs } = params

      if (!isFinite(alpha) || alpha <= 0) return 0

      const alphaTerm = clamp01(alpha)

      const brightNorm = clamp01(bright / 3.0)
      const brightTerm = 0.4 + 0.6 * brightNorm

      const sizeNorm = clamp01(sizePx / 18.0)
      const sizeTerm = 0.35 + 0.65 * sizeNorm

      // favor mid–outer band of the fabric as "actors"
      const rBandCenter = 0.78
      const rBandWidth = 0.42
      const rDelta = Math.abs((r01 || 0) - rBandCenter)
      const rTerm = clamp01(1.0 - rDelta / Math.max(1e-3, rBandWidth))

      // birth gate: newborns ramp up over a short fade window
      let birthGate = 1.0
      if (birthAgeMs >= 0) {
        const t = clamp01(birthAgeMs / 420.0)
        birthGate = t * t * (3 - 2 * t) // smoothstep-ish
      }

      const raw =
        0.15 * alphaTerm +
        0.35 * brightTerm +
        0.25 * sizeTerm +
        0.25 * rTerm

      return clamp01(raw * birthGate)
    }

    type FabricSnapshot = {
      data: Float32Array
      count: number
      stride: number
      hasExtended: boolean
    }

    const getSnapshot = (): FabricSnapshot | null => {
      try {
        const api = (window as any).STARFIELD
        if (!api) return null

        // Prefer extended snapshot when runtime supports it
        if (typeof api.getFabricSnapshotExtended === 'function') {
          const res = api.getFabricSnapshotExtended(snapshotExtendedBuffer)
          if (res && res.data && res.count) {
            snapshotExtendedBuffer = res.data
            const data = res.data as Float32Array
            const count = (res.count as number) | 0
            const stride =
              typeof res.stride === 'number' && isFinite(res.stride)
                ? (res.stride as number) | 0
                : Math.max(1, (data.length / Math.max(1, count)) | 0)

            return { data, count, stride, hasExtended: true }
          }
        }

        // Fallback: original 4-float snapshot
        if (typeof api.getFabricSnapshot === 'function') {
          const res = api.getFabricSnapshot(snapshotBasicBuffer)
          if (!res || !res.data || !res.count) return null
          snapshotBasicBuffer = res.data
          const data = res.data as Float32Array
          const count = (res.count as number) | 0
          const stride = 4
          return { data, count, stride, hasExtended: false }
        }

        return null
      } catch {
        return null
      }
    }

    const clearLinks = () => {
      for (let k = 0; k < maxPoints; k++) {
        const idx3 = k * 3
        positions[idx3 + 0] = 0
        positions[idx3 + 1] = 0
        positions[idx3 + 2] = 0
        aT[k] = 0
        aIntensity[k] = 0
        aSeed[k] = 0
      }
      geometry.setDrawRange(0, 0)
      ;(geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true
      ;(geometry.attributes.aT as THREE.BufferAttribute).needsUpdate = true
      ;(geometry.attributes.aIntensity as THREE.BufferAttribute).needsUpdate = true
      ;(geometry.attributes.aSeed as THREE.BufferAttribute).needsUpdate = true
    }

    const buildLinksFromStars = (timeSeconds: number) => {
      const snapshot = getSnapshot()
      if (!snapshot) {
        clearLinks()
        return
      }

      const { data, count, stride } = snapshot
      const maxSample = Math.min(count, candidateCapacity)

      let nCand = 0
      const alphaThreshold = 0.02

      for (let i = 0; i < maxSample; i++) {
        const base = i * stride

        const ndcX = data[base + 0]
        const ndcY = data[base + 1]
        const alpha = data[base + 2]
        const bright = data[base + 3]

        let sizePx = 0
        let viewZ = 0
        let r01 = 0
        let birthAgeMs = -1

        if (stride >= 5) sizePx = data[base + 4]
        if (stride >= 6) viewZ = data[base + 5]
        if (stride >= 7) r01 = data[base + 6]
        if (stride >= 8) birthAgeMs = data[base + 7]

        if (!isFinite(ndcX) || !isFinite(ndcY)) continue
        if (alpha <= alphaThreshold) continue
        if (ndcX < -1.1 || ndcX > 1.1 || ndcY < -1.1 || ndcY > 1.1) continue

        const w = alpha * (0.4 + 0.6 * Math.max(0, bright))
        const actorScore = computeActorScore({
          alpha,
          bright,
          sizePx,
          r01,
          birthAgeMs,
        })

        candX[nCand] = ndcX
        candY[nCand] = ndcY
        candWeight[nCand] = w
        candIndex[nCand] = i
        candSizePx[nCand] = sizePx
        candDepth[nCand] = viewZ
        candRadius01[nCand] = r01
        candBirthAgeMs[nCand] = birthAgeMs
        candActorScore[nCand] = actorScore
        nCand++
      }

      if (nCand < 2) {
        clearLinks()
        return
      }

      const maxLinksLocal = Math.min(maxLinks, nCand)
      let writeIndex = 0
      const maxPointsTotal = maxPoints

      for (let i = 0; i < nCand && writeIndex < maxPointsTotal; i++) {
        if (i >= maxLinksLocal) break

        const actorI = candActorScore[i]
        // Very low-importance stars don’t spawn strings
        if (actorI <= 0.01) continue

        const xi = candX[i]
        const yi = candY[i]

        let bestJ = -1
        let bestD2 = Infinity

        for (let j = 0; j < nCand; j++) {
          if (i === j) continue
          const dx = candX[j] - xi
          const dy = candY[j] - yi
          const d2 = dx * dx + dy * dy
          if (d2 < bestD2) {
            bestD2 = d2
            bestJ = j
          }
        }

        if (bestJ < 0) continue

        const dist = Math.sqrt(bestD2)
        if (dist <= minLinkDist || dist >= maxLinkDist) continue

        const actorJ = candActorScore[bestJ]
        const actorProduct = actorI * actorJ

        // Require at least a small shared actor presence
        if (actorProduct <= 0.02) continue

        const tNorm = (dist - minLinkDist) / linkDistRange
        const pairActorBlend = clamp01(0.6 * actorI + 0.4 * actorJ)
        const prolixity = clamp01(0.25 + 0.75 * pairActorBlend)

        let strength = 1.0 - tNorm
        strength = clamp01(strength)
        strength = Math.pow(strength, 0.8)
        strength *= prolixity
        if (strength <= 0.02) continue

        const xj = candX[bestJ]
        const yj = candY[bestJ]

        const dx = xj - xi
        const dy = yj - yi
        const len = Math.max(1e-5, Math.hypot(dx, dy))
        const dirX = dx / len
        const dirY = dy / len
        const normX = -dirY
        const normY = dirX

        const seed = (candIndex[i] * 113 + candIndex[bestJ] * 37) % 997
        const seedF = seed / 997.0

        const baseWeight =
          strength * clamp01(candWeight[i])

        for (let s = 0; s < segmentsPerLink && writeIndex < maxPointsTotal; s++) {
          const tSeg =
            segmentsPerLink <= 1 ? 0 : s / (segmentsPerLink - 1)

          let px = xi + dx * tSeg
          let py = yi + dy * tSeg

          const wigglePhase =
            seedF * 13.0 + timeSeconds * 1.3 + tSeg * Math.PI * 2.0
          const wiggleAmp =
            STRINGS_VIS_CONFIG.maxWiggleNdc *
            motionScale *
            strength *
            (0.4 + 0.6 * Math.sin(seedF * 27.0 + timeSeconds * 0.4))
          const w = Math.sin(wigglePhase) * wiggleAmp

          px += normX * w
          py += normY * w

          const idx3 = writeIndex * 3
          positions[idx3 + 0] = px
          positions[idx3 + 1] = py
          positions[idx3 + 2] = 0

          aT[writeIndex] = tSeg
          aIntensity[writeIndex] = baseWeight
          aSeed[writeIndex] = seedF

          writeIndex++
        }
      }

      // Clear any unused slots
      for (let k = writeIndex; k < maxPointsTotal; k++) {
        const idx3 = k * 3
        positions[idx3 + 0] = 0
        positions[idx3 + 1] = 0
        positions[idx3 + 2] = 0
        aT[k] = 0
        aIntensity[k] = 0
        aSeed[k] = 0
      }

      geometry.setDrawRange(0, Math.max(0, writeIndex))
      ;(geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true
      ;(geometry.attributes.aT as THREE.BufferAttribute).needsUpdate = true
      ;(geometry.attributes.aIntensity as THREE.BufferAttribute).needsUpdate = true
      ;(geometry.attributes.aSeed as THREE.BufferAttribute).needsUpdate = true
    }

    const startTime = performance.now()
    const getElapsedSeconds = () => (performance.now() - startTime) / 1000
    let lastTs = performance.now()

    const renderLoop = () => {
      const now = performance.now()
      const dt = Math.max(0.001, (now - lastTs) / 1000)
      lastTs = now

      const elapsed = getElapsedSeconds()
      uniforms.uTime.value = elapsed

      // Build links using live star positions
      buildLinksFromStars(elapsed)

      renderer.render(scene, camera)
      frameRef.current = window.requestAnimationFrame(renderLoop)
    }

    frameRef.current = window.requestAnimationFrame(renderLoop)

    const handleResize = () => {
      const w = window.innerWidth || 1
      const h = window.innerHeight || 1
      renderer.setSize(w, h)
      uniforms.uDpr.value = window.devicePixelRatio || 1
    }
    window.addEventListener('resize', handleResize)

    return () => {
      if (frameRef.current != null) {
        cancelAnimationFrame(frameRef.current)
      }
      window.removeEventListener('resize', handleResize)
      scene.remove(points)
      geometry.dispose()
      material.dispose()
      renderer.dispose()
      if (renderer.domElement && renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement)
      }
    }
  }, [])

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 2,
      }}
    />
  )
}

// -----------------------------------------------------------------------------
// Page component
// -----------------------------------------------------------------------------
const StringsPage = () => {
  useStarfield()

  return (
    <>
      <Head>
        <title>Strings — Starfield Connections</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>{`
          html, body {
            margin: 0;
            height: 100%;
            width: 100%;
            background: #000000;
            color: #ffffff;
            overflow: hidden;
          }
          #__next {
            height: 100%;
          }
          #starfield-host {
            position: fixed;
            inset: 0;
            z-index: 0;
          }
        `}</style>
      </Head>

      <div
        style={{
          position: 'relative',
          minHeight: '100vh',
          backgroundColor: '#000000',
          color: '#ffffff',
        }}
      >
        {/* Starfield background target */}
        <div id="starfield-host" aria-hidden="true" />

        {/* Neon “string” connections between real stars */}
        <StringsOverlay />

        {/* Nav overlay */}
        <div
          style={{
            position: 'relative',
            zIndex: 3,
          }}
        >
          <Nav
            brand={{ href: '/', logoSrc: '/logo-white.svg', label: 'Sota' }}
            links={[]}
            onSwitchMode={() => {}}
            switchDisabled={true}
          />
        </div>
      </div>
    </>
  )
}

export default StringsPage
