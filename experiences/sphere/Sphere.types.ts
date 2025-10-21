export type Vec3 = [number, number, number]

export type RectAreaLightCfg = {
  color: string | number
  intensity: number
  size: { width: number; height: number }
  position: Vec3
  lookAt?: Vec3
}

export type EasingName =
  | 'linear'
  | 'quadOut'
  | 'cubicOut'
  | 'quartOut'
  | 'quintOut'
  | 'expoOut'
  | 'circOut'

export type ThemeCfg = {
  backgroundBottom: string
  backgroundTop: string
  vignette: { centerStopPct: number; edgeAlpha: number }
}

export type GradientQualityCfg = {
  materialDithering: boolean
  overlay: {
    enabled: boolean
    opacity: number
    sizePx: number
    blendMode: 'soft-light' | 'overlay' | 'normal'
  }
  extraStopsEnabled: boolean
}

export type LookCfg = {
  warmth: number
  warmTint: string | number
  coolTint: string | number
  influence: {
    key: number
    fill: number
    rim: number
    hemisphere: number
    ambient: number
  }
  shadowLift: number
  shadowTint: string | number
  materialLighten: number
  gradientQuality: GradientQualityCfg
}

export type Config = {
  renderer: { antialias: boolean; alpha: boolean; exposure: number }
  camera: { fov: number; near: number; far: number; position: Vec3 }
  lights: {
    ambient: { color: string | number; intensity: number }
    hemisphere: { sky: string | number; ground: string | number; intensity: number }
    rectKey: RectAreaLightCfg
    rectFill: RectAreaLightCfg
    rim: { color: string | number; intensity: number; position: Vec3 }
  }
  material: { color: string | number; roughness: number; metalness: number; envMapIntensity: number }
  layout: { goldenRatio: number }
  theme: ThemeCfg
  look: LookCfg
  behavior: {
    capLightFront: boolean
    maxFrontAlignmentDot: number
    lightFrontSoftKnee: number
    lightFrontResponse: number
    intro: {
      enabled: boolean
      holdMs: number
      durationMs: number
      easing: EasingName
      endAlignmentDot: number
      endAzimuthDeg: number
    }
    lightAutoAlign: {
      enabled: boolean
      targetDot: number
      deadZone: number
      response: number
      postIntroDelayMs: number
      resumeAfterGestureMs: number | null
    }
    inertia: {
      enabled: boolean
      durationMs: number
      scale: number
      easing: EasingName
      minVelocity: number
    }
    rotationCap: {
      enabled: boolean
      fractionOfHalfTurn: number
      dragLerp: number
      snapDurationMs: number
      snapEasing: EasingName
      epsilonRad: number
    }
    rotationLock: {
      enabled: boolean
      axis: Vec3
      polarDeg: number | null
      azimuthSnapDeg: number | null
      fixedAzimuthDeg: number | null
      whileDragging: boolean
      smooth: number
    }
    slideTilt: {
      enabled: boolean
      axis: 'x' | 'y' | 'z'
      stepDeg: number
      directionAware: boolean
      mode: 'fixed' | 'fullTurnBySlides'
    }
    drag: { scale: number }
    carouselFade: {
      enabled: boolean
      shareOfIntro: number
      overlapMs: number
      durationMs: number
      cssTiming: string
    }
    /** Continuous key-light spin controller */
    lightSpin: {
      enabled: boolean
      /** steady-state minimum baseline (rotations/sec, azimuth) after landing */
      yawRps: number
      /** optional baseline pitch rotations per second (ignored if elevation is locked) */
      pitchRps?: number
      /** exponential damping (1/sec) for user-imparted angular velocity */
      dampingPerSecond: number
      /** clamp for angular speed (rad/s) */
      maxRadPerSec: number
      /** gain mapping drag velocity → angular velocity */
      impulseScale: number
      /** post-intro auto segment settings */
      auto: {
        enabled: boolean
        /** maximum azimuthal displacement the auto segment is allowed to traverse (degrees) */
        maxAzimuthDeg: number
        /** start speed of the auto segment (rotations/sec) */
        startYawRps: number
        /** target speed to land on at the end of the auto segment (rotations/sec). Should match/approach yawRps. */
        endYawRps: number
        /** easing used to ramp speed from startYawRps → endYawRps across the consumed displacement */
        easing: EasingName
      }
      /** Optional intro → auto handoff controller */
      handoff?: {
        enabled: boolean
        /** duration of the (legacy) one-piece handoff window in milliseconds */
        durationMs: number
        /** (fallback) bump amplitude as a fraction of |w_target0| (0..1) */
        bumpAmp: number
        /** easing used to blend velocities during handoff */
        easing: EasingName
        /** Elastic profile (subtle overshoot + tiny rebound, then settle) */
        elastic?: {
          enabled: boolean
          /** peak amplitude as a fraction of |w_target0| (e.g., 0.10 = ±10%) */
          amp: number
          /** exponential decay factor applied over t∈[0,1] (higher = quicker settle) */
          decay: number
          /** number of oscillation cycles over [0,1] (1 = one overshoot + one rebound) */
          cycles: number
        }
        /** Explicit direction flip (left decel → right accel) */
        flip?: {
          enabled: boolean
          /** elastic deceleration time (ms) while still going left */
          decelMs: number
          /** acceleration time (ms) when restarting to the right */
          accelMs: number
          /** elastic amplitude on decel as fraction of |w_start| (0..1) */
          decelElasticAmp: number
          /** exponential decay for decel elasticity */
          decelDecay: number
          /** easing (OUT) name used for accel; mirrored to IN at runtime */
          accelEasing: EasingName
          /** NEW: extra shaping for an even softer start (t^accelPower), >=1 */
          accelPower?: number
        }
      }
    }
  }
}

