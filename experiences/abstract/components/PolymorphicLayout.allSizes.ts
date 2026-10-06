import type { PolymorphicLayoutConfig } from './PolymorphicLayout.config';

const WIDE_ALIGN_BY_BASE: Record<
  PolymorphicLayoutConfig['wideColumnContentVerticalAlign'],
  PolymorphicLayoutConfig['wideColumnContentVerticalAlignWide']
> = {
  'justify-start': 'md:justify-start',
  'justify-center': 'md:justify-center',
  'justify-end': 'md:justify-end',
};

const LG_ALIGN_BY_BASE: Record<
  PolymorphicLayoutConfig['wideColumnContentVerticalAlign'],
  PolymorphicLayoutConfig['wideColumnContentVerticalAlignLg']
> = {
  'justify-start': 'lg:justify-start',
  'justify-center': 'lg:justify-center',
  'justify-end': 'lg:justify-end',
};

/** Keep the shared panel's mobile vertical alignment effective at md/lg. */
export function applyPolymorphicLayoutAllSizesUpdate(
  previous: PolymorphicLayoutConfig,
  next: PolymorphicLayoutConfig,
): PolymorphicLayoutConfig {
  let resolved = next;
  if (next.wideColumnContentVerticalAlign !== previous.wideColumnContentVerticalAlign) {
    resolved = {
      ...resolved,
      wideColumnContentVerticalAlignWide: WIDE_ALIGN_BY_BASE[next.wideColumnContentVerticalAlign],
      wideColumnContentVerticalAlignLg: LG_ALIGN_BY_BASE[next.wideColumnContentVerticalAlign],
    };
  }
  if (next.narrowColumnContentVerticalAlign !== previous.narrowColumnContentVerticalAlign) {
    resolved = {
      ...resolved,
      narrowColumnContentVerticalAlignWide: WIDE_ALIGN_BY_BASE[next.narrowColumnContentVerticalAlign],
      narrowColumnContentVerticalAlignLg: LG_ALIGN_BY_BASE[next.narrowColumnContentVerticalAlign],
    };
  }
  return resolved;
}
