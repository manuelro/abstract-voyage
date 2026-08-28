/**
 * Tailwind's complete default spacing scale — one literal options array per
 * CSS-property prefix, for the `Select` panel control (see
 * components/Panel/index.tsx) that spacing fields like SectionHeading's and
 * EditorialSection's own render through.
 *
 * Every entry is a genuine Tailwind default-theme step, not a curated
 * subset (0, 0.5, 1, 1.5 ... 96 — 2px increments below 16px, 4px from
 * 16-48px, 8px from 48-64px, 16px from 64-256px, 32px beyond). Each
 * `value` is a complete literal string (never assembled via
 * `` `px-${n}` `` at runtime), so Tailwind's JIT can see and compile every
 * one of them. `as const` (not a widened `ReadonlyArray<...>` annotation)
 * is what lets each field's own type union below derive automatically
 * from these values, instead of having to spell out ~34 union members by
 * hand a second time.
 *
 * `Select` (a native <select>), not `SegmentedControl` (a button row) —
 * SegmentedControl's fixed even-split grid becomes illegible well before
 * 34 options; a real dropdown scales to this list naturally, and reads as
 * "choose a Tailwind class" rather than "drag a slider."
 */

export const PADDING_X_OPTIONS = [
  { label: 'px-0', value: 'px-0' },
  { label: 'px-0.5', value: 'px-0.5' },
  { label: 'px-1', value: 'px-1' },
  { label: 'px-1.5', value: 'px-1.5' },
  { label: 'px-2', value: 'px-2' },
  { label: 'px-2.5', value: 'px-2.5' },
  { label: 'px-3', value: 'px-3' },
  { label: 'px-3.5', value: 'px-3.5' },
  { label: 'px-4', value: 'px-4' },
  { label: 'px-5', value: 'px-5' },
  { label: 'px-6', value: 'px-6' },
  { label: 'px-7', value: 'px-7' },
  { label: 'px-8', value: 'px-8' },
  { label: 'px-9', value: 'px-9' },
  { label: 'px-10', value: 'px-10' },
  { label: 'px-11', value: 'px-11' },
  { label: 'px-12', value: 'px-12' },
  { label: 'px-14', value: 'px-14' },
  { label: 'px-16', value: 'px-16' },
  { label: 'px-20', value: 'px-20' },
  { label: 'px-24', value: 'px-24' },
  { label: 'px-28', value: 'px-28' },
  { label: 'px-32', value: 'px-32' },
  { label: 'px-36', value: 'px-36' },
  { label: 'px-40', value: 'px-40' },
  { label: 'px-44', value: 'px-44' },
  { label: 'px-48', value: 'px-48' },
  { label: 'px-52', value: 'px-52' },
  { label: 'px-56', value: 'px-56' },
  { label: 'px-60', value: 'px-60' },
  { label: 'px-64', value: 'px-64' },
  { label: 'px-72', value: 'px-72' },
  { label: 'px-80', value: 'px-80' },
  { label: 'px-96', value: 'px-96' },
] as const;

export type PaddingXClass = typeof PADDING_X_OPTIONS[number]['value'];

/**
 * Same scale as PADDING_X_OPTIONS, `md:`-prefixed — for content-container
 * fields that follow this codebase's established "*Wide" convention (apply
 * only at md and up, mobile stays on its own separate, often asymmetric or
 * live-measured value — see e.g. PostLabPageLayoutConfig's own
 * narrowColumnContentWidthWide doc comment for why). A literal second array,
 * not `md:${value}` built at render time — Tailwind's JIT only compiles
 * complete literal class strings, per this codebase's Tailwind-only styling
 * rule.
 */
export const PADDING_X_WIDE_OPTIONS = [
  { label: 'md:px-0', value: 'md:px-0' },
  { label: 'md:px-0.5', value: 'md:px-0.5' },
  { label: 'md:px-1', value: 'md:px-1' },
  { label: 'md:px-1.5', value: 'md:px-1.5' },
  { label: 'md:px-2', value: 'md:px-2' },
  { label: 'md:px-2.5', value: 'md:px-2.5' },
  { label: 'md:px-3', value: 'md:px-3' },
  { label: 'md:px-3.5', value: 'md:px-3.5' },
  { label: 'md:px-4', value: 'md:px-4' },
  { label: 'md:px-5', value: 'md:px-5' },
  { label: 'md:px-6', value: 'md:px-6' },
  { label: 'md:px-7', value: 'md:px-7' },
  { label: 'md:px-8', value: 'md:px-8' },
  { label: 'md:px-9', value: 'md:px-9' },
  { label: 'md:px-10', value: 'md:px-10' },
  { label: 'md:px-11', value: 'md:px-11' },
  { label: 'md:px-12', value: 'md:px-12' },
  { label: 'md:px-14', value: 'md:px-14' },
  { label: 'md:px-16', value: 'md:px-16' },
  { label: 'md:px-20', value: 'md:px-20' },
  { label: 'md:px-24', value: 'md:px-24' },
  { label: 'md:px-28', value: 'md:px-28' },
  { label: 'md:px-32', value: 'md:px-32' },
  { label: 'md:px-36', value: 'md:px-36' },
  { label: 'md:px-40', value: 'md:px-40' },
  { label: 'md:px-44', value: 'md:px-44' },
  { label: 'md:px-48', value: 'md:px-48' },
  { label: 'md:px-52', value: 'md:px-52' },
  { label: 'md:px-56', value: 'md:px-56' },
  { label: 'md:px-60', value: 'md:px-60' },
  { label: 'md:px-64', value: 'md:px-64' },
  { label: 'md:px-72', value: 'md:px-72' },
  { label: 'md:px-80', value: 'md:px-80' },
  { label: 'md:px-96', value: 'md:px-96' },
] as const;

export type PaddingXWideClass = typeof PADDING_X_WIDE_OPTIONS[number]['value'];

export const PADDING_Y_OPTIONS = [
  { label: 'py-0', value: 'py-0' },
  { label: 'py-0.5', value: 'py-0.5' },
  { label: 'py-1', value: 'py-1' },
  { label: 'py-1.5', value: 'py-1.5' },
  { label: 'py-2', value: 'py-2' },
  { label: 'py-2.5', value: 'py-2.5' },
  { label: 'py-3', value: 'py-3' },
  { label: 'py-3.5', value: 'py-3.5' },
  { label: 'py-4', value: 'py-4' },
  { label: 'py-5', value: 'py-5' },
  { label: 'py-6', value: 'py-6' },
  { label: 'py-7', value: 'py-7' },
  { label: 'py-8', value: 'py-8' },
  { label: 'py-9', value: 'py-9' },
  { label: 'py-10', value: 'py-10' },
  { label: 'py-11', value: 'py-11' },
  { label: 'py-12', value: 'py-12' },
  { label: 'py-14', value: 'py-14' },
  { label: 'py-16', value: 'py-16' },
  { label: 'py-20', value: 'py-20' },
  { label: 'py-24', value: 'py-24' },
  { label: 'py-28', value: 'py-28' },
  { label: 'py-32', value: 'py-32' },
  { label: 'py-36', value: 'py-36' },
  { label: 'py-40', value: 'py-40' },
  { label: 'py-44', value: 'py-44' },
  { label: 'py-48', value: 'py-48' },
  { label: 'py-52', value: 'py-52' },
  { label: 'py-56', value: 'py-56' },
  { label: 'py-60', value: 'py-60' },
  { label: 'py-64', value: 'py-64' },
  { label: 'py-72', value: 'py-72' },
  { label: 'py-80', value: 'py-80' },
  { label: 'py-96', value: 'py-96' },
] as const;

export type PaddingYClass = typeof PADDING_Y_OPTIONS[number]['value'];

export const PADDING_OPTIONS = [
  { label: 'p-0', value: 'p-0' },
  { label: 'p-0.5', value: 'p-0.5' },
  { label: 'p-1', value: 'p-1' },
  { label: 'p-1.5', value: 'p-1.5' },
  { label: 'p-2', value: 'p-2' },
  { label: 'p-2.5', value: 'p-2.5' },
  { label: 'p-3', value: 'p-3' },
  { label: 'p-3.5', value: 'p-3.5' },
  { label: 'p-4', value: 'p-4' },
  { label: 'p-5', value: 'p-5' },
  { label: 'p-6', value: 'p-6' },
  { label: 'p-7', value: 'p-7' },
  { label: 'p-8', value: 'p-8' },
  { label: 'p-9', value: 'p-9' },
  { label: 'p-10', value: 'p-10' },
  { label: 'p-11', value: 'p-11' },
  { label: 'p-12', value: 'p-12' },
  { label: 'p-14', value: 'p-14' },
  { label: 'p-16', value: 'p-16' },
  { label: 'p-20', value: 'p-20' },
  { label: 'p-24', value: 'p-24' },
  { label: 'p-28', value: 'p-28' },
  { label: 'p-32', value: 'p-32' },
  { label: 'p-36', value: 'p-36' },
  { label: 'p-40', value: 'p-40' },
  { label: 'p-44', value: 'p-44' },
  { label: 'p-48', value: 'p-48' },
  { label: 'p-52', value: 'p-52' },
  { label: 'p-56', value: 'p-56' },
  { label: 'p-60', value: 'p-60' },
  { label: 'p-64', value: 'p-64' },
  { label: 'p-72', value: 'p-72' },
  { label: 'p-80', value: 'p-80' },
  { label: 'p-96', value: 'p-96' },
] as const;

export type PaddingClass = typeof PADDING_OPTIONS[number]['value'];