/* ---------------------------- Parameter object ------------------------------- */
export type Params = {
  exposure: number
  theme: {
    backgroundTop: string
    backgroundBottom: string
    vignetteCenterPct: number
    vignetteEdgeAlpha: number
  }
  composition: { sphereScaleDivisor: number }
  camera: { fov: number; near: number; far: number; distanceZ: number }
  lights: {
    ambient: { intensity: number; color: string | number }
    hemisphere: { intensity: number; sky: string | number; ground: string | number }
    key: {
      intensity: number
      size: { width: number; height: number }
      position: Vec3
      color: string | number
      lockElevation: boolean
      dragSensitivity: number
    }
    fill: { intensity: number; size: { width: number; height: number }; position: Vec3; color: string | number }
    rim: { intensity: number; position: Vec3; color: string | number }
  }
  material: { color: string | number; roughness: number; metalness: number; envMapIntensity: number }
  look: LookCfg
  motion: {
    intro: {
      enabled: boolean
      holdMs: number
      durationMs: number
      easing: EasingName
      endAlignmentDot: number
      endAzimuthDeg: number
    }
    inertia: { enabled: boolean; durationMs: number; scale: number; easing: EasingName; minVelocity: number }
    lightAutoAlign: {
      enabled: boolean
      targetDot: number
      deadZone: number
      response: number
      postIntroDelayMs: number
      resumeAfterGestureMs: number | null
    }
    rotationCap: { enabled: boolean; fractionOfHalfTurn: number; dragLerp: number; snapDurationMs: number; snapEasing: EasingName; epsilonRad: number }
    rotationLock: { enabled: boolean; axis: Vec3; polarDeg: number | null; azimuthSnapDeg: number | null; fixedAzimuthDeg: number | null; whileDragging: boolean; smooth: number }
    slideTilt: { enabled: boolean; axis: 'x' | 'y' | 'z'; stepDeg: number; directionAware: boolean; mode: 'fixed' }
    drag: { scale: number }
    carouselFade: Config['behavior']['carouselFade']
    /** light spin (with auto segment + optional handoff) */
    lightSpin: Config['behavior']['lightSpin']
  }
}
