// pages/entanglement/index.tsx
// @ts-nocheck

import { useEffect, useRef } from 'react'
import Head from 'next/head'
import * as THREE from 'three'

// ----------------------------------------------------------------------------------
// Minimal ring config & shaders (copied from strings page for identical look)
// ----------------------------------------------------------------------------------
const STRINGS_RING_CONFIG = {
  baseRadius: 0.31,
  minRadiusAmplitude: 0.03,
  maxRadiusAmplitude: 0.08,
  minThickness: 0.1,
  maxThickness: 0.02,
  silhouetteDetailMin: 0.1,
  silhouetteDetailMax: 1.3,
  loopDurationSeconds: 13.0,
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
  taperJitterStrength: 0.06,
  thicknessNoiseStrength: 0.11,
  structureMorphStrength: 0.07,
  radialWarpStrength: 0.12,
  radialWarpDetail: 1.3,
  infinityMorphEnabled: true,
  cameraPerspectiveStrength: 0,
} as const

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

    gl_Position = vec4(position.xy, 0.0, 1.0);

    float centerBias = 1.0 - abs(2.0 * aT - 1.0);
    centerBias = pow(centerBias, 0.6);

    float sizeT = clamp(centerBias * aIntensity, 0.0, 1.0);
    float sizePx = mix(uPointSizeMin, uPointSizeMax, sizeT);

    gl_PointSize = sizePx * uDpr;
  }
`

const STRINGS_FRAG = /* glsl */ `
// neon tube fragment shader (same as strings page)
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