export const MARGIN_TOP_OPTIONS = [
  { label: 'mt-0', value: 'mt-0' },
  { label: 'mt-0.5', value: 'mt-0.5' },
  { label: 'mt-1', value: 'mt-1' },
  { label: 'mt-1.5', value: 'mt-1.5' },
  { label: 'mt-2', value: 'mt-2' },
  { label: 'mt-2.5', value: 'mt-2.5' },
  { label: 'mt-3', value: 'mt-3' },
  { label: 'mt-3.5', value: 'mt-3.5' },
  { label: 'mt-4', value: 'mt-4' },
  { label: 'mt-5', value: 'mt-5' },
  { label: 'mt-6', value: 'mt-6' },
  { label: 'mt-7', value: 'mt-7' },
  { label: 'mt-8', value: 'mt-8' },
  { label: 'mt-9', value: 'mt-9' },
  { label: 'mt-10', value: 'mt-10' },
  { label: 'mt-11', value: 'mt-11' },
  { label: 'mt-12', value: 'mt-12' },
  { label: 'mt-14', value: 'mt-14' },
  { label: 'mt-16', value: 'mt-16' },
  { label: 'mt-20', value: 'mt-20' },
  { label: 'mt-24', value: 'mt-24' },
  { label: 'mt-28', value: 'mt-28' },
  { label: 'mt-32', value: 'mt-32' },
  { label: 'mt-36', value: 'mt-36' },
  { label: 'mt-40', value: 'mt-40' },
  { label: 'mt-44', value: 'mt-44' },
  { label: 'mt-48', value: 'mt-48' },
  { label: 'mt-52', value: 'mt-52' },
  { label: 'mt-56', value: 'mt-56' },
  { label: 'mt-60', value: 'mt-60' },
  { label: 'mt-64', value: 'mt-64' },
  { label: 'mt-72', value: 'mt-72' },
  { label: 'mt-80', value: 'mt-80' },
  { label: 'mt-96', value: 'mt-96' },
] as const;

export type MarginTopClass = typeof MARGIN_TOP_OPTIONS[number]['value'];

export const MARGIN_BOTTOM_OPTIONS = [
  { label: 'mb-0', value: 'mb-0' },
  { label: 'mb-0.5', value: 'mb-0.5' },
  { label: 'mb-1', value: 'mb-1' },
  { label: 'mb-1.5', value: 'mb-1.5' },
  { label: 'mb-2', value: 'mb-2' },
  { label: 'mb-2.5', value: 'mb-2.5' },
  { label: 'mb-3', value: 'mb-3' },
  { label: 'mb-3.5', value: 'mb-3.5' },
  { label: 'mb-4', value: 'mb-4' },
  { label: 'mb-5', value: 'mb-5' },
  { label: 'mb-6', value: 'mb-6' },
  { label: 'mb-7', value: 'mb-7' },
  { label: 'mb-8', value: 'mb-8' },
  { label: 'mb-9', value: 'mb-9' },
  { label: 'mb-10', value: 'mb-10' },
  { label: 'mb-11', value: 'mb-11' },
  { label: 'mb-12', value: 'mb-12' },
  { label: 'mb-14', value: 'mb-14' },
  { label: 'mb-16', value: 'mb-16' },
  { label: 'mb-20', value: 'mb-20' },
  { label: 'mb-24', value: 'mb-24' },
  { label: 'mb-28', value: 'mb-28' },
  { label: 'mb-32', value: 'mb-32' },
  { label: 'mb-36', value: 'mb-36' },
  { label: 'mb-40', value: 'mb-40' },
  { label: 'mb-44', value: 'mb-44' },
  { label: 'mb-48', value: 'mb-48' },
  { label: 'mb-52', value: 'mb-52' },
  { label: 'mb-56', value: 'mb-56' },
  { label: 'mb-60', value: 'mb-60' },
  { label: 'mb-64', value: 'mb-64' },
  { label: 'mb-72', value: 'mb-72' },
  { label: 'mb-80', value: 'mb-80' },
  { label: 'mb-96', value: 'mb-96' },
] as const;

export type MarginBottomClass = typeof MARGIN_BOTTOM_OPTIONS[number]['value'];

export const PADDING_BOTTOM_OPTIONS = [
  { label: 'pb-0', value: 'pb-0' },
  { label: 'pb-0.5', value: 'pb-0.5' },
  { label: 'pb-1', value: 'pb-1' },
  { label: 'pb-1.5', value: 'pb-1.5' },
  { label: 'pb-2', value: 'pb-2' },
  { label: 'pb-2.5', value: 'pb-2.5' },
  { label: 'pb-3', value: 'pb-3' },
  { label: 'pb-3.5', value: 'pb-3.5' },
  { label: 'pb-4', value: 'pb-4' },
  { label: 'pb-5', value: 'pb-5' },
  { label: 'pb-6', value: 'pb-6' },
  { label: 'pb-7', value: 'pb-7' },
  { label: 'pb-8', value: 'pb-8' },
  { label: 'pb-9', value: 'pb-9' },
  { label: 'pb-10', value: 'pb-10' },
  { label: 'pb-11', value: 'pb-11' },
  { label: 'pb-12', value: 'pb-12' },
  { label: 'pb-14', value: 'pb-14' },
  { label: 'pb-16', value: 'pb-16' },
  { label: 'pb-20', value: 'pb-20' },
  { label: 'pb-24', value: 'pb-24' },
  { label: 'pb-28', value: 'pb-28' },
  { label: 'pb-32', value: 'pb-32' },
  { label: 'pb-36', value: 'pb-36' },
  { label: 'pb-40', value: 'pb-40' },
  { label: 'pb-44', value: 'pb-44' },
  { label: 'pb-48', value: 'pb-48' },
  { label: 'pb-52', value: 'pb-52' },
  { label: 'pb-56', value: 'pb-56' },
  { label: 'pb-60', value: 'pb-60' },
  { label: 'pb-64', value: 'pb-64' },
  { label: 'pb-72', value: 'pb-72' },
  { label: 'pb-80', value: 'pb-80' },
  { label: 'pb-96', value: 'pb-96' },
] as const;

export type PaddingBottomClass = typeof PADDING_BOTTOM_OPTIONS[number]['value'];

export const INDENT_OPTIONS = [
  { label: 'indent-0', value: 'indent-0' },
  { label: 'indent-0.5', value: 'indent-0.5' },
  { label: 'indent-1', value: 'indent-1' },
  { label: 'indent-1.5', value: 'indent-1.5' },
  { label: 'indent-2', value: 'indent-2' },
  { label: 'indent-2.5', value: 'indent-2.5' },
  { label: 'indent-3', value: 'indent-3' },
  { label: 'indent-3.5', value: 'indent-3.5' },
  { label: 'indent-4', value: 'indent-4' },
  { label: 'indent-5', value: 'indent-5' },
  { label: 'indent-6', value: 'indent-6' },
  { label: 'indent-7', value: 'indent-7' },
  { label: 'indent-8', value: 'indent-8' },
  { label: 'indent-9', value: 'indent-9' },
  { label: 'indent-10', value: 'indent-10' },
  { label: 'indent-11', value: 'indent-11' },
  { label: 'indent-12', value: 'indent-12' },
  { label: 'indent-14', value: 'indent-14' },
  { label: 'indent-16', value: 'indent-16' },
  { label: 'indent-20', value: 'indent-20' },
  { label: 'indent-24', value: 'indent-24' },
  { label: 'indent-28', value: 'indent-28' },
  { label: 'indent-32', value: 'indent-32' },
  { label: 'indent-36', value: 'indent-36' },
  { label: 'indent-40', value: 'indent-40' },
  { label: 'indent-44', value: 'indent-44' },
  { label: 'indent-48', value: 'indent-48' },
  { label: 'indent-52', value: 'indent-52' },
  { label: 'indent-56', value: 'indent-56' },
  { label: 'indent-60', value: 'indent-60' },
  { label: 'indent-64', value: 'indent-64' },
  { label: 'indent-72', value: 'indent-72' },
  { label: 'indent-80', value: 'indent-80' },
  { label: 'indent-96', value: 'indent-96' },
] as const;

export type IndentClass = typeof INDENT_OPTIONS[number]['value'];

export const GAP_OPTIONS = [
  { label: 'gap-0', value: 'gap-0' },
  { label: 'gap-0.5', value: 'gap-0.5' },
  { label: 'gap-1', value: 'gap-1' },
  { label: 'gap-1.5', value: 'gap-1.5' },
  { label: 'gap-2', value: 'gap-2' },
  { label: 'gap-2.5', value: 'gap-2.5' },
  { label: 'gap-3', value: 'gap-3' },
  { label: 'gap-3.5', value: 'gap-3.5' },
  { label: 'gap-4', value: 'gap-4' },
  { label: 'gap-5', value: 'gap-5' },
  { label: 'gap-6', value: 'gap-6' },
  { label: 'gap-7', value: 'gap-7' },
  { label: 'gap-8', value: 'gap-8' },
  { label: 'gap-9', value: 'gap-9' },
  { label: 'gap-10', value: 'gap-10' },
  { label: 'gap-11', value: 'gap-11' },
  { label: 'gap-12', value: 'gap-12' },
  { label: 'gap-14', value: 'gap-14' },
  { label: 'gap-16', value: 'gap-16' },
  { label: 'gap-20', value: 'gap-20' },
  { label: 'gap-24', value: 'gap-24' },
  { label: 'gap-28', value: 'gap-28' },
  { label: 'gap-32', value: 'gap-32' },
  { label: 'gap-36', value: 'gap-36' },
  { label: 'gap-40', value: 'gap-40' },
  { label: 'gap-44', value: 'gap-44' },
  { label: 'gap-48', value: 'gap-48' },
  { label: 'gap-52', value: 'gap-52' },
  { label: 'gap-56', value: 'gap-56' },
  { label: 'gap-60', value: 'gap-60' },
  { label: 'gap-64', value: 'gap-64' },
  { label: 'gap-72', value: 'gap-72' },
  { label: 'gap-80', value: 'gap-80' },
  { label: 'gap-96', value: 'gap-96' },
] as const;

