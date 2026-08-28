export const PROCEDURAL_COLOR_MIN_TEXTURE_RESOLUTION = 64;
export const PROCEDURAL_COLOR_MAX_TEXTURE_RESOLUTION = 1024;
export const PROCEDURAL_COLOR_TEXTURE_RESOLUTION_STEP = 8;
export const PROCEDURAL_COLOR_MAX_DEVICE_PIXEL_RATIO = 2;

export type MaxVisibleParticleVminParams = {
  size: number;
  kaleidoscopeEnabled: boolean;
  kaleidoscopeSphereScale: number;
  starfieldEnabled: boolean;
  starfieldMaxSize: number;
};

export type ProceduralColorResolutionParams = {
  configuredResolution: number;
  viewportWidth: number;
  viewportHeight: number;
  devicePixelRatio: number;
  visualSizeVmin: number;
  faceReach: number;
};

export type ProceduralColorResolutionResult = {
  resolutionCap: number;
  viewportVminPx: number;
  viewportDpr: number;
  idealResolution: number;
  resolution: number;
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

export function getMaxVisibleParticleVmin({
  size,
  kaleidoscopeEnabled,
  kaleidoscopeSphereScale,
  starfieldEnabled,
  starfieldMaxSize,
}: MaxVisibleParticleVminParams) {
  return Math.max(
    size,
    kaleidoscopeEnabled ? size * clamp(kaleidoscopeSphereScale, 0.8, 3) : 0,
    starfieldEnabled ? clamp(starfieldMaxSize, 1, 90) : 0,
  );
}

export function resolveProceduralColorResolution({
  configuredResolution,
  viewportWidth,
  viewportHeight,
  devicePixelRatio,
  visualSizeVmin,
  faceReach,
}: ProceduralColorResolutionParams): ProceduralColorResolutionResult {
  const resolutionCap = Math.round(clamp(
    configuredResolution,
    PROCEDURAL_COLOR_MIN_TEXTURE_RESOLUTION,
    PROCEDURAL_COLOR_MAX_TEXTURE_RESOLUTION,
  ));
  const viewportVminPx = Math.min(viewportWidth || 1080, viewportHeight || 1080);
  const viewportDpr = clamp(
    devicePixelRatio || 1,
    1,
    PROCEDURAL_COLOR_MAX_DEVICE_PIXEL_RATIO,
  );
  const idealResolution = Math.ceil(
    (viewportVminPx * (visualSizeVmin / 100) * faceReach * viewportDpr)
    / PROCEDURAL_COLOR_TEXTURE_RESOLUTION_STEP,
  ) * PROCEDURAL_COLOR_TEXTURE_RESOLUTION_STEP;
  const resolution = Math.round(clamp(
    idealResolution,
    PROCEDURAL_COLOR_MIN_TEXTURE_RESOLUTION,
    resolutionCap,
  ));

  return {
    resolutionCap,
    viewportVminPx,
    viewportDpr,
    idealResolution,
    resolution,
  };
}
