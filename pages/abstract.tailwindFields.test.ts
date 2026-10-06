import { describe, expect, it } from 'vitest';
import type { RuntimeConfigFieldDefinition } from '../components/Panel/config';
import {
  DEFAULT_ABSTRACT_HERO_ACCORDION_ITEM_CONFIG,
  DEFAULT_ABSTRACT_COVER_FLOW_TIMELINE_SLOT_CONFIG,
  DEFAULT_ABSTRACT_FOOTER_CONFIG,
  normalizeAbstractCoverFlowTimelineSlotConfig,
  normalizeAbstractFooterConfig,
} from './abstract.config';
import {
  ABSTRACT_COVER_FLOW_TIMELINE_SLOT_PANEL,
  ABSTRACT_FOOTER_PANEL,
  ABSTRACT_HERO_ACCORDION_ITEM_PANEL,
  ABSTRACT_POLYMORPHIC_LAYOUT_PANEL,
} from './abstract.panel';
import { ABOUT_POLYMORPHIC_LAYOUT_PANEL } from './about.panel';
import { CONTACT_POLYMORPHIC_LAYOUT_PANEL } from './contact.panel';
import { JOURNAL_POLYMORPHIC_LAYOUT_PANEL } from './journal.panel';
import {
  DEFAULT_ABOUT_MOBILE_ACCORDION_CONFIG,
  normalizeAboutMobileAccordionConfig,
} from '../experiences/about/components/AboutMobileAccordion.config';
import { normalizeCardAppearanceConfig } from '../experiences/abstract/components/Card/config/appearance';

type NestedEntry = {
  kind: string;
  key?: string;
  fields?: ReadonlyArray<NestedEntry>;
  tabs?: ReadonlyArray<{ fields: ReadonlyArray<NestedEntry> }>;
  areas?: ReadonlyArray<{ fields: ReadonlyArray<NestedEntry> }>;
};

function flattenFields(entries: ReadonlyArray<NestedEntry>): RuntimeConfigFieldDefinition[] {
  return entries.flatMap(entry => {
    if (entry.fields) return flattenFields(entry.fields);
    if (entry.tabs) return entry.tabs.flatMap(tab => flattenFields(tab.fields));
    if (entry.areas) return entry.areas.flatMap(area => flattenFields(area.fields));
    return entry.key ? [entry as RuntimeConfigFieldDefinition] : [];
  });
}

describe('Abstract footer Tailwind fields', () => {
  const fields = flattenFields(ABSTRACT_FOOTER_PANEL.fields as ReadonlyArray<NestedEntry>);
  const field = (key: string) => fields.find(candidate => candidate.key === key);

  it('uses generated controls and complete resolved scales', () => {
    expect(field('sectionPaddingYClassName')).toMatchObject({ kind: 'select' });
    expect(field('sectionPaddingYClassName')?.options).toHaveLength(35);
    expect(field('pageTitleFontSizeClassName')?.options).toHaveLength(16);
    expect(field('pageTitleFontWeightClassName')?.options).toHaveLength(9);
    expect(field('pageLinkBorderWidthClassName')).toMatchObject({ kind: 'enum' });
    expect(field('topBorderWidthClassName')).toMatchObject({ kind: 'enum' });
    expect(field('topBorderWidthClassName')?.options).toHaveLength(5);
  });

  it('accepts newly resolved Tailwind tokens and rejects wrong-family values', () => {
    const normalized = normalizeAbstractFooterConfig({
      sectionPaddingYClassName: 'py-px',
      pageTitleFontSizeClassName: 'text-9xl',
      pageTitleFontWeightClassName: 'font-thin',
    });

    expect(normalized.sectionPaddingYClassName).toBe('py-px');
    expect(normalized.pageTitleFontSizeClassName).toBe('text-9xl');
    expect(normalized.pageTitleFontWeightClassName).toBe('font-thin');

    const invalid = normalizeAbstractFooterConfig({
      sectionPaddingYClassName: 'px-20',
      pageTitleFontSizeClassName: 'font-bold',
    } as unknown as Parameters<typeof normalizeAbstractFooterConfig>[0]);

    expect(invalid.sectionPaddingYClassName)
      .toBe(DEFAULT_ABSTRACT_FOOTER_CONFIG.sectionPaddingYClassName);
    expect(invalid.pageTitleFontSizeClassName)
      .toBe(DEFAULT_ABSTRACT_FOOTER_CONFIG.pageTitleFontSizeClassName);
  });
});