export type GapClass = typeof GAP_OPTIONS[number]['value'];

export const WIDTH_OPTIONS = [
  { label: 'w-40', value: 'w-40' },
  { label: 'w-44', value: 'w-44' },
  { label: 'w-48', value: 'w-48' },
  { label: 'w-52', value: 'w-52' },
  { label: 'w-56', value: 'w-56' },
  { label: 'w-60', value: 'w-60' },
  { label: 'w-64', value: 'w-64' },
  { label: 'w-72', value: 'w-72' },
  { label: 'w-80', value: 'w-80' },
  { label: 'w-96', value: 'w-96' },
  { label: 'w-full', value: 'w-full' },
] as const;

export type WidthClass = typeof WIDTH_OPTIONS[number]['value'];

// md:/lg:-prefixed siblings of WIDTH_OPTIONS above — same shape as
// PADDING_TOP_OPTIONS/PADDING_TOP_WIDE_OPTIONS below, for a field that
// needs its own value to vary by device size (e.g. SplitColumnCardStackConfig's
// own cardWidth/cardWidthWide/cardWidthLg — PLAN-CENTRALIZED-BREAKPOINTS-
// RESPONSIVE-CARD-STACK.md) rather than one fixed width at every tier.
export const WIDTH_WIDE_OPTIONS = [
  { label: 'md:w-40', value: 'md:w-40' },
  { label: 'md:w-44', value: 'md:w-44' },
  { label: 'md:w-48', value: 'md:w-48' },
  { label: 'md:w-52', value: 'md:w-52' },
  { label: 'md:w-56', value: 'md:w-56' },
  { label: 'md:w-60', value: 'md:w-60' },
  { label: 'md:w-64', value: 'md:w-64' },
  { label: 'md:w-72', value: 'md:w-72' },
  { label: 'md:w-80', value: 'md:w-80' },
  { label: 'md:w-96', value: 'md:w-96' },
  { label: 'md:w-full', value: 'md:w-full' },
] as const;

export type WidthWideClass = typeof WIDTH_WIDE_OPTIONS[number]['value'];

export const WIDTH_LG_OPTIONS = [
  { label: 'lg:w-40', value: 'lg:w-40' },
  { label: 'lg:w-44', value: 'lg:w-44' },
  { label: 'lg:w-48', value: 'lg:w-48' },
  { label: 'lg:w-52', value: 'lg:w-52' },
  { label: 'lg:w-56', value: 'lg:w-56' },
  { label: 'lg:w-60', value: 'lg:w-60' },
  { label: 'lg:w-64', value: 'lg:w-64' },
  { label: 'lg:w-72', value: 'lg:w-72' },
  { label: 'lg:w-80', value: 'lg:w-80' },
  { label: 'lg:w-96', value: 'lg:w-96' },
  { label: 'lg:w-full', value: 'lg:w-full' },
] as const;

export type WidthLgClass = typeof WIDTH_LG_OPTIONS[number]['value'];

/**
 * Structural spacing controls must store literal, JIT-visible Tailwind
 * classes. These additional directional catalogs serve configuration scopes
 * that apply spacing to one semantic edge rather than to an entire box.
 */
export const MARGIN_Y_OPTIONS = [
  { label: 'my-0', value: 'my-0' }, { label: 'my-0.5', value: 'my-0.5' },
  { label: 'my-1', value: 'my-1' }, { label: 'my-1.5', value: 'my-1.5' },
  { label: 'my-2', value: 'my-2' }, { label: 'my-2.5', value: 'my-2.5' },
  { label: 'my-3', value: 'my-3' }, { label: 'my-3.5', value: 'my-3.5' },
  { label: 'my-4', value: 'my-4' }, { label: 'my-5', value: 'my-5' },
  { label: 'my-6', value: 'my-6' }, { label: 'my-7', value: 'my-7' },
  { label: 'my-8', value: 'my-8' }, { label: 'my-9', value: 'my-9' },
  { label: 'my-10', value: 'my-10' }, { label: 'my-11', value: 'my-11' },
  { label: 'my-12', value: 'my-12' }, { label: 'my-14', value: 'my-14' },
  { label: 'my-16', value: 'my-16' }, { label: 'my-20', value: 'my-20' },
  { label: 'my-24', value: 'my-24' }, { label: 'my-28', value: 'my-28' },
  { label: 'my-32', value: 'my-32' }, { label: 'my-36', value: 'my-36' },
  { label: 'my-40', value: 'my-40' }, { label: 'my-44', value: 'my-44' },
  { label: 'my-48', value: 'my-48' }, { label: 'my-52', value: 'my-52' },
  { label: 'my-56', value: 'my-56' }, { label: 'my-60', value: 'my-60' },
  { label: 'my-64', value: 'my-64' }, { label: 'my-72', value: 'my-72' },
  { label: 'my-80', value: 'my-80' }, { label: 'my-96', value: 'my-96' },
] as const;

export type MarginYClass = typeof MARGIN_Y_OPTIONS[number]['value'];

export const PADDING_LEFT_OPTIONS = [
  { label: 'pl-0', value: 'pl-0' }, { label: 'pl-0.5', value: 'pl-0.5' },
  { label: 'pl-1', value: 'pl-1' }, { label: 'pl-1.5', value: 'pl-1.5' },
  { label: 'pl-2', value: 'pl-2' }, { label: 'pl-2.5', value: 'pl-2.5' },
  { label: 'pl-3', value: 'pl-3' }, { label: 'pl-3.5', value: 'pl-3.5' },
  { label: 'pl-4', value: 'pl-4' }, { label: 'pl-5', value: 'pl-5' },
  { label: 'pl-6', value: 'pl-6' }, { label: 'pl-7', value: 'pl-7' },
  { label: 'pl-8', value: 'pl-8' }, { label: 'pl-9', value: 'pl-9' },
  { label: 'pl-10', value: 'pl-10' }, { label: 'pl-11', value: 'pl-11' },
  { label: 'pl-12', value: 'pl-12' }, { label: 'pl-14', value: 'pl-14' },
  { label: 'pl-16', value: 'pl-16' }, { label: 'pl-20', value: 'pl-20' },
  { label: 'pl-24', value: 'pl-24' }, { label: 'pl-28', value: 'pl-28' },
  { label: 'pl-32', value: 'pl-32' }, { label: 'pl-36', value: 'pl-36' },
  { label: 'pl-40', value: 'pl-40' }, { label: 'pl-44', value: 'pl-44' },
  { label: 'pl-48', value: 'pl-48' }, { label: 'pl-52', value: 'pl-52' },
  { label: 'pl-56', value: 'pl-56' }, { label: 'pl-60', value: 'pl-60' },
  { label: 'pl-64', value: 'pl-64' }, { label: 'pl-72', value: 'pl-72' },
  { label: 'pl-80', value: 'pl-80' }, { label: 'pl-96', value: 'pl-96' },
] as const;

export type PaddingLeftClass = typeof PADDING_LEFT_OPTIONS[number]['value'];

export const MARGIN_LEFT_OPTIONS = [
  { label: 'ml-0', value: 'ml-0' }, { label: 'ml-0.5', value: 'ml-0.5' },
  { label: 'ml-1', value: 'ml-1' }, { label: 'ml-1.5', value: 'ml-1.5' },
  { label: 'ml-2', value: 'ml-2' }, { label: 'ml-2.5', value: 'ml-2.5' },
  { label: 'ml-3', value: 'ml-3' }, { label: 'ml-3.5', value: 'ml-3.5' },
  { label: 'ml-4', value: 'ml-4' }, { label: 'ml-5', value: 'ml-5' },
  { label: 'ml-6', value: 'ml-6' }, { label: 'ml-7', value: 'ml-7' },
  { label: 'ml-8', value: 'ml-8' }, { label: 'ml-9', value: 'ml-9' },
  { label: 'ml-10', value: 'ml-10' }, { label: 'ml-11', value: 'ml-11' },
  { label: 'ml-12', value: 'ml-12' }, { label: 'ml-14', value: 'ml-14' },
  { label: 'ml-16', value: 'ml-16' }, { label: 'ml-20', value: 'ml-20' },
  { label: 'ml-24', value: 'ml-24' }, { label: 'ml-28', value: 'ml-28' },
  { label: 'ml-32', value: 'ml-32' }, { label: 'ml-36', value: 'ml-36' },
  { label: 'ml-40', value: 'ml-40' }, { label: 'ml-44', value: 'ml-44' },
  { label: 'ml-48', value: 'ml-48' }, { label: 'ml-52', value: 'ml-52' },
  { label: 'ml-56', value: 'ml-56' }, { label: 'ml-60', value: 'ml-60' },
  { label: 'ml-64', value: 'ml-64' }, { label: 'ml-72', value: 'ml-72' },
  { label: 'ml-80', value: 'ml-80' }, { label: 'ml-96', value: 'ml-96' },
] as const;

export type MarginLeftClass = typeof MARGIN_LEFT_OPTIONS[number]['value'];

/**
 * Remaining directional catalogs, added to close out full padding/margin
 * coverage on pages/posts-lab/postLab.config.ts's own PostLabPageLayoutConfig
 * (padding-top, the *_WIDE_OPTIONS md:-prefixed siblings, and the header
 * content boxes' full 4-side margin) — same pattern as PADDING_LEFT_OPTIONS/
 * MARGIN_LEFT_OPTIONS above, additive only.
 */
