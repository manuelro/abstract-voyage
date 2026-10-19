import { normalizeTailwindToken, type TailwindTokenValue } from '../../../../components/Panel/config/tailwindFields';

/**
 * Shared "part" appearance for the editorial quote's two sub-components: the
 * source HEADING ("The questions (circa 2017)") and the source LINK
 * ("Explore this chapter"). These are ONE shared appearance each, consumed by
 * every quote type. EditorialQuote uses the shared heading size and opacity
 * until a type's base Quote controls differ from that type's preset.
 *
 * What is NOT here (stays per-type on EditorialQuoteConfig): whether the part is
 * shown, where it sits (placement), its alignment, and its label/content. Those
 * legitimately differ between types (featured shows the heading, plain hides it;
 * solid says "Read the full passage"). The LOOK AND FEEL is shared; the
 * presence/placement/content is specialized.
 *
 * Every token-backed field uses the generated Tailwind field system
 * (TailwindTokenValue + normalizeTailwindToken), per AGENTS.md.
 */

export type QuotePartColorMode = 'inherit' | 'custom';

type QuotePartAppearanceBase = {
  size: TailwindTokenValue<'fontSize'>;
  fontFamily: TailwindTokenValue<'fontFamily'>;
  fontWeight: TailwindTokenValue<'fontWeight'>;
  tracking: TailwindTokenValue<'letterSpacing'>;
  /** 'inherit' resolves to the quote's own computed ink (resolveEditorialInk);
   * 'custom' uses `color`. Defaults to 'custom' with today's hex so the current
   * look is preserved exactly; inheriting the quote ink is opt-in. */
  colorMode: QuotePartColorMode;
  color: string;
  paddingTop: TailwindTokenValue<'paddingTop'>;
  paddingRight: TailwindTokenValue<'paddingRight'>;
  paddingBottom: TailwindTokenValue<'paddingBottom'>;
  paddingLeft: TailwindTokenValue<'paddingLeft'>;
};

export type QuoteHeadingAppearanceConfig = QuotePartAppearanceBase & {
  textTransform: TailwindTokenValue<'textTransform'>;
  opacityPercent: number;
};

export type QuoteSourceLinkAppearanceConfig = QuotePartAppearanceBase & {
  icon: 'none' | 'arrow-up-right' | 'arrow-right';
  iconPlacement: 'before' | 'after';
  iconSize: TailwindTokenValue<'fontSize'>;
  iconGap: TailwindTokenValue<'gap'>;
};

// Defaults mirror the previous per-variant editorialDefaults heading/link values
// exactly, so promoting these to a single shared config changes nothing visually.
export const DEFAULT_QUOTE_HEADING_APPEARANCE: QuoteHeadingAppearanceConfig = {
  size: 'text-3xs', fontFamily: 'font-sans', fontWeight: 'font-medium', tracking: 'tracking-widest',
  textTransform: 'uppercase',
  opacityPercent: 80,
  colorMode: 'inherit', color: '#53697e',
  paddingTop: 'pt-1', paddingRight: 'pr-0', paddingBottom: 'pb-10', paddingLeft: 'pl-0',
};

export const DEFAULT_QUOTE_SOURCE_LINK_APPEARANCE: QuoteSourceLinkAppearanceConfig = {
  size: 'text-sm', fontFamily: 'font-sans', fontWeight: 'font-normal', tracking: 'tracking-normal',
  colorMode: 'inherit', color: '#315b82',
  paddingTop: 'pt-0', paddingRight: 'pr-0', paddingBottom: 'pb-0', paddingLeft: 'pl-1',
  icon: 'none', iconPlacement: 'after', iconSize: 'text-sm', iconGap: 'gap-1',
};

const HEX = /^#[0-9a-f]{6}$/i;
function color(value: unknown, fallback: string): string {
  return typeof value === 'string' && HEX.test(value) ? value : fallback;
}
function token<T extends 'fontSize' | 'fontFamily' | 'fontWeight' | 'letterSpacing' | 'textTransform' | 'paddingTop' | 'paddingRight' | 'paddingBottom' | 'paddingLeft' | 'gap'>(
  utility: T, value: unknown, fallback: TailwindTokenValue<T>,
): TailwindTokenValue<T> {
  return normalizeTailwindToken({ utility, breakpoint: 'base', value, fallback });
}
function colorMode(value: unknown, fallback: QuotePartColorMode): QuotePartColorMode {
  return value === 'inherit' || value === 'custom' ? value : fallback;
}

function normalizePartAppearance(
  value: Partial<QuotePartAppearanceBase> | undefined,
  fallback: QuotePartAppearanceBase,
): QuotePartAppearanceBase {
  return {
    size: token('fontSize', value?.size, fallback.size),
    fontFamily: token('fontFamily', value?.fontFamily, fallback.fontFamily),
    fontWeight: token('fontWeight', value?.fontWeight, fallback.fontWeight),
    tracking: token('letterSpacing', value?.tracking, fallback.tracking),
    colorMode: colorMode(value?.colorMode, fallback.colorMode),
    color: color(value?.color, fallback.color),
    paddingTop: token('paddingTop', value?.paddingTop, fallback.paddingTop),
    paddingRight: token('paddingRight', value?.paddingRight, fallback.paddingRight),
    paddingBottom: token('paddingBottom', value?.paddingBottom, fallback.paddingBottom),
    paddingLeft: token('paddingLeft', value?.paddingLeft, fallback.paddingLeft),
  };
}

export function normalizeQuoteHeadingAppearance(
  value: Partial<QuoteHeadingAppearanceConfig> | undefined,
  fallback: QuoteHeadingAppearanceConfig = DEFAULT_QUOTE_HEADING_APPEARANCE,
): QuoteHeadingAppearanceConfig {
  return {
    ...normalizePartAppearance(value, fallback),
    textTransform: token('textTransform', value?.textTransform, fallback.textTransform),
    opacityPercent: typeof value?.opacityPercent === 'number' && Number.isFinite(value.opacityPercent)
      ? Math.max(0, Math.min(100, value.opacityPercent)) : fallback.opacityPercent,
  };
}

export function normalizeQuoteSourceLinkAppearance(
  value: Partial<QuoteSourceLinkAppearanceConfig> | undefined,
  fallback: QuoteSourceLinkAppearanceConfig = DEFAULT_QUOTE_SOURCE_LINK_APPEARANCE,
): QuoteSourceLinkAppearanceConfig {
  return {
    ...normalizePartAppearance(value, fallback),
    icon: value?.icon === 'none' || value?.icon === 'arrow-right' ? value.icon : 'arrow-up-right',
    iconPlacement: value?.iconPlacement === 'before' ? 'before' : 'after',
    iconSize: token('fontSize', value?.iconSize, fallback.iconSize),
    iconGap: token('gap', value?.iconGap, fallback.iconGap),
  };
}