describe('Abstract Hero accordion item Tailwind fields', () => {
  const fields = flattenFields(ABSTRACT_HERO_ACCORDION_ITEM_PANEL.fields as ReadonlyArray<NestedEntry>);
  const field = (key: string) => fields.find(candidate => candidate.key === key);

  it('uses generated full token sets at each breakpoint', () => {
    for (const key of [
      'contentFontSizeClassName', 'contentFontSizeClassNameWide', 'contentFontSizeClassNameLg',
      'affordancePaddingX', 'affordancePaddingXWide', 'affordancePaddingXLg',
      'affordancePaddingY', 'affordancePaddingYWide', 'affordancePaddingYLg',
    ]) {
      expect(field(key)).toMatchObject({ kind: 'select' });
    }
    expect(field('contentFontSizeClassNameWide')?.options).toHaveLength(16);
    expect(field('affordancePaddingXWide')?.options).toHaveLength(35);
    expect(field('affordancePaddingYLg')?.options).toHaveLength(35);
  });

  it('normalizes each responsive utility against its own generated family', () => {
    const normalized = normalizeAboutMobileAccordionConfig({
      ...DEFAULT_ABSTRACT_HERO_ACCORDION_ITEM_CONFIG,
      contentFontSizeClassNameWide: 'md:text-9xl',
      affordancePaddingXWide: 'md:px-px',
      affordancePaddingYLg: 'lg:py-px',
    });
    expect(normalized.contentFontSizeClassNameWide).toBe('md:text-9xl');
    expect(normalized.affordancePaddingXWide).toBe('md:px-px');
    expect(normalized.affordancePaddingYLg).toBe('lg:py-px');

    const invalid = normalizeAboutMobileAccordionConfig({
      ...DEFAULT_ABSTRACT_HERO_ACCORDION_ITEM_CONFIG,
      contentFontSizeClassNameWide: 'text-9xl' as never,
      affordancePaddingXWide: 'md:py-8' as never,
    });
    expect(invalid.contentFontSizeClassNameWide)
      .toBe(DEFAULT_ABOUT_MOBILE_ACCORDION_CONFIG.contentFontSizeClassNameWide);
    expect(invalid.affordancePaddingXWide)
      .toBe(DEFAULT_ABOUT_MOBILE_ACCORDION_CONFIG.affordancePaddingXWide);
  });
});

