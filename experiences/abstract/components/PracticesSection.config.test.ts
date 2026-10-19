import { describe, expect, it } from 'vitest';
import {
  DEFAULT_PRACTICES_SECTION_LAYOUT_CONFIG,
  normalizePracticesSectionLayoutConfig,
  resolvePracticesColumnCount,
  type PracticesSectionLayoutConfig,
} from './PracticesSection.config';

const D = DEFAULT_PRACTICES_SECTION_LAYOUT_CONFIG;

describe('normalizePracticesSectionLayoutConfig', () => {
  it('returns the defaults for undefined', () => {
    expect(normalizePracticesSectionLayoutConfig(undefined)).toEqual(D);
  });

  it('clamps numeric fields into range and rounds', () => {
    const out = normalizePracticesSectionLayoutConfig({
      columnTargetWidthPx: 99999, minColumnWidthPx: -5, maxColumnCount: 9, separatorOpacityPercent: 150,
    });
    expect(out.columnTargetWidthPx).toBe(900);
    expect(out.minColumnWidthPx).toBe(120);
    expect(out.maxColumnCount).toBe(4);
    expect(out.separatorOpacityPercent).toBe(100);
  });

  it('normalizes emphasis weight and opacity independently of body opacity', () => {
    expect(normalizePracticesSectionLayoutConfig({ emphasisFontWeight: 'font-black', emphasisOpacityPercent: 150 })).toMatchObject({
      emphasisFontWeight: 'font-black', emphasisOpacityPercent: 100, contentOpacityPercent: D.contentOpacityPercent,
    });
    expect(normalizePracticesSectionLayoutConfig({
      emphasisFontWeight: 'font-impossible' as PracticesSectionLayoutConfig['emphasisFontWeight'],
      emphasisOpacityPercent: -10,
    })).toMatchObject({ emphasisFontWeight: D.emphasisFontWeight, emphasisOpacityPercent: 0 });
  });

  it('falls back on invalid enums, tokens and colors', () => {
    const out = normalizePracticesSectionLayoutConfig({
      separatorStyle: 'nonsense' as PracticesSectionLayoutConfig['separatorStyle'],
      separatorColorMode: 'bogus' as PracticesSectionLayoutConfig['separatorColorMode'],
      separatorColor: 'not-a-hex',
      columnGap: 'gap-does-not-exist' as PracticesSectionLayoutConfig['columnGap'],
      rowGapMd: 'md:gap-16',
    });
    expect(out.separatorStyle).toBe(D.separatorStyle);
    expect(out.separatorColorMode).toBe(D.separatorColorMode);
    expect(out.separatorColor).toBe(D.separatorColor);
    expect(out.columnGap).toBe(D.columnGap);
    expect(out.rowGapMd).toBe('md:gap-16');
  });

  it('accepts valid custom values', () => {
    const out = normalizePracticesSectionLayoutConfig({
      separatorStyle: 'vertical-and-row', separatorColorMode: 'custom', separatorColor: '#abcdef', columnGapLg: 'lg:gap-24',
    });
    expect(out.separatorStyle).toBe('vertical-and-row');
    expect(out.separatorColorMode).toBe('custom');
    expect(out.separatorColor).toBe('#abcdef');
    expect(out.columnGapLg).toBe('lg:gap-24');
  });

  it('defaults both divider opt-ins off and normalizes boolean edits', () => {
    expect(D.sectionDividerEnabled).toBe(false);
    expect(D.practiceDividersEnabled).toBe(false);
    expect(normalizePracticesSectionLayoutConfig({ sectionDividerEnabled: true, practiceDividersEnabled: true })).toMatchObject({
      sectionDividerEnabled: true, practiceDividersEnabled: true,
    });
    expect(normalizePracticesSectionLayoutConfig({ sectionDividerEnabled: 'yes' as unknown as boolean }).sectionDividerEnabled).toBe(false);
  });

  it('accepts valid header/paragraph max-width tokens and falls back on invalid ones', () => {
    const valid = normalizePracticesSectionLayoutConfig({
      headerMaxWidth: 'max-w-6xl', paragraphMaxWidth: 'max-w-prose',
      paragraphMaxWidthMd: 'md:max-w-2xl', paragraphMaxWidthLg: 'lg:max-w-xl',
    });
    expect(valid.headerMaxWidth).toBe('max-w-6xl');
    expect(valid.paragraphMaxWidth).toBe('max-w-prose');
    expect(valid.paragraphMaxWidthMd).toBe('md:max-w-2xl');
    expect(valid.paragraphMaxWidthLg).toBe('lg:max-w-xl');
    const invalid = normalizePracticesSectionLayoutConfig({
      headerMaxWidth: 'max-w-does-not-exist' as PracticesSectionLayoutConfig['headerMaxWidth'],
    });
    expect(invalid.headerMaxWidth).toBe(D.headerMaxWidth);
  });

  it('normalizes the title-to-grid gap at each breakpoint', () => {
    const out = normalizePracticesSectionLayoutConfig({
      titleGroupGap: 'mt-0',
      titleGroupGapMd: 'md:mt-24',
      titleGroupGapLg: 'lg:mt-8',
    });
    expect([out.titleGroupGap, out.titleGroupGapMd, out.titleGroupGapLg]).toEqual(['mt-0', 'md:mt-24', 'lg:mt-8']);
    expect(normalizePracticesSectionLayoutConfig({ titleGroupGapMd: 'md:mt-invalid' as PracticesSectionLayoutConfig['titleGroupGapMd'] }).titleGroupGapMd).toBe(D.titleGroupGapMd);
  });

  it('accepts independent font sizes for each breakpoint and rejects invalid tokens', () => {
    const out = normalizePracticesSectionLayoutConfig({
      sectionTitleFontSize: 'text-sm',
      sectionTitleFontSizeMd: 'md:text-4xl',
      sectionTitleFontSizeLg: 'lg:text-5xl',
      subsectionTitleFontSizeMd: 'md:text-xs',
      bodyFontSizeLg: 'lg:text-xl',
      subtextFontSizeMd: 'md:text-lg',
    });
    expect([out.sectionTitleFontSize, out.sectionTitleFontSizeMd, out.sectionTitleFontSizeLg])
      .toEqual(['text-sm', 'md:text-4xl', 'lg:text-5xl']);
    expect(out.subsectionTitleFontSizeMd).toBe('md:text-xs');
    expect(out.bodyFontSizeLg).toBe('lg:text-xl');
    expect(out.subtextFontSizeMd).toBe('md:text-lg');
    expect(normalizePracticesSectionLayoutConfig({ sectionTitleFontSizeMd: 'md:text-invalid' as PracticesSectionLayoutConfig['sectionTitleFontSizeMd'] }).sectionTitleFontSizeMd)
      .toBe(D.sectionTitleFontSizeMd);
  });

  it('normalizes each between-subgroup gap at each breakpoint', () => {
    const out = normalizePracticesSectionLayoutConfig({
      gridToDividerGap: 'mt-0', gridToDividerGapMd: 'md:mt-8', gridToDividerGapLg: 'lg:mt-12',
      dividerToDetailsGap: 'mt-4', dividerToDetailsGapMd: 'md:mt-10', dividerToDetailsGapLg: 'lg:mt-16',
      industryGap: 'mt-6', industryGapMd: 'md:mt-14', industryGapLg: 'lg:mt-20',
      ctaGap: 'mt-8', ctaGapMd: 'md:mt-16', ctaGapLg: 'lg:mt-24',
    });
    expect([out.gridToDividerGap, out.gridToDividerGapMd, out.gridToDividerGapLg]).toEqual(['mt-0', 'md:mt-8', 'lg:mt-12']);
    expect([out.dividerToDetailsGap, out.dividerToDetailsGapMd, out.dividerToDetailsGapLg]).toEqual(['mt-4', 'md:mt-10', 'lg:mt-16']);
    expect([out.industryGap, out.industryGapMd, out.industryGapLg]).toEqual(['mt-6', 'md:mt-14', 'lg:mt-20']);
    expect([out.ctaGap, out.ctaGapMd, out.ctaGapLg]).toEqual(['mt-8', 'md:mt-16', 'lg:mt-24']);
    expect(normalizePracticesSectionLayoutConfig({ ctaGapMd: 'md:mt-invalid' as PracticesSectionLayoutConfig['ctaGapMd'] }).ctaGapMd).toBe(D.ctaGapMd);
  });

  it('clamps the practice card measure into the 16-90 ch range', () => {
    const out = normalizePracticesSectionLayoutConfig({
      practiceCardMeasureCh: 9999, practiceCardMeasureChMd: 1, practiceCardMeasureChLg: 48,
    });
    expect(out.practiceCardMeasureCh).toBe(90);
    expect(out.practiceCardMeasureChMd).toBe(16);
    expect(out.practiceCardMeasureChLg).toBe(48);
  });

  it('accepts subtext typography/padding tokens, falling back on invalid ones', () => {
    const out = normalizePracticesSectionLayoutConfig({
      subtextFontSize: 'text-lg', subtextFontFamily: 'font-serif', subtextFontWeight: 'font-medium',
      subtextLineHeight: 'leading-snug', subtextLetterSpacing: 'tracking-wide', subtextTextTransform: 'uppercase',
      subtextPaddingTop: 'pt-8', subtextPaddingRight: 'pr-4', subtextPaddingBottom: 'pb-2', subtextPaddingLeft: 'pl-4',
    });
    expect(out.subtextFontSize).toBe('text-lg');
    expect(out.subtextFontFamily).toBe('font-serif');
    expect(out.subtextFontWeight).toBe('font-medium');
    expect(out.subtextLineHeight).toBe('leading-snug');
    expect(out.subtextLetterSpacing).toBe('tracking-wide');
    expect(out.subtextTextTransform).toBe('uppercase');
    expect(out.subtextPaddingTop).toBe('pt-8');
    expect(out.subtextPaddingRight).toBe('pr-4');
    expect(out.subtextPaddingBottom).toBe('pb-2');
    expect(out.subtextPaddingLeft).toBe('pl-4');

    const invalid = normalizePracticesSectionLayoutConfig({
      subtextFontSize: 'text-does-not-exist' as PracticesSectionLayoutConfig['subtextFontSize'],
    });
    expect(invalid.subtextFontSize).toBe(D.subtextFontSize);
  });
});