export const PADDING_TOP_OPTIONS = [
  { label: 'pt-0', value: 'pt-0' }, { label: 'pt-0.5', value: 'pt-0.5' },
  { label: 'pt-1', value: 'pt-1' }, { label: 'pt-1.5', value: 'pt-1.5' },
  { label: 'pt-2', value: 'pt-2' }, { label: 'pt-2.5', value: 'pt-2.5' },
  { label: 'pt-3', value: 'pt-3' }, { label: 'pt-3.5', value: 'pt-3.5' },
  { label: 'pt-4', value: 'pt-4' }, { label: 'pt-5', value: 'pt-5' },
  { label: 'pt-6', value: 'pt-6' }, { label: 'pt-7', value: 'pt-7' },
  { label: 'pt-8', value: 'pt-8' }, { label: 'pt-9', value: 'pt-9' },
  { label: 'pt-10', value: 'pt-10' }, { label: 'pt-11', value: 'pt-11' },
  { label: 'pt-12', value: 'pt-12' }, { label: 'pt-14', value: 'pt-14' },
  { label: 'pt-16', value: 'pt-16' }, { label: 'pt-20', value: 'pt-20' },
  { label: 'pt-24', value: 'pt-24' }, { label: 'pt-28', value: 'pt-28' },
  { label: 'pt-32', value: 'pt-32' }, { label: 'pt-36', value: 'pt-36' },
  { label: 'pt-40', value: 'pt-40' }, { label: 'pt-44', value: 'pt-44' },
  { label: 'pt-48', value: 'pt-48' }, { label: 'pt-52', value: 'pt-52' },
  { label: 'pt-56', value: 'pt-56' }, { label: 'pt-60', value: 'pt-60' },
  { label: 'pt-64', value: 'pt-64' }, { label: 'pt-72', value: 'pt-72' },
  { label: 'pt-80', value: 'pt-80' }, { label: 'pt-96', value: 'pt-96' },
] as const;

export type PaddingTopClass = typeof PADDING_TOP_OPTIONS[number]['value'];

export const PADDING_TOP_WIDE_OPTIONS = [
  { label: 'md:pt-0', value: 'md:pt-0' }, { label: 'md:pt-0.5', value: 'md:pt-0.5' },
  { label: 'md:pt-1', value: 'md:pt-1' }, { label: 'md:pt-1.5', value: 'md:pt-1.5' },
  { label: 'md:pt-2', value: 'md:pt-2' }, { label: 'md:pt-2.5', value: 'md:pt-2.5' },
  { label: 'md:pt-3', value: 'md:pt-3' }, { label: 'md:pt-3.5', value: 'md:pt-3.5' },
  { label: 'md:pt-4', value: 'md:pt-4' }, { label: 'md:pt-5', value: 'md:pt-5' },
  { label: 'md:pt-6', value: 'md:pt-6' }, { label: 'md:pt-7', value: 'md:pt-7' },
  { label: 'md:pt-8', value: 'md:pt-8' }, { label: 'md:pt-9', value: 'md:pt-9' },
  { label: 'md:pt-10', value: 'md:pt-10' }, { label: 'md:pt-11', value: 'md:pt-11' },
  { label: 'md:pt-12', value: 'md:pt-12' }, { label: 'md:pt-14', value: 'md:pt-14' },
  { label: 'md:pt-16', value: 'md:pt-16' }, { label: 'md:pt-20', value: 'md:pt-20' },
  { label: 'md:pt-24', value: 'md:pt-24' }, { label: 'md:pt-28', value: 'md:pt-28' },
  { label: 'md:pt-32', value: 'md:pt-32' }, { label: 'md:pt-36', value: 'md:pt-36' },
  { label: 'md:pt-40', value: 'md:pt-40' }, { label: 'md:pt-44', value: 'md:pt-44' },
  { label: 'md:pt-48', value: 'md:pt-48' }, { label: 'md:pt-52', value: 'md:pt-52' },
  { label: 'md:pt-56', value: 'md:pt-56' }, { label: 'md:pt-60', value: 'md:pt-60' },
  { label: 'md:pt-64', value: 'md:pt-64' }, { label: 'md:pt-72', value: 'md:pt-72' },
  { label: 'md:pt-80', value: 'md:pt-80' }, { label: 'md:pt-96', value: 'md:pt-96' },
] as const;

export type PaddingTopWideClass = typeof PADDING_TOP_WIDE_OPTIONS[number]['value'];

export const PADDING_RIGHT_OPTIONS = [
  { label: 'pr-0', value: 'pr-0' }, { label: 'pr-0.5', value: 'pr-0.5' },
  { label: 'pr-1', value: 'pr-1' }, { label: 'pr-1.5', value: 'pr-1.5' },
  { label: 'pr-2', value: 'pr-2' }, { label: 'pr-2.5', value: 'pr-2.5' },
  { label: 'pr-3', value: 'pr-3' }, { label: 'pr-3.5', value: 'pr-3.5' },
  { label: 'pr-4', value: 'pr-4' }, { label: 'pr-5', value: 'pr-5' },
  { label: 'pr-6', value: 'pr-6' }, { label: 'pr-7', value: 'pr-7' },
  { label: 'pr-8', value: 'pr-8' }, { label: 'pr-9', value: 'pr-9' },
  { label: 'pr-10', value: 'pr-10' }, { label: 'pr-11', value: 'pr-11' },
  { label: 'pr-12', value: 'pr-12' }, { label: 'pr-14', value: 'pr-14' },
  { label: 'pr-16', value: 'pr-16' }, { label: 'pr-20', value: 'pr-20' },
  { label: 'pr-24', value: 'pr-24' }, { label: 'pr-28', value: 'pr-28' },
  { label: 'pr-32', value: 'pr-32' }, { label: 'pr-36', value: 'pr-36' },
  { label: 'pr-40', value: 'pr-40' }, { label: 'pr-44', value: 'pr-44' },
  { label: 'pr-48', value: 'pr-48' }, { label: 'pr-52', value: 'pr-52' },
  { label: 'pr-56', value: 'pr-56' }, { label: 'pr-60', value: 'pr-60' },
  { label: 'pr-64', value: 'pr-64' }, { label: 'pr-72', value: 'pr-72' },
  { label: 'pr-80', value: 'pr-80' }, { label: 'pr-96', value: 'pr-96' },
] as const;

export type PaddingRightClass = typeof PADDING_RIGHT_OPTIONS[number]['value'];

export const PADDING_RIGHT_WIDE_OPTIONS = [
  { label: 'md:pr-0', value: 'md:pr-0' }, { label: 'md:pr-0.5', value: 'md:pr-0.5' },
  { label: 'md:pr-1', value: 'md:pr-1' }, { label: 'md:pr-1.5', value: 'md:pr-1.5' },
  { label: 'md:pr-2', value: 'md:pr-2' }, { label: 'md:pr-2.5', value: 'md:pr-2.5' },
  { label: 'md:pr-3', value: 'md:pr-3' }, { label: 'md:pr-3.5', value: 'md:pr-3.5' },
  { label: 'md:pr-4', value: 'md:pr-4' }, { label: 'md:pr-5', value: 'md:pr-5' },
  { label: 'md:pr-6', value: 'md:pr-6' }, { label: 'md:pr-7', value: 'md:pr-7' },
  { label: 'md:pr-8', value: 'md:pr-8' }, { label: 'md:pr-9', value: 'md:pr-9' },
  { label: 'md:pr-10', value: 'md:pr-10' }, { label: 'md:pr-11', value: 'md:pr-11' },
  { label: 'md:pr-12', value: 'md:pr-12' }, { label: 'md:pr-14', value: 'md:pr-14' },
  { label: 'md:pr-16', value: 'md:pr-16' }, { label: 'md:pr-20', value: 'md:pr-20' },
  { label: 'md:pr-24', value: 'md:pr-24' }, { label: 'md:pr-28', value: 'md:pr-28' },
  { label: 'md:pr-32', value: 'md:pr-32' }, { label: 'md:pr-36', value: 'md:pr-36' },
  { label: 'md:pr-40', value: 'md:pr-40' }, { label: 'md:pr-44', value: 'md:pr-44' },
  { label: 'md:pr-48', value: 'md:pr-48' }, { label: 'md:pr-52', value: 'md:pr-52' },
  { label: 'md:pr-56', value: 'md:pr-56' }, { label: 'md:pr-60', value: 'md:pr-60' },
  { label: 'md:pr-64', value: 'md:pr-64' }, { label: 'md:pr-72', value: 'md:pr-72' },
  { label: 'md:pr-80', value: 'md:pr-80' }, { label: 'md:pr-96', value: 'md:pr-96' },
] as const;

export type PaddingRightWideClass = typeof PADDING_RIGHT_WIDE_OPTIONS[number]['value'];

export const PADDING_BOTTOM_WIDE_OPTIONS = [
  { label: 'md:pb-0', value: 'md:pb-0' }, { label: 'md:pb-0.5', value: 'md:pb-0.5' },
  { label: 'md:pb-1', value: 'md:pb-1' }, { label: 'md:pb-1.5', value: 'md:pb-1.5' },
  { label: 'md:pb-2', value: 'md:pb-2' }, { label: 'md:pb-2.5', value: 'md:pb-2.5' },
  { label: 'md:pb-3', value: 'md:pb-3' }, { label: 'md:pb-3.5', value: 'md:pb-3.5' },
  { label: 'md:pb-4', value: 'md:pb-4' }, { label: 'md:pb-5', value: 'md:pb-5' },
  { label: 'md:pb-6', value: 'md:pb-6' }, { label: 'md:pb-7', value: 'md:pb-7' },
  { label: 'md:pb-8', value: 'md:pb-8' }, { label: 'md:pb-9', value: 'md:pb-9' },
  { label: 'md:pb-10', value: 'md:pb-10' }, { label: 'md:pb-11', value: 'md:pb-11' },
  { label: 'md:pb-12', value: 'md:pb-12' }, { label: 'md:pb-14', value: 'md:pb-14' },
  { label: 'md:pb-16', value: 'md:pb-16' }, { label: 'md:pb-20', value: 'md:pb-20' },
  { label: 'md:pb-24', value: 'md:pb-24' }, { label: 'md:pb-28', value: 'md:pb-28' },
  { label: 'md:pb-32', value: 'md:pb-32' }, { label: 'md:pb-36', value: 'md:pb-36' },
  { label: 'md:pb-40', value: 'md:pb-40' }, { label: 'md:pb-44', value: 'md:pb-44' },
  { label: 'md:pb-48', value: 'md:pb-48' }, { label: 'md:pb-52', value: 'md:pb-52' },
  { label: 'md:pb-56', value: 'md:pb-56' }, { label: 'md:pb-60', value: 'md:pb-60' },
  { label: 'md:pb-64', value: 'md:pb-64' }, { label: 'md:pb-72', value: 'md:pb-72' },
  { label: 'md:pb-80', value: 'md:pb-80' }, { label: 'md:pb-96', value: 'md:pb-96' },
] as const;

