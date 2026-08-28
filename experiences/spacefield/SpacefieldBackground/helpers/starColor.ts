/**
 * Approximates blackbody radiation color (Tanner Helland's widely-used
 * fit to Mitchell Charity's blackbody data), the same physical
 * relationship that gives real stars their color: cooler stars (~2000-
 * 3500K) read deep red/orange, sun-like stars (~5000-6000K) read
 * white-yellow, and hot stars (~10000K+) read blue-white. Input/output
 * range is clamped to what this component actually samples from
 * (SpacefieldConfig's temperatureMinK/temperatureMaxK), well inside the
 * fit's valid 1000-40000K domain.
 */
export function temperatureToRgb(kelvinRaw: number): [number, number, number] {
  const kelvin = Math.min(400, Math.max(10, kelvinRaw / 100));

  const red = kelvin <= 66
    ? 255
    : 329.698727446 * (kelvin - 60) ** -0.1332047592;
  const green = kelvin <= 66
    ? 99.4708025861 * Math.log(kelvin) - 161.1195681661
    : 288.1221695283 * (kelvin - 60) ** -0.0755148492;
  const blue = kelvin >= 66
    ? 255
    : kelvin <= 19
      ? 0
      : 138.5177312231 * Math.log(kelvin - 10) - 305.0447927307;

  const to01 = (value: number) => Math.min(255, Math.max(0, value)) / 255;
  return [to01(red), to01(green), to01(blue)];
}

/**
 * 1 = the blackbody color unchanged; below 1 pulls each channel toward
 * white (a washed-out, more uniform field); above 1 pushes further from
 * white (more distinctly tinted stars). Applied post-blackbody rather than
 * as a second, independent color model — this is a dial on the same
 * physical color, not an unrelated stylistic tint.
 */
export function applyColorSaturation(
  rgb: [number, number, number],
  saturation: number,
): [number, number, number] {
  return rgb.map(channel => Math.min(1, Math.max(0, 1 + (channel - 1) * saturation))) as [
    number, number, number,
  ];
}

function parseHexColor(value: string): [number, number, number] {
  const match = /^#([0-9a-f]{6})$/i.exec(value);
  if (!match) return [255, 255, 255];
  const parsed = Number.parseInt(match[1], 16);
  return [(parsed >> 16) & 255, (parsed >> 8) & 255, parsed & 255];
}

/** `#rrggbb` → `rgba(r, g, b, alpha)` — used for the focal-point glow's CSS
 * radial-gradient (see SpacefieldBackground's focalGlowColor handling),
 * mirroring the same small hex-to-rgba pattern BorealisBackground.tsx
 * already uses for its own fallback gradient. */
export function hexColorWithAlpha(value: string, alpha: number): string {
  const [r, g, b] = parseHexColor(value);
  return `rgba(${r}, ${g}, ${b}, ${Math.min(1, Math.max(0, alpha))})`;
}
