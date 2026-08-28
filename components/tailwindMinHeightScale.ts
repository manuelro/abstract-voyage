/**
 * Literal min-height classes for a content container that needs guaranteed
 * vertical room to be meaningfully vertically-aligned within — without a
 * min-height, a short container has no slack for e.g. `justify-center` to
 * distribute, and visually sits wherever its own natural height happens to
 * land. `min-h-0` (the default) reproduces today's behavior exactly: no
 * minimum, the container is only as tall as its content. Each value is a
 * complete literal string (never assembled via `` `min-h-[${n}px]` `` at
 * runtime), so Tailwind's JIT can see and compile every one of them — same
 * rationale as tailwindWidthScale.ts/tailwindSpacingScale.ts.
 */

export const CONTENT_MIN_HEIGHT_OPTIONS = [
  { label: 'min-h-0 (none)', value: 'min-h-0' },
  { label: 'min-h-[120px]', value: 'min-h-[120px]' },
  { label: 'min-h-[200px]', value: 'min-h-[200px]' },
  { label: 'min-h-[320px]', value: 'min-h-[320px]' },
  { label: 'min-h-[480px]', value: 'min-h-[480px]' },
  { label: 'min-h-[640px]', value: 'min-h-[640px]' },
  { label: 'min-h-[50dvh]', value: 'min-h-[50dvh]' },
  { label: 'min-h-[75dvh]', value: 'min-h-[75dvh]' },
  { label: 'min-h-full', value: 'min-h-full' },
] as const;

export type ContentMinHeightClass = typeof CONTENT_MIN_HEIGHT_OPTIONS[number]['value'];