export type PaddingBottomWideClass = typeof PADDING_BOTTOM_WIDE_OPTIONS[number]['value'];

export const PADDING_LEFT_WIDE_OPTIONS = [
  { label: 'md:pl-0', value: 'md:pl-0' }, { label: 'md:pl-0.5', value: 'md:pl-0.5' },
  { label: 'md:pl-1', value: 'md:pl-1' }, { label: 'md:pl-1.5', value: 'md:pl-1.5' },
  { label: 'md:pl-2', value: 'md:pl-2' }, { label: 'md:pl-2.5', value: 'md:pl-2.5' },
  { label: 'md:pl-3', value: 'md:pl-3' }, { label: 'md:pl-3.5', value: 'md:pl-3.5' },
  { label: 'md:pl-4', value: 'md:pl-4' }, { label: 'md:pl-5', value: 'md:pl-5' },
  { label: 'md:pl-6', value: 'md:pl-6' }, { label: 'md:pl-7', value: 'md:pl-7' },
  { label: 'md:pl-8', value: 'md:pl-8' }, { label: 'md:pl-9', value: 'md:pl-9' },
  { label: 'md:pl-10', value: 'md:pl-10' }, { label: 'md:pl-11', value: 'md:pl-11' },
  { label: 'md:pl-12', value: 'md:pl-12' }, { label: 'md:pl-14', value: 'md:pl-14' },
  { label: 'md:pl-16', value: 'md:pl-16' }, { label: 'md:pl-20', value: 'md:pl-20' },
  { label: 'md:pl-24', value: 'md:pl-24' }, { label: 'md:pl-28', value: 'md:pl-28' },
  { label: 'md:pl-32', value: 'md:pl-32' }, { label: 'md:pl-36', value: 'md:pl-36' },
  { label: 'md:pl-40', value: 'md:pl-40' }, { label: 'md:pl-44', value: 'md:pl-44' },
  { label: 'md:pl-48', value: 'md:pl-48' }, { label: 'md:pl-52', value: 'md:pl-52' },
  { label: 'md:pl-56', value: 'md:pl-56' }, { label: 'md:pl-60', value: 'md:pl-60' },
  { label: 'md:pl-64', value: 'md:pl-64' }, { label: 'md:pl-72', value: 'md:pl-72' },
  { label: 'md:pl-80', value: 'md:pl-80' }, { label: 'md:pl-96', value: 'md:pl-96' },
] as const;

export type PaddingLeftWideClass = typeof PADDING_LEFT_WIDE_OPTIONS[number]['value'];

export const MARGIN_TOP_WIDE_OPTIONS = [
  { label: 'md:mt-0', value: 'md:mt-0' }, { label: 'md:mt-0.5', value: 'md:mt-0.5' },
  { label: 'md:mt-1', value: 'md:mt-1' }, { label: 'md:mt-1.5', value: 'md:mt-1.5' },
  { label: 'md:mt-2', value: 'md:mt-2' }, { label: 'md:mt-2.5', value: 'md:mt-2.5' },
  { label: 'md:mt-3', value: 'md:mt-3' }, { label: 'md:mt-3.5', value: 'md:mt-3.5' },
  { label: 'md:mt-4', value: 'md:mt-4' }, { label: 'md:mt-5', value: 'md:mt-5' },
  { label: 'md:mt-6', value: 'md:mt-6' }, { label: 'md:mt-7', value: 'md:mt-7' },
  { label: 'md:mt-8', value: 'md:mt-8' }, { label: 'md:mt-9', value: 'md:mt-9' },
  { label: 'md:mt-10', value: 'md:mt-10' }, { label: 'md:mt-11', value: 'md:mt-11' },
  { label: 'md:mt-12', value: 'md:mt-12' }, { label: 'md:mt-14', value: 'md:mt-14' },
  { label: 'md:mt-16', value: 'md:mt-16' }, { label: 'md:mt-20', value: 'md:mt-20' },
  { label: 'md:mt-24', value: 'md:mt-24' }, { label: 'md:mt-28', value: 'md:mt-28' },
  { label: 'md:mt-32', value: 'md:mt-32' }, { label: 'md:mt-36', value: 'md:mt-36' },
  { label: 'md:mt-40', value: 'md:mt-40' }, { label: 'md:mt-44', value: 'md:mt-44' },
  { label: 'md:mt-48', value: 'md:mt-48' }, { label: 'md:mt-52', value: 'md:mt-52' },
  { label: 'md:mt-56', value: 'md:mt-56' }, { label: 'md:mt-60', value: 'md:mt-60' },
  { label: 'md:mt-64', value: 'md:mt-64' }, { label: 'md:mt-72', value: 'md:mt-72' },
  { label: 'md:mt-80', value: 'md:mt-80' }, { label: 'md:mt-96', value: 'md:mt-96' },
] as const;

export type MarginTopWideClass = typeof MARGIN_TOP_WIDE_OPTIONS[number]['value'];

export const MARGIN_RIGHT_OPTIONS = [
  { label: 'mr-0', value: 'mr-0' }, { label: 'mr-0.5', value: 'mr-0.5' },
  { label: 'mr-1', value: 'mr-1' }, { label: 'mr-1.5', value: 'mr-1.5' },
  { label: 'mr-2', value: 'mr-2' }, { label: 'mr-2.5', value: 'mr-2.5' },
  { label: 'mr-3', value: 'mr-3' }, { label: 'mr-3.5', value: 'mr-3.5' },
  { label: 'mr-4', value: 'mr-4' }, { label: 'mr-5', value: 'mr-5' },
  { label: 'mr-6', value: 'mr-6' }, { label: 'mr-7', value: 'mr-7' },
  { label: 'mr-8', value: 'mr-8' }, { label: 'mr-9', value: 'mr-9' },
  { label: 'mr-10', value: 'mr-10' }, { label: 'mr-11', value: 'mr-11' },
  { label: 'mr-12', value: 'mr-12' }, { label: 'mr-14', value: 'mr-14' },
  { label: 'mr-16', value: 'mr-16' }, { label: 'mr-20', value: 'mr-20' },
  { label: 'mr-24', value: 'mr-24' }, { label: 'mr-28', value: 'mr-28' },
  { label: 'mr-32', value: 'mr-32' }, { label: 'mr-36', value: 'mr-36' },
  { label: 'mr-40', value: 'mr-40' }, { label: 'mr-44', value: 'mr-44' },
  { label: 'mr-48', value: 'mr-48' }, { label: 'mr-52', value: 'mr-52' },
  { label: 'mr-56', value: 'mr-56' }, { label: 'mr-60', value: 'mr-60' },
  { label: 'mr-64', value: 'mr-64' }, { label: 'mr-72', value: 'mr-72' },
  { label: 'mr-80', value: 'mr-80' }, { label: 'mr-96', value: 'mr-96' },
] as const;

export type MarginRightClass = typeof MARGIN_RIGHT_OPTIONS[number]['value'];

export const MARGIN_RIGHT_WIDE_OPTIONS = [
  { label: 'md:mr-0', value: 'md:mr-0' }, { label: 'md:mr-0.5', value: 'md:mr-0.5' },
  { label: 'md:mr-1', value: 'md:mr-1' }, { label: 'md:mr-1.5', value: 'md:mr-1.5' },
  { label: 'md:mr-2', value: 'md:mr-2' }, { label: 'md:mr-2.5', value: 'md:mr-2.5' },
  { label: 'md:mr-3', value: 'md:mr-3' }, { label: 'md:mr-3.5', value: 'md:mr-3.5' },
  { label: 'md:mr-4', value: 'md:mr-4' }, { label: 'md:mr-5', value: 'md:mr-5' },
  { label: 'md:mr-6', value: 'md:mr-6' }, { label: 'md:mr-7', value: 'md:mr-7' },
  { label: 'md:mr-8', value: 'md:mr-8' }, { label: 'md:mr-9', value: 'md:mr-9' },
  { label: 'md:mr-10', value: 'md:mr-10' }, { label: 'md:mr-11', value: 'md:mr-11' },
  { label: 'md:mr-12', value: 'md:mr-12' }, { label: 'md:mr-14', value: 'md:mr-14' },
  { label: 'md:mr-16', value: 'md:mr-16' }, { label: 'md:mr-20', value: 'md:mr-20' },
  { label: 'md:mr-24', value: 'md:mr-24' }, { label: 'md:mr-28', value: 'md:mr-28' },
  { label: 'md:mr-32', value: 'md:mr-32' }, { label: 'md:mr-36', value: 'md:mr-36' },
  { label: 'md:mr-40', value: 'md:mr-40' }, { label: 'md:mr-44', value: 'md:mr-44' },
  { label: 'md:mr-48', value: 'md:mr-48' }, { label: 'md:mr-52', value: 'md:mr-52' },
  { label: 'md:mr-56', value: 'md:mr-56' }, { label: 'md:mr-60', value: 'md:mr-60' },
  { label: 'md:mr-64', value: 'md:mr-64' }, { label: 'md:mr-72', value: 'md:mr-72' },
  { label: 'md:mr-80', value: 'md:mr-80' }, { label: 'md:mr-96', value: 'md:mr-96' },
] as const;

