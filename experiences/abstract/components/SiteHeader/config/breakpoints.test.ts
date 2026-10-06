import { describe, expect, it } from 'vitest';
import { tailwindTokenCssValue } from '../../../../../components/Panel/config/tailwindFields';
import { SITE_HEADER_COLORS_PANEL } from './panel';
import { DEFAULT_SITE_HEADER_CONFIG, normalizeSiteHeaderConfig } from './registered';

type Entry = { kind: string; key?: string; options?: ReadonlyArray<{ value: string }>; fields?: ReadonlyArray<Entry> };

function field(entries: ReadonlyArray<Entry>, key: string): Entry | undefined {
  for (const entry of entries) {
    if (entry.key === key) return entry;
    if (entry.fields) {
      const nested = field(entry.fields, key);
      if (nested) return nested;
    }
  }
  return undefined;
}

describe('SiteHeader breakpoint controls', () => {
  const tabs = SITE_HEADER_COLORS_PANEL.fields.find(entry => entry.kind === 'tabs');

  it('separates shared values from three independently configurable tiers', () => {
    expect(tabs?.kind).toBe('tabs');
    if (tabs?.kind !== 'tabs') return;
    expect(tabs.tabs.map(tab => tab.label)).toEqual([
      'ALL SIZES', 'MOBILE (< 768px)', 'TABLET (≥ 768px)', 'DESKTOP (≥ 1024px)',
    ]);
    for (const [index, suffix, prefix] of [[1, '', ''], [2, 'Wide', 'md:'], [3, 'Lg', 'lg:']] as const) {
      const entries = tabs.tabs[index].fields as ReadonlyArray<Entry>;
      for (const [key, count] of [[`paddingX${suffix}`, 35], [`navFontSize${suffix}`, 16], [`navGap${suffix}`, 35]] as const) {
        const control = field(entries, key);
        expect(control?.kind).toBe('select');
        expect(control?.options).toHaveLength(count);
        expect(control?.options?.every(option => option.value.startsWith(prefix))).toBe(true);
      }
    }
  });

  it('normalizes each tier and maps old persisted names and arbitrary font sizes', () => {
    const current = normalizeSiteHeaderConfig({
      paddingX: 'px-0', paddingXWide: 'md:px-12', paddingXLg: 'lg:px-96',
      navFontSize: 'text-4xs', navFontSizeWide: 'md:text-3xs', navFontSizeLg: 'lg:text-2xs',
    });
    expect([current.paddingX, current.paddingXWide, current.paddingXLg]).toEqual(['px-0', 'md:px-12', 'lg:px-96']);
    expect([current.navFontSize, current.navFontSizeWide, current.navFontSizeLg]).toEqual(['text-4xs', 'md:text-3xs', 'lg:text-2xs']);

    const legacy = normalizeSiteHeaderConfig({
      desktopPaddingX: 'md:px-8', mobileNavGap: 'gap-2', navGap: 'md:gap-6',
      navFontSizeNarrow: 'text-[9px]', navFontSizeDesktop: 'md:text-[11px]',
      mobileNavDivider: "before:content-['⋅']",
    } as unknown as Partial<typeof DEFAULT_SITE_HEADER_CONFIG>);
    expect([legacy.paddingXWide, legacy.paddingXLg]).toEqual(['md:px-8', 'lg:px-8']);
    expect([legacy.navGap, legacy.navGapWide, legacy.navGapLg]).toEqual(['gap-2', 'md:gap-6', 'lg:gap-6']);
    expect([legacy.navFontSize, legacy.navFontSizeWide, legacy.navFontSizeLg]).toEqual(['text-4xs', 'md:text-2xs', 'lg:text-2xs']);
    expect(legacy.mobileNavDivider).toBe('dot');
    expect(tailwindTokenCssValue('fontSize', 'base', legacy.navFontSize)).toBe('0.5625rem');
  });

  it('rejects a token from the wrong breakpoint', () => {
    expect(normalizeSiteHeaderConfig({ paddingXLg: 'md:px-8' as never }).paddingXLg)
      .toBe(DEFAULT_SITE_HEADER_CONFIG.paddingXLg);
  });
});