describe('CoverFlow Timeline minimum left inset', () => {
  const fields = flattenFields(
    ABSTRACT_COVER_FLOW_TIMELINE_SLOT_PANEL.fields as ReadonlyArray<NestedEntry>,
  );
  const field = (key: string) => fields.find(candidate => candidate.key === key);

  it('uses the generated padding-left scale at every configured breakpoint', () => {
    for (const key of [
      'minLeftInsetClassName',
      'minLeftInsetClassNameMd',
      'minLeftInsetClassNameLg',
    ]) {
      expect(field(key)).toMatchObject({ kind: 'select' });
      expect(field(key)?.options).toHaveLength(35);
    }
  });

  it('normalizes each inset against the corresponding responsive token set', () => {
    const normalized = normalizeAbstractCoverFlowTimelineSlotConfig({
      minLeftInsetClassName: 'pl-4',
      minLeftInsetClassNameMd: 'md:pl-6',
      minLeftInsetClassNameLg: 'lg:pl-8',
    });
    expect(normalized.minLeftInsetClassName).toBe('pl-4');
    expect(normalized.minLeftInsetClassNameMd).toBe('md:pl-6');
    expect(normalized.minLeftInsetClassNameLg).toBe('lg:pl-8');

    const invalid = normalizeAbstractCoverFlowTimelineSlotConfig({
      minLeftInsetClassNameMd: 'pl-6' as never,
      minLeftInsetClassNameLg: 'lg:px-8' as never,
    });
    expect(invalid.minLeftInsetClassNameMd)
      .toBe(DEFAULT_ABSTRACT_COVER_FLOW_TIMELINE_SLOT_CONFIG.minLeftInsetClassNameMd);
    expect(invalid.minLeftInsetClassNameLg)
      .toBe(DEFAULT_ABSTRACT_COVER_FLOW_TIMELINE_SLOT_CONFIG.minLeftInsetClassNameLg);
  });

  it('keeps top-wordmark alignment opt-in and independently tiered', () => {
    const enabled = normalizeAbstractCoverFlowTimelineSlotConfig({
      alignToTopWordmarkMd: true,
    });
    expect(enabled.alignToTopWordmarkMd).toBe(true);
    expect(enabled.alignToTopWordmarkLg)
      .toBe(DEFAULT_ABSTRACT_COVER_FLOW_TIMELINE_SLOT_CONFIG.alignToTopWordmarkLg);
  });

  it('keeps background treatment independently bounded at every breakpoint', () => {
    const normalized = normalizeAbstractCoverFlowTimelineSlotConfig({
      backgroundOpacity: 0.4,
      backgroundOpacityMd: 0.6,
      backgroundOpacityLg: 0.8,
      backdropBlurPx: 6,
      backdropBlurPxMd: 12,
      backdropBlurPxLg: 18,
    });
    expect(normalized.backgroundOpacity).toBe(0.4);
    expect(normalized.backgroundOpacityMd).toBe(0.6);
    expect(normalized.backgroundOpacityLg).toBe(0.8);
    expect(normalized.backdropBlurPx).toBe(6);
    expect(normalized.backdropBlurPxMd).toBe(12);
    expect(normalized.backdropBlurPxLg).toBe(18);

    const bounded = normalizeAbstractCoverFlowTimelineSlotConfig({
      backgroundOpacityMd: -1,
      backdropBlurPxLg: 100,
    });
    expect(bounded.backgroundOpacityMd).toBe(0);
    expect(bounded.backdropBlurPxLg).toBe(64);
  });
});

describe('Polymorphic Layout shared capability propagation', () => {
  it('registers narrow-gradient glass defaults in every page-owned panel', () => {
    const expectedDefaults = {
      scrollGradientNarrowColumnGlassOpacityWide: 0,
      scrollGradientNarrowColumnGlassOpacityLg: 0,
      scrollGradientNarrowColumnBackdropBlurPxWide: 0,
      scrollGradientNarrowColumnBackdropBlurPxLg: 0,
    };

    for (const panel of [
      ABSTRACT_POLYMORPHIC_LAYOUT_PANEL,
      ABOUT_POLYMORPHIC_LAYOUT_PANEL,
      CONTACT_POLYMORPHIC_LAYOUT_PANEL,
      JOURNAL_POLYMORPHIC_LAYOUT_PANEL,
    ]) {
      expect(panel.defaultValue).toMatchObject(expectedDefaults);
    }
  });
});

describe('Card Appearance inverted gradient ink', () => {
  it('retains a bounded solid-surface opacity while the treatment is opt-in', () => {
    const normalized = normalizeCardAppearanceConfig({
      invertedGradientInkEnabled: true,
      invertedGradientInkBackgroundColor: '#ffffff',
      invertedGradientInkBackgroundOpacity: 2,
      invertedGradientInkActiveBorderEnabled: true,
      invertedGradientInkActiveBorderWidth: 'border-4',
      invertedGradientInkForegroundColor: '#2d2d2d',
      invertedGradientInkBlendMode: 'multiply',
    });
    expect(normalized.invertedGradientInkEnabled).toBe(true);
    expect(normalized.invertedGradientInkBackgroundColor).toBe('#ffffff');
    expect(normalized.invertedGradientInkBackgroundOpacity).toBe(1);
    expect(normalized.invertedGradientInkActiveBorderEnabled).toBe(true);
    expect(normalized.invertedGradientInkActiveBorderWidth).toBe('border-4');
    expect(normalized.invertedGradientInkForegroundColor).toBe('#2d2d2d');
    expect(normalized.invertedGradientInkBlendMode).toBe('multiply');
    expect(normalizeCardAppearanceConfig({}).invertedGradientInkEnabled).toBe(false);
  });
});