export type MarginRightWideClass = typeof MARGIN_RIGHT_WIDE_OPTIONS[number]['value'];

export const MARGIN_BOTTOM_WIDE_OPTIONS = [
  { label: 'md:mb-0', value: 'md:mb-0' }, { label: 'md:mb-0.5', value: 'md:mb-0.5' },
  { label: 'md:mb-1', value: 'md:mb-1' }, { label: 'md:mb-1.5', value: 'md:mb-1.5' },
  { label: 'md:mb-2', value: 'md:mb-2' }, { label: 'md:mb-2.5', value: 'md:mb-2.5' },
  { label: 'md:mb-3', value: 'md:mb-3' }, { label: 'md:mb-3.5', value: 'md:mb-3.5' },
  { label: 'md:mb-4', value: 'md:mb-4' }, { label: 'md:mb-5', value: 'md:mb-5' },
  { label: 'md:mb-6', value: 'md:mb-6' }, { label: 'md:mb-7', value: 'md:mb-7' },
  { label: 'md:mb-8', value: 'md:mb-8' }, { label: 'md:mb-9', value: 'md:mb-9' },
  { label: 'md:mb-10', value: 'md:mb-10' }, { label: 'md:mb-11', value: 'md:mb-11' },
  { label: 'md:mb-12', value: 'md:mb-12' }, { label: 'md:mb-14', value: 'md:mb-14' },
  { label: 'md:mb-16', value: 'md:mb-16' }, { label: 'md:mb-20', value: 'md:mb-20' },
  { label: 'md:mb-24', value: 'md:mb-24' }, { label: 'md:mb-28', value: 'md:mb-28' },
  { label: 'md:mb-32', value: 'md:mb-32' }, { label: 'md:mb-36', value: 'md:mb-36' },
  { label: 'md:mb-40', value: 'md:mb-40' }, { label: 'md:mb-44', value: 'md:mb-44' },
  { label: 'md:mb-48', value: 'md:mb-48' }, { label: 'md:mb-52', value: 'md:mb-52' },
  { label: 'md:mb-56', value: 'md:mb-56' }, { label: 'md:mb-60', value: 'md:mb-60' },
  { label: 'md:mb-64', value: 'md:mb-64' }, { label: 'md:mb-72', value: 'md:mb-72' },
  { label: 'md:mb-80', value: 'md:mb-80' }, { label: 'md:mb-96', value: 'md:mb-96' },
] as const;

export type MarginBottomWideClass = typeof MARGIN_BOTTOM_WIDE_OPTIONS[number]['value'];

export const MARGIN_LEFT_WIDE_OPTIONS = [
  { label: 'md:ml-0', value: 'md:ml-0' }, { label: 'md:ml-0.5', value: 'md:ml-0.5' },
  { label: 'md:ml-1', value: 'md:ml-1' }, { label: 'md:ml-1.5', value: 'md:ml-1.5' },
  { label: 'md:ml-2', value: 'md:ml-2' }, { label: 'md:ml-2.5', value: 'md:ml-2.5' },
  { label: 'md:ml-3', value: 'md:ml-3' }, { label: 'md:ml-3.5', value: 'md:ml-3.5' },
  { label: 'md:ml-4', value: 'md:ml-4' }, { label: 'md:ml-5', value: 'md:ml-5' },
  { label: 'md:ml-6', value: 'md:ml-6' }, { label: 'md:ml-7', value: 'md:ml-7' },
  { label: 'md:ml-8', value: 'md:ml-8' }, { label: 'md:ml-9', value: 'md:ml-9' },
  { label: 'md:ml-10', value: 'md:ml-10' }, { label: 'md:ml-11', value: 'md:ml-11' },
  { label: 'md:ml-12', value: 'md:ml-12' }, { label: 'md:ml-14', value: 'md:ml-14' },
  { label: 'md:ml-16', value: 'md:ml-16' }, { label: 'md:ml-20', value: 'md:ml-20' },
  { label: 'md:ml-24', value: 'md:ml-24' }, { label: 'md:ml-28', value: 'md:ml-28' },
  { label: 'md:ml-32', value: 'md:ml-32' }, { label: 'md:ml-36', value: 'md:ml-36' },
  { label: 'md:ml-40', value: 'md:ml-40' }, { label: 'md:ml-44', value: 'md:ml-44' },
  { label: 'md:ml-48', value: 'md:ml-48' }, { label: 'md:ml-52', value: 'md:ml-52' },
  { label: 'md:ml-56', value: 'md:ml-56' }, { label: 'md:ml-60', value: 'md:ml-60' },
  { label: 'md:ml-64', value: 'md:ml-64' }, { label: 'md:ml-72', value: 'md:ml-72' },
  { label: 'md:ml-80', value: 'md:ml-80' }, { label: 'md:ml-96', value: 'md:ml-96' },
] as const;

export type MarginLeftWideClass = typeof MARGIN_LEFT_WIDE_OPTIONS[number]['value'];

// Desktop (lg:)-tier siblings of the *_WIDE_OPTIONS (md:) catalogs above —
// added so PostLabPageLayoutConfig can give padding/margin fields a genuine
// third tier (mobile/tablet/desktop), matching this codebase's own literal-
// class-per-step convention (never interpolated).
export const PADDING_TOP_LG_OPTIONS = [
  { label: 'lg:pt-0', value: 'lg:pt-0' }, { label: 'lg:pt-0.5', value: 'lg:pt-0.5' },
  { label: 'lg:pt-1', value: 'lg:pt-1' }, { label: 'lg:pt-1.5', value: 'lg:pt-1.5' },
  { label: 'lg:pt-2', value: 'lg:pt-2' }, { label: 'lg:pt-2.5', value: 'lg:pt-2.5' },
  { label: 'lg:pt-3', value: 'lg:pt-3' }, { label: 'lg:pt-3.5', value: 'lg:pt-3.5' },
  { label: 'lg:pt-4', value: 'lg:pt-4' }, { label: 'lg:pt-5', value: 'lg:pt-5' },
  { label: 'lg:pt-6', value: 'lg:pt-6' }, { label: 'lg:pt-7', value: 'lg:pt-7' },
  { label: 'lg:pt-8', value: 'lg:pt-8' }, { label: 'lg:pt-9', value: 'lg:pt-9' },
  { label: 'lg:pt-10', value: 'lg:pt-10' }, { label: 'lg:pt-11', value: 'lg:pt-11' },
  { label: 'lg:pt-12', value: 'lg:pt-12' }, { label: 'lg:pt-14', value: 'lg:pt-14' },
  { label: 'lg:pt-16', value: 'lg:pt-16' }, { label: 'lg:pt-20', value: 'lg:pt-20' },
  { label: 'lg:pt-24', value: 'lg:pt-24' }, { label: 'lg:pt-28', value: 'lg:pt-28' },
  { label: 'lg:pt-32', value: 'lg:pt-32' }, { label: 'lg:pt-36', value: 'lg:pt-36' },
  { label: 'lg:pt-40', value: 'lg:pt-40' }, { label: 'lg:pt-44', value: 'lg:pt-44' },
  { label: 'lg:pt-48', value: 'lg:pt-48' }, { label: 'lg:pt-52', value: 'lg:pt-52' },
  { label: 'lg:pt-56', value: 'lg:pt-56' }, { label: 'lg:pt-60', value: 'lg:pt-60' },
  { label: 'lg:pt-64', value: 'lg:pt-64' }, { label: 'lg:pt-72', value: 'lg:pt-72' },
  { label: 'lg:pt-80', value: 'lg:pt-80' }, { label: 'lg:pt-96', value: 'lg:pt-96' },
] as const;

export type PaddingTopLgClass = typeof PADDING_TOP_LG_OPTIONS[number]['value'];

export const PADDING_RIGHT_LG_OPTIONS = [
  { label: 'lg:pr-0', value: 'lg:pr-0' }, { label: 'lg:pr-0.5', value: 'lg:pr-0.5' },
  { label: 'lg:pr-1', value: 'lg:pr-1' }, { label: 'lg:pr-1.5', value: 'lg:pr-1.5' },
  { label: 'lg:pr-2', value: 'lg:pr-2' }, { label: 'lg:pr-2.5', value: 'lg:pr-2.5' },
  { label: 'lg:pr-3', value: 'lg:pr-3' }, { label: 'lg:pr-3.5', value: 'lg:pr-3.5' },
  { label: 'lg:pr-4', value: 'lg:pr-4' }, { label: 'lg:pr-5', value: 'lg:pr-5' },
  { label: 'lg:pr-6', value: 'lg:pr-6' }, { label: 'lg:pr-7', value: 'lg:pr-7' },
  { label: 'lg:pr-8', value: 'lg:pr-8' }, { label: 'lg:pr-9', value: 'lg:pr-9' },
  { label: 'lg:pr-10', value: 'lg:pr-10' }, { label: 'lg:pr-11', value: 'lg:pr-11' },
  { label: 'lg:pr-12', value: 'lg:pr-12' }, { label: 'lg:pr-14', value: 'lg:pr-14' },
  { label: 'lg:pr-16', value: 'lg:pr-16' }, { label: 'lg:pr-20', value: 'lg:pr-20' },
  { label: 'lg:pr-24', value: 'lg:pr-24' }, { label: 'lg:pr-28', value: 'lg:pr-28' },
  { label: 'lg:pr-32', value: 'lg:pr-32' }, { label: 'lg:pr-36', value: 'lg:pr-36' },
  { label: 'lg:pr-40', value: 'lg:pr-40' }, { label: 'lg:pr-44', value: 'lg:pr-44' },
  { label: 'lg:pr-48', value: 'lg:pr-48' }, { label: 'lg:pr-52', value: 'lg:pr-52' },
  { label: 'lg:pr-56', value: 'lg:pr-56' }, { label: 'lg:pr-60', value: 'lg:pr-60' },
  { label: 'lg:pr-64', value: 'lg:pr-64' }, { label: 'lg:pr-72', value: 'lg:pr-72' },
  { label: 'lg:pr-80', value: 'lg:pr-80' }, { label: 'lg:pr-96', value: 'lg:pr-96' },
] as const;

