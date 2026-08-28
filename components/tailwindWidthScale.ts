/**
 * Literal percentage-of-parent max-width classes for a content container
 * sitting inside a split-column layout's own column (e.g. a table-of-
 * contents block narrower than its column). Tailwind's own max-w-* scale is
 * rem-based (max-w-xs...max-w-prose, see tailwindTypographyScale.ts) — there
 * is no built-in percentage step, so this is a curated set of literal
 * arbitrary-value classes, each spelled out in full (never assembled via
 * `` `max-w-[${n}%]` `` at runtime) so Tailwind's JIT can see and compile
 * every one of them.
 *
 * `md:`-prefixed ("Wide"): these apply once a split-column layout's own
 * two-column state is active (SplitColumnLayout's grid splits at md). Below
 * md, a content container inside a split column should carry no width class
 * at all and render full-width — there is no second column to size against
 * yet, which is why `CONTENT_WIDTH_PERCENT_OPTIONS`/`CONTENT_WIDTH_PERCENT_LG_OPTIONS`
 * below stayed unadded for a long time (this file's own earlier version said
 * so outright). That reasoning holds for a column-relative consumer, but not
 * for every consumer — a header's own always-full-width row (never split
 * into columns at any breakpoint) can still usefully cap its content
 * narrower and align it within that row at any tier, which is what these two
 * unprefixed/`lg:`-prefixed siblings exist for
 * (`pages/posts-lab/postLab.config.ts`'s own header segment width fields).
 * Existing column-relative consumers (e.g. the body's own
 * `narrowColumnContentWidthWide`) have no need for these new tiers and
 * aren't required to adopt them just because they now exist.
 */

export const CONTENT_WIDTH_PERCENT_OPTIONS = [
  { label: 'max-w-[40%]', value: 'max-w-[40%]' },
  { label: 'max-w-[50%]', value: 'max-w-[50%]' },
  { label: 'max-w-[60%]', value: 'max-w-[60%]' },
  { label: 'max-w-[70%]', value: 'max-w-[70%]' },
  { label: 'max-w-[80%]', value: 'max-w-[80%]' },
  { label: 'max-w-[90%]', value: 'max-w-[90%]' },
  { label: 'max-w-[100%]', value: 'max-w-[100%]' },
] as const;

export type ContentWidthPercentClass = typeof CONTENT_WIDTH_PERCENT_OPTIONS[number]['value'];

export const CONTENT_WIDTH_PERCENT_WIDE_OPTIONS = [
  { label: 'md:max-w-[40%]', value: 'md:max-w-[40%]' },
  { label: 'md:max-w-[50%]', value: 'md:max-w-[50%]' },
  { label: 'md:max-w-[60%]', value: 'md:max-w-[60%]' },
  { label: 'md:max-w-[70%]', value: 'md:max-w-[70%]' },
  { label: 'md:max-w-[80%]', value: 'md:max-w-[80%]' },
  { label: 'md:max-w-[90%]', value: 'md:max-w-[90%]' },
  { label: 'md:max-w-[100%]', value: 'md:max-w-[100%]' },
] as const;

export type ContentWidthPercentWideClass = typeof CONTENT_WIDTH_PERCENT_WIDE_OPTIONS[number]['value'];

export const CONTENT_WIDTH_PERCENT_LG_OPTIONS = [
  { label: 'lg:max-w-[40%]', value: 'lg:max-w-[40%]' },
  { label: 'lg:max-w-[50%]', value: 'lg:max-w-[50%]' },
  { label: 'lg:max-w-[60%]', value: 'lg:max-w-[60%]' },
  { label: 'lg:max-w-[70%]', value: 'lg:max-w-[70%]' },
  { label: 'lg:max-w-[80%]', value: 'lg:max-w-[80%]' },
  { label: 'lg:max-w-[90%]', value: 'lg:max-w-[90%]' },
  { label: 'lg:max-w-[100%]', value: 'lg:max-w-[100%]' },
] as const;

export type ContentWidthPercentLgClass = typeof CONTENT_WIDTH_PERCENT_LG_OPTIONS[number]['value'];