// ----------------------------------------------------------------------------------
// Entanglement overlay: just two moving points + one connection
// ----------------------------------------------------------------------------------
const EntanglementOverlay = () => {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const frameRef = useRef<number | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const container = containerRef.current
    if (!container) return

    const prefersReducedMotion =
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const motionScale = prefersReducedMotion ? 0.4 : 1.0

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

    // Positions for the two particles in NDC space
    const nodeA = { x: -0.2, y: 0.0 }
    const nodeB = { x: 0.2, y: 0.0 }

    const segmentsPerLink = 120
    const maxPoints = segmentsPerLink

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
    const infinityMorphAmount = ring.infinityMorphEnabled ? 1.0 : 0.0

    const uniforms = {
      uTime: { value: 0 },
      uLoopDuration: { value: ring.loopDurationSeconds },
      uMotionScale: { value: motionScale },

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

      uPointSizeMin: { value: 5.0 },
      uPointSizeMax: { value: 26.0 },
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

    const points = new THREE.Points(geometry, material)
    points.frustumCulled = false
    scene.add(points)

    // Simple endpoints for clarity (white dots at nodeA/B)
    const endpointGeom = new THREE.BufferGeometry()
    const endpointPositions = new Float32Array(2 * 3)
    endpointGeom.setAttribute(
      'position',
      new THREE.BufferAttribute(endpointPositions, 3),
    )
    const endpointMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 10 * dpr,
      sizeAttenuation: false,
    })
    const endpoints = new THREE.Points(endpointGeom, endpointMat)
    endpoints.frustumCulled = false
    scene.add(endpoints)

    // Link envelope
    let linkAlpha = 0
    const fadeInSec = 0.3
    const fadeOutSec = 0.3
    const maxLinkDist = 2
    const minLinkDist = 0.0

    const startTime = performance.now()
    let lastTs = startTime

    const renderLoop = () => {
      const now = performance.now()
      const dt = Math.max(0.001, (now - lastTs) / 1000)
      lastTs = now

      const t = (now - startTime) / 1000

      // --- Motion: oscillate separation between close and far ---
      // phase in [0,1]
      const phase = 0.5 * (Math.sin(t * 0.6 * motionScale) + 1.0)
      const d = 0.08 + (0.9 * phase) // separation along X
      nodeA.x = -d * 0.5
      nodeA.y = 0.0
      nodeB.x = d * 0.5
      nodeB.y = 0.0

      // update endpoint geometry
      endpointPositions[0] = nodeA.x
      endpointPositions[1] = nodeA.y
      endpointPositions[2] = 0
      endpointPositions[3] = nodeB.x
      endpointPositions[4] = nodeB.y
      endpointPositions[5] = 0
      ;(
        endpointGeom.attributes.position as THREE.BufferAttribute
      ).needsUpdate = true

      // --- Link distance + fade ---
      const dx = nodeB.x - nodeA.x
      const dy = nodeB.y - nodeA.y
      const dist = Math.sqrt(dx * dx + dy * dy)

      const within = dist > minLinkDist && dist < maxLinkDist

      const targetAlphaDist = within
        ? 1.0 - (dist - minLinkDist) / (maxLinkDist - minLinkDist)
        : 0.0

      const fadeInRate = fadeInSec > 1e-4 ? dt / fadeInSec : 1.0
      const fadeOutRate = fadeOutSec > 1e-4 ? dt / fadeOutSec : 1.0

      if (targetAlphaDist > linkAlpha) {
        linkAlpha = Math.min(1.0, linkAlpha + fadeInRate)
      } else {
        linkAlpha = Math.max(0.0, linkAlpha - fadeOutRate)
      }

      uniforms.uTime.value = t

      let writeIndex = 0
      if (linkAlpha > 0.01) {
        const len = Math.max(1e-5, Math.sqrt(dx * dx + dy * dy))
        const dirX = dx / len
        const dirY = dy / len
        const normX = -dirY
        const normY = dirX

        const baseStrength = Math.pow(
          Math.max(0, 1.0 - (dist - minLinkDist) / (maxLinkDist - minLinkDist)),
          0.8,
        )

        const strength = baseStrength * linkAlpha
        const seedF = 0.37

        const maxWiggle = 0.02 * motionScale

        for (let s = 0; s < segmentsPerLink; s++) {
          const tSeg =
            segmentsPerLink <= 1 ? 0 : s / (segmentsPerLink - 1)

          let px = nodeA.x + dx * tSeg
          let py = nodeA.y + dy * tSeg

          const wigglePhase =
            seedF * 13.0 + t * 1.3 + tSeg * Math.PI * 2.0
          const wiggleAmp =
            maxWiggle *
            strength *
            (0.4 +
              0.6 * Math.sin(seedF * 27.0 + t * 0.4))
          const w = Math.sin(wigglePhase) * wiggleAmp

          px += normX * w
          py += normY * w

          const idx3 = writeIndex * 3
          positions[idx3 + 0] = px
          positions[idx3 + 1] = py
          positions[idx3 + 2] = 0

          aT[writeIndex] = tSeg
          aIntensity[writeIndex] = strength
          aSeed[writeIndex] = seedF

          writeIndex++
        }
      }

      if (linkAlpha <= 0.01) {
        // hide geometry cleanly
        geometry.setDrawRange(0, 0)
      } else {
        geometry.setDrawRange(0, writeIndex)
      }

      ;(geometry.attributes.position as THREE.BufferAttribute).needsUpdate =
        true
      ;(geometry.attributes.aT as THREE.BufferAttribute).needsUpdate = true
      ;(
        geometry.attributes.aIntensity as THREE.BufferAttribute
      ).needsUpdate = true
      ;(geometry.attributes.aSeed as THREE.BufferAttribute).needsUpdate = true

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
      scene.remove(endpoints)
      geometry.dispose()
      endpointGeom.dispose()
      material.dispose()
      endpointMat.dispose()
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
        zIndex: 0,
      }}
    />
  )
}

// ----------------------------------------------------------------------------------
// Page component
// ----------------------------------------------------------------------------------
const EntanglementPage = () => {
  return (
    <>
      <Head>
        <title>Entanglement — Two-Point String Test</title>
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
        `}</style>
      </Head>

      <main
        style={{
          position: 'relative',
          minHeight: '100vh',
          backgroundColor: '#000',
          color: '#fff',
          fontFamily:
            '-apple-system, BlinkMacSystemFont, system-ui, sans-serif',
        }}
      >
        <EntanglementOverlay />

        <div
          style={{
            position: 'absolute',
            top: '1.5rem',
            left: '50%',
            transform: 'translateX(-50%)',
            textAlign: 'center',
            pointerEvents: 'none',
          }}
        >
          <div
            style={{
              letterSpacing: '0.28em',
              textTransform: 'uppercase',
              fontSize: '0.8rem',
              opacity: 0.7,
            }}
          >
            Entanglement Test
          </div>
          <div
            style={{
              marginTop: '0.5rem',
              fontSize: '0.75rem',
              opacity: 0.6,
            }}
          >
            Two particles connected by a neon string.
            The string fades as they move apart, then returns as they come
            back together.
          </div>
        </div>
      </main>
    </>
  )
}

export default EntanglementPage