export type PaddingRightLgClass = typeof PADDING_RIGHT_LG_OPTIONS[number]['value'];

export const PADDING_BOTTOM_LG_OPTIONS = [
  { label: 'lg:pb-0', value: 'lg:pb-0' }, { label: 'lg:pb-0.5', value: 'lg:pb-0.5' },
  { label: 'lg:pb-1', value: 'lg:pb-1' }, { label: 'lg:pb-1.5', value: 'lg:pb-1.5' },
  { label: 'lg:pb-2', value: 'lg:pb-2' }, { label: 'lg:pb-2.5', value: 'lg:pb-2.5' },
  { label: 'lg:pb-3', value: 'lg:pb-3' }, { label: 'lg:pb-3.5', value: 'lg:pb-3.5' },
  { label: 'lg:pb-4', value: 'lg:pb-4' }, { label: 'lg:pb-5', value: 'lg:pb-5' },
  { label: 'lg:pb-6', value: 'lg:pb-6' }, { label: 'lg:pb-7', value: 'lg:pb-7' },
  { label: 'lg:pb-8', value: 'lg:pb-8' }, { label: 'lg:pb-9', value: 'lg:pb-9' },
  { label: 'lg:pb-10', value: 'lg:pb-10' }, { label: 'lg:pb-11', value: 'lg:pb-11' },
  { label: 'lg:pb-12', value: 'lg:pb-12' }, { label: 'lg:pb-14', value: 'lg:pb-14' },
  { label: 'lg:pb-16', value: 'lg:pb-16' }, { label: 'lg:pb-20', value: 'lg:pb-20' },
  { label: 'lg:pb-24', value: 'lg:pb-24' }, { label: 'lg:pb-28', value: 'lg:pb-28' },
  { label: 'lg:pb-32', value: 'lg:pb-32' }, { label: 'lg:pb-36', value: 'lg:pb-36' },
  { label: 'lg:pb-40', value: 'lg:pb-40' }, { label: 'lg:pb-44', value: 'lg:pb-44' },
  { label: 'lg:pb-48', value: 'lg:pb-48' }, { label: 'lg:pb-52', value: 'lg:pb-52' },
  { label: 'lg:pb-56', value: 'lg:pb-56' }, { label: 'lg:pb-60', value: 'lg:pb-60' },
  { label: 'lg:pb-64', value: 'lg:pb-64' }, { label: 'lg:pb-72', value: 'lg:pb-72' },
  { label: 'lg:pb-80', value: 'lg:pb-80' }, { label: 'lg:pb-96', value: 'lg:pb-96' },
] as const;

export type PaddingBottomLgClass = typeof PADDING_BOTTOM_LG_OPTIONS[number]['value'];

export const PADDING_LEFT_LG_OPTIONS = [
  { label: 'lg:pl-0', value: 'lg:pl-0' }, { label: 'lg:pl-0.5', value: 'lg:pl-0.5' },
  { label: 'lg:pl-1', value: 'lg:pl-1' }, { label: 'lg:pl-1.5', value: 'lg:pl-1.5' },
  { label: 'lg:pl-2', value: 'lg:pl-2' }, { label: 'lg:pl-2.5', value: 'lg:pl-2.5' },
  { label: 'lg:pl-3', value: 'lg:pl-3' }, { label: 'lg:pl-3.5', value: 'lg:pl-3.5' },
  { label: 'lg:pl-4', value: 'lg:pl-4' }, { label: 'lg:pl-5', value: 'lg:pl-5' },
  { label: 'lg:pl-6', value: 'lg:pl-6' }, { label: 'lg:pl-7', value: 'lg:pl-7' },
  { label: 'lg:pl-8', value: 'lg:pl-8' }, { label: 'lg:pl-9', value: 'lg:pl-9' },
  { label: 'lg:pl-10', value: 'lg:pl-10' }, { label: 'lg:pl-11', value: 'lg:pl-11' },
  { label: 'lg:pl-12', value: 'lg:pl-12' }, { label: 'lg:pl-14', value: 'lg:pl-14' },
  { label: 'lg:pl-16', value: 'lg:pl-16' }, { label: 'lg:pl-20', value: 'lg:pl-20' },
  { label: 'lg:pl-24', value: 'lg:pl-24' }, { label: 'lg:pl-28', value: 'lg:pl-28' },
  { label: 'lg:pl-32', value: 'lg:pl-32' }, { label: 'lg:pl-36', value: 'lg:pl-36' },
  { label: 'lg:pl-40', value: 'lg:pl-40' }, { label: 'lg:pl-44', value: 'lg:pl-44' },
  { label: 'lg:pl-48', value: 'lg:pl-48' }, { label: 'lg:pl-52', value: 'lg:pl-52' },
  { label: 'lg:pl-56', value: 'lg:pl-56' }, { label: 'lg:pl-60', value: 'lg:pl-60' },
  { label: 'lg:pl-64', value: 'lg:pl-64' }, { label: 'lg:pl-72', value: 'lg:pl-72' },
  { label: 'lg:pl-80', value: 'lg:pl-80' }, { label: 'lg:pl-96', value: 'lg:pl-96' },
] as const;

export type PaddingLeftLgClass = typeof PADDING_LEFT_LG_OPTIONS[number]['value'];

export const MARGIN_TOP_LG_OPTIONS = [
  { label: 'lg:mt-0', value: 'lg:mt-0' }, { label: 'lg:mt-0.5', value: 'lg:mt-0.5' },
  { label: 'lg:mt-1', value: 'lg:mt-1' }, { label: 'lg:mt-1.5', value: 'lg:mt-1.5' },
  { label: 'lg:mt-2', value: 'lg:mt-2' }, { label: 'lg:mt-2.5', value: 'lg:mt-2.5' },
  { label: 'lg:mt-3', value: 'lg:mt-3' }, { label: 'lg:mt-3.5', value: 'lg:mt-3.5' },
  { label: 'lg:mt-4', value: 'lg:mt-4' }, { label: 'lg:mt-5', value: 'lg:mt-5' },
  { label: 'lg:mt-6', value: 'lg:mt-6' }, { label: 'lg:mt-7', value: 'lg:mt-7' },
  { label: 'lg:mt-8', value: 'lg:mt-8' }, { label: 'lg:mt-9', value: 'lg:mt-9' },
  { label: 'lg:mt-10', value: 'lg:mt-10' }, { label: 'lg:mt-11', value: 'lg:mt-11' },
  { label: 'lg:mt-12', value: 'lg:mt-12' }, { label: 'lg:mt-14', value: 'lg:mt-14' },
  { label: 'lg:mt-16', value: 'lg:mt-16' }, { label: 'lg:mt-20', value: 'lg:mt-20' },
  { label: 'lg:mt-24', value: 'lg:mt-24' }, { label: 'lg:mt-28', value: 'lg:mt-28' },
  { label: 'lg:mt-32', value: 'lg:mt-32' }, { label: 'lg:mt-36', value: 'lg:mt-36' },
  { label: 'lg:mt-40', value: 'lg:mt-40' }, { label: 'lg:mt-44', value: 'lg:mt-44' },
  { label: 'lg:mt-48', value: 'lg:mt-48' }, { label: 'lg:mt-52', value: 'lg:mt-52' },
  { label: 'lg:mt-56', value: 'lg:mt-56' }, { label: 'lg:mt-60', value: 'lg:mt-60' },
  { label: 'lg:mt-64', value: 'lg:mt-64' }, { label: 'lg:mt-72', value: 'lg:mt-72' },
  { label: 'lg:mt-80', value: 'lg:mt-80' }, { label: 'lg:mt-96', value: 'lg:mt-96' },
] as const;

export type MarginTopLgClass = typeof MARGIN_TOP_LG_OPTIONS[number]['value'];

export const MARGIN_RIGHT_LG_OPTIONS = [
  { label: 'lg:mr-0', value: 'lg:mr-0' }, { label: 'lg:mr-0.5', value: 'lg:mr-0.5' },
  { label: 'lg:mr-1', value: 'lg:mr-1' }, { label: 'lg:mr-1.5', value: 'lg:mr-1.5' },
  { label: 'lg:mr-2', value: 'lg:mr-2' }, { label: 'lg:mr-2.5', value: 'lg:mr-2.5' },
  { label: 'lg:mr-3', value: 'lg:mr-3' }, { label: 'lg:mr-3.5', value: 'lg:mr-3.5' },
  { label: 'lg:mr-4', value: 'lg:mr-4' }, { label: 'lg:mr-5', value: 'lg:mr-5' },
  { label: 'lg:mr-6', value: 'lg:mr-6' }, { label: 'lg:mr-7', value: 'lg:mr-7' },
  { label: 'lg:mr-8', value: 'lg:mr-8' }, { label: 'lg:mr-9', value: 'lg:mr-9' },
  { label: 'lg:mr-10', value: 'lg:mr-10' }, { label: 'lg:mr-11', value: 'lg:mr-11' },
  { label: 'lg:mr-12', value: 'lg:mr-12' }, { label: 'lg:mr-14', value: 'lg:mr-14' },
  { label: 'lg:mr-16', value: 'lg:mr-16' }, { label: 'lg:mr-20', value: 'lg:mr-20' },
  { label: 'lg:mr-24', value: 'lg:mr-24' }, { label: 'lg:mr-28', value: 'lg:mr-28' },
  { label: 'lg:mr-32', value: 'lg:mr-32' }, { label: 'lg:mr-36', value: 'lg:mr-36' },
  { label: 'lg:mr-40', value: 'lg:mr-40' }, { label: 'lg:mr-44', value: 'lg:mr-44' },
  { label: 'lg:mr-48', value: 'lg:mr-48' }, { label: 'lg:mr-52', value: 'lg:mr-52' },
  { label: 'lg:mr-56', value: 'lg:mr-56' }, { label: 'lg:mr-60', value: 'lg:mr-60' },
  { label: 'lg:mr-64', value: 'lg:mr-64' }, { label: 'lg:mr-72', value: 'lg:mr-72' },
  { label: 'lg:mr-80', value: 'lg:mr-80' }, { label: 'lg:mr-96', value: 'lg:mr-96' },
] as const;

