/** Literal Tailwind typography tokens shared by referential config scopes. */
export const FONT_SIZE_OPTIONS = [
  { label: 'text-xs', value: 'text-xs' }, { label: 'text-sm', value: 'text-sm' },
  { label: 'text-base', value: 'text-base' }, { label: 'text-lg', value: 'text-lg' },
  { label: 'text-xl', value: 'text-xl' }, { label: 'text-2xl', value: 'text-2xl' },
  { label: 'text-3xl', value: 'text-3xl' }, { label: 'text-4xl', value: 'text-4xl' },
  { label: 'text-5xl', value: 'text-5xl' }, { label: 'text-6xl', value: 'text-6xl' },
] as const;
export type FontSizeClass = typeof FONT_SIZE_OPTIONS[number]['value'];

/** `inherit` deliberately emits no class; the remaining values are literal
 * Tailwind font-family utilities. */
export const FONT_FAMILY_OPTIONS = [
  { label: 'inherit', value: 'inherit' },
  { label: 'Serif — Instrument Serif', value: 'font-serif' },
  { label: 'Sans — Instrument Sans', value: 'font-sans' },
] as const;
export type FontFamilyClass = typeof FONT_FAMILY_OPTIONS[number]['value'];

export const MD_FONT_SIZE_OPTIONS = [
  { label: 'md:text-xs', value: 'md:text-xs' }, { label: 'md:text-sm', value: 'md:text-sm' },
  { label: 'md:text-base', value: 'md:text-base' }, { label: 'md:text-lg', value: 'md:text-lg' },
  { label: 'md:text-xl', value: 'md:text-xl' }, { label: 'md:text-2xl', value: 'md:text-2xl' },
  { label: 'md:text-3xl', value: 'md:text-3xl' }, { label: 'md:text-4xl', value: 'md:text-4xl' },
  { label: 'md:text-5xl', value: 'md:text-5xl' }, { label: 'md:text-6xl', value: 'md:text-6xl' },
] as const;
export type MdFontSizeClass = typeof MD_FONT_SIZE_OPTIONS[number]['value'];

export const FONT_WEIGHT_OPTIONS = [
  { label: 'font-normal', value: 'font-normal' },
  { label: 'font-medium', value: 'font-medium' },
  { label: 'font-semibold', value: 'font-semibold' },
  { label: 'font-bold', value: 'font-bold' },
] as const;
export type FontWeightClass = typeof FONT_WEIGHT_OPTIONS[number]['value'];

export const LEADING_OPTIONS = [
  { label: 'leading-none', value: 'leading-none' },
  { label: 'leading-tight', value: 'leading-tight' },
  { label: 'leading-snug', value: 'leading-snug' },
  { label: 'leading-normal', value: 'leading-normal' },
  { label: 'leading-relaxed', value: 'leading-relaxed' },
  { label: 'leading-loose', value: 'leading-loose' },
] as const;
export type LeadingClass = typeof LEADING_OPTIONS[number]['value'];

export const TRACKING_OPTIONS = [
  { label: 'tracking-tighter', value: 'tracking-tighter' },
  { label: 'tracking-tight', value: 'tracking-tight' },
  { label: 'tracking-normal', value: 'tracking-normal' },
  { label: 'tracking-wide', value: 'tracking-wide' },
  { label: 'tracking-wider', value: 'tracking-wider' },
  { label: 'tracking-widest', value: 'tracking-widest' },
] as const;
export type TrackingClass = typeof TRACKING_OPTIONS[number]['value'];

export const RADIUS_OPTIONS = [
  { label: 'rounded-none', value: 'rounded-none' }, { label: 'rounded-sm', value: 'rounded-sm' },
  { label: 'rounded', value: 'rounded' }, { label: 'rounded-md', value: 'rounded-md' },
  { label: 'rounded-lg', value: 'rounded-lg' }, { label: 'rounded-xl', value: 'rounded-xl' },
  { label: 'rounded-2xl', value: 'rounded-2xl' },
] as const;
export type RadiusClass = typeof RADIUS_OPTIONS[number]['value'];

export const MAX_WIDTH_OPTIONS = [
  { label: 'max-w-xs', value: 'max-w-xs' }, { label: 'max-w-sm', value: 'max-w-sm' },
  { label: 'max-w-md', value: 'max-w-md' }, { label: 'max-w-lg', value: 'max-w-lg' },
  { label: 'max-w-xl', value: 'max-w-xl' }, { label: 'max-w-2xl', value: 'max-w-2xl' },
  { label: 'max-w-3xl', value: 'max-w-3xl' }, { label: 'max-w-prose', value: 'max-w-prose' },
] as const;
export type MaxWidthClass = typeof MAX_WIDTH_OPTIONS[number]['value'];

export const BORDER_LEFT_WIDTH_OPTIONS = [
  { label: 'border-l', value: 'border-l' }, { label: 'border-l-2', value: 'border-l-2' },
  { label: 'border-l-4', value: 'border-l-4' }, { label: 'border-l-8', value: 'border-l-8' },
] as const;
export type BorderLeftWidthClass = typeof BORDER_LEFT_WIDTH_OPTIONS[number]['value'];