describe('resolvePracticesColumnCount', () => {
  it('returns 1 for unmeasured / zero width', () => {
    expect(resolvePracticesColumnCount(0, 48, D)).toBe(1);
    expect(resolvePracticesColumnCount(Number.NaN, 48, D)).toBe(1);
  });

  it('is a single column at narrow (mobile) widths', () => {
    expect(resolvePracticesColumnCount(360, 48, D)).toBe(1);
  });

  it('never exceeds the configured column ceiling, however wide the container', () => {
    expect(resolvePracticesColumnCount(1072, 80, D)).toBeLessThanOrEqual(D.maxColumnCount);
    expect(resolvePracticesColumnCount(1072, 80, D)).toBeGreaterThanOrEqual(1);
    // A very wide container saturates at exactly the ceiling.
    expect(resolvePracticesColumnCount(6000, 80, D)).toBe(D.maxColumnCount);
  });

  it('reaches a full row of four when the target is small and the ceiling allows it', () => {
    const cfg = { ...D, maxColumnCount: 4, columnTargetWidthPx: 240, minColumnWidthPx: 180, maxColumnWidthPx: 400 };
    expect(resolvePracticesColumnCount(1072, 24, cfg)).toBe(4);
  });

  it('drops columns so none fall below the min width', () => {
    const cfg = { ...D, maxColumnCount: 4, columnTargetWidthPx: 200, minColumnWidthPx: 400 };
    // 1072 wide: 4 would be ~250px each (< 400), so it steps down to 2 (~524px).
    expect(resolvePracticesColumnCount(1072, 24, cfg)).toBe(2);
  });

  it('adds columns so none exceed the max width, up to the ceiling', () => {
    const cfg = { ...D, maxColumnCount: 4, columnTargetWidthPx: 1000, minColumnWidthPx: 120, maxColumnWidthPx: 300 };
    expect(resolvePracticesColumnCount(1200, 0, cfg)).toBe(4);
  });
});