export type MarginRightLgClass = typeof MARGIN_RIGHT_LG_OPTIONS[number]['value'];

export const MARGIN_BOTTOM_LG_OPTIONS = [
  { label: 'lg:mb-0', value: 'lg:mb-0' }, { label: 'lg:mb-0.5', value: 'lg:mb-0.5' },
  { label: 'lg:mb-1', value: 'lg:mb-1' }, { label: 'lg:mb-1.5', value: 'lg:mb-1.5' },
  { label: 'lg:mb-2', value: 'lg:mb-2' }, { label: 'lg:mb-2.5', value: 'lg:mb-2.5' },
  { label: 'lg:mb-3', value: 'lg:mb-3' }, { label: 'lg:mb-3.5', value: 'lg:mb-3.5' },
  { label: 'lg:mb-4', value: 'lg:mb-4' }, { label: 'lg:mb-5', value: 'lg:mb-5' },
  { label: 'lg:mb-6', value: 'lg:mb-6' }, { label: 'lg:mb-7', value: 'lg:mb-7' },
  { label: 'lg:mb-8', value: 'lg:mb-8' }, { label: 'lg:mb-9', value: 'lg:mb-9' },
  { label: 'lg:mb-10', value: 'lg:mb-10' }, { label: 'lg:mb-11', value: 'lg:mb-11' },
  { label: 'lg:mb-12', value: 'lg:mb-12' }, { label: 'lg:mb-14', value: 'lg:mb-14' },
  { label: 'lg:mb-16', value: 'lg:mb-16' }, { label: 'lg:mb-20', value: 'lg:mb-20' },
  { label: 'lg:mb-24', value: 'lg:mb-24' }, { label: 'lg:mb-28', value: 'lg:mb-28' },
  { label: 'lg:mb-32', value: 'lg:mb-32' }, { label: 'lg:mb-36', value: 'lg:mb-36' },
  { label: 'lg:mb-40', value: 'lg:mb-40' }, { label: 'lg:mb-44', value: 'lg:mb-44' },
  { label: 'lg:mb-48', value: 'lg:mb-48' }, { label: 'lg:mb-52', value: 'lg:mb-52' },
  { label: 'lg:mb-56', value: 'lg:mb-56' }, { label: 'lg:mb-60', value: 'lg:mb-60' },
  { label: 'lg:mb-64', value: 'lg:mb-64' }, { label: 'lg:mb-72', value: 'lg:mb-72' },
  { label: 'lg:mb-80', value: 'lg:mb-80' }, { label: 'lg:mb-96', value: 'lg:mb-96' },
] as const;

export type MarginBottomLgClass = typeof MARGIN_BOTTOM_LG_OPTIONS[number]['value'];

export const MARGIN_LEFT_LG_OPTIONS = [
  { label: 'lg:ml-0', value: 'lg:ml-0' }, { label: 'lg:ml-0.5', value: 'lg:ml-0.5' },
  { label: 'lg:ml-1', value: 'lg:ml-1' }, { label: 'lg:ml-1.5', value: 'lg:ml-1.5' },
  { label: 'lg:ml-2', value: 'lg:ml-2' }, { label: 'lg:ml-2.5', value: 'lg:ml-2.5' },
  { label: 'lg:ml-3', value: 'lg:ml-3' }, { label: 'lg:ml-3.5', value: 'lg:ml-3.5' },
  { label: 'lg:ml-4', value: 'lg:ml-4' }, { label: 'lg:ml-5', value: 'lg:ml-5' },
  { label: 'lg:ml-6', value: 'lg:ml-6' }, { label: 'lg:ml-7', value: 'lg:ml-7' },
  { label: 'lg:ml-8', value: 'lg:ml-8' }, { label: 'lg:ml-9', value: 'lg:ml-9' },
  { label: 'lg:ml-10', value: 'lg:ml-10' }, { label: 'lg:ml-11', value: 'lg:ml-11' },
  { label: 'lg:ml-12', value: 'lg:ml-12' }, { label: 'lg:ml-14', value: 'lg:ml-14' },
  { label: 'lg:ml-16', value: 'lg:ml-16' }, { label: 'lg:ml-20', value: 'lg:ml-20' },
  { label: 'lg:ml-24', value: 'lg:ml-24' }, { label: 'lg:ml-28', value: 'lg:ml-28' },
  { label: 'lg:ml-32', value: 'lg:ml-32' }, { label: 'lg:ml-36', value: 'lg:ml-36' },
  { label: 'lg:ml-40', value: 'lg:ml-40' }, { label: 'lg:ml-44', value: 'lg:ml-44' },
  { label: 'lg:ml-48', value: 'lg:ml-48' }, { label: 'lg:ml-52', value: 'lg:ml-52' },
  { label: 'lg:ml-56', value: 'lg:ml-56' }, { label: 'lg:ml-60', value: 'lg:ml-60' },
  { label: 'lg:ml-64', value: 'lg:ml-64' }, { label: 'lg:ml-72', value: 'lg:ml-72' },
  { label: 'lg:ml-80', value: 'lg:ml-80' }, { label: 'lg:ml-96', value: 'lg:ml-96' },
] as const;

export type MarginLeftLgClass = typeof MARGIN_LEFT_LG_OPTIONS[number]['value'];

export const MIN_HEIGHT_OPTIONS = [
  { label: 'min-h-8', value: 'min-h-8' },
  { label: 'min-h-9', value: 'min-h-9' },
  { label: 'min-h-10', value: 'min-h-10' },
  { label: 'min-h-11', value: 'min-h-11' },
  { label: 'min-h-12', value: 'min-h-12' },
  { label: 'min-h-14', value: 'min-h-14' },
  { label: 'min-h-16', value: 'min-h-16' },
  { label: 'min-h-20', value: 'min-h-20' },
  { label: 'min-h-24', value: 'min-h-24' },
  { label: 'min-h-28', value: 'min-h-28' },
  { label: 'min-h-32', value: 'min-h-32' },
] as const;

export type MinHeightClass = typeof MIN_HEIGHT_OPTIONS[number]['value'];

/**
 * A small square icon box's two adjacent borders (top + right, forming a
 * CSS-only chevron point once rotated — see AboutMobileAccordion's own
 * disclosure affordance) plus its thickness, as one complete literal class
 * combo per option — never assembled at runtime (`border-t-${n}
 * border-r-${n}`), same reasoning as every other catalog in this file.
 */
export const AFFORDANCE_BORDER_THICKNESS_OPTIONS = [
  { label: '1px', value: 'border-t border-r' },
  { label: '2px', value: 'border-t-2 border-r-2' },
  { label: '4px', value: 'border-t-4 border-r-4' },
  { label: '8px', value: 'border-t-8 border-r-8' },
] as const;

export type AffordanceBorderThicknessClass =
  typeof AFFORDANCE_BORDER_THICKNESS_OPTIONS[number]['value'];

/** Width + height of the same affordance icon box, before rotation — its
 * own independent literal-combo catalog (dimension is not thickness). */
export const AFFORDANCE_DIMENSION_OPTIONS = [
  { label: '10px', value: 'w-2.5 h-2.5' },
  { label: '12px', value: 'w-3 h-3' },
  { label: '16px', value: 'w-4 h-4' },
  { label: '20px', value: 'w-5 h-5' },
] as const;

export type AffordanceDimensionClass = typeof AFFORDANCE_DIMENSION_OPTIONS[number]['value'];

/** Radius of the corner where the affordance's two visible borders meet
 * (top-right) — Tailwind's own per-corner radius vocabulary, not the
 * full-shape `rounded-*` scale `CARD_RADIUS_VALUES` (about.config.ts) uses
 * elsewhere, since only one corner is ever rounded here. */
export const AFFORDANCE_CORNER_RADIUS_OPTIONS = [
  { label: 'NONE', value: 'rounded-tr-none' },
  { label: 'SM', value: 'rounded-tr-sm' },
  { label: 'MD', value: 'rounded-tr-md' },
  { label: 'LG', value: 'rounded-tr-lg' },
  { label: 'FULL', value: 'rounded-tr-full' },
] as const;

export type AffordanceCornerRadiusClass =
  typeof AFFORDANCE_CORNER_RADIUS_OPTIONS[number]['value'];

const TAILWIND_SPACING_PX: Record<string, number> = {
  '0': 0, '0.5': 2, '1': 4, '1.5': 6, '2': 8, '2.5': 10, '3': 12,
  '3.5': 14, '4': 16, '5': 20, '6': 24, '7': 28, '8': 32, '9': 36,
  '10': 40, '11': 44, '12': 48, '14': 56, '16': 64, '20': 80, '24': 96,
  '28': 112, '32': 128, '36': 144, '40': 160, '44': 176, '48': 192,
  '52': 208, '56': 224, '60': 240, '64': 256, '72': 288, '80': 320, '96': 384,
};

/** Resolves a validated literal spacing token only where runtime math needs px. */
export function tailwindSpacingTokenToPx(token: string, fallback: number) {
  const parts = token.split('-');
  const suffix = parts[parts.length - 1] ?? '';
  return TAILWIND_SPACING_PX[suffix] ?? fallback;
}
