import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { createConfigScopeBinding } from '../components/Panel/config';
import { applyComponentConfigUpdateToSource } from '../components/Panel/config/applyComponentConfigUpdate';
import { parseComponentConfigUpdatePayloads } from '../components/Panel/config/componentConfigUpdateParser';
import { serializeConfigScopeBindingDiff } from '../components/Panel/config/serialization';
import { EDITORIAL_ACCORDION_ITEM_FIELDS } from '../experiences/about/components/EditorialAccordionItem.panel';
import type { AboutMobileAccordionConfig } from '../experiences/about/components/AboutMobileAccordion.config';
import { ABSTRACT_HERO_ACCORDION_ITEM_PANEL } from './abstract.panel';
import { DEFAULT_JOURNAL_INTRO_ACCORDION_ITEM_CONFIG, DEFAULT_JOURNAL_TIMELINE_CONFIG, normalizeJournalTimelineConfig } from './journal.config';
import { JOURNAL_INTRO_ACCORDION_ITEM_PANEL, JOURNAL_TIMELINE_PANEL } from './journal.panel';

describe('Journal editorial accordion item', () => {
  it('uses the same generated fields as Abstract with a separate writable scope', () => {
    expect(JOURNAL_INTRO_ACCORDION_ITEM_PANEL.fields).toBe(EDITORIAL_ACCORDION_ITEM_FIELDS);
    expect(ABSTRACT_HERO_ACCORDION_ITEM_PANEL.fields).toBe(EDITORIAL_ACCORDION_ITEM_FIELDS);
    expect(JOURNAL_INTRO_ACCORDION_ITEM_PANEL.copy.targetSymbol)
      .not.toBe(ABSTRACT_HERO_ACCORDION_ITEM_PANEL.copy.targetSymbol);
  });

  it('persists a changed token even though the page default inherits a shared preset', () => {
    const binding = createConfigScopeBinding<AboutMobileAccordionConfig>({
      definition: JOURNAL_INTRO_ACCORDION_ITEM_PANEL,
      value: { ...DEFAULT_JOURNAL_INTRO_ACCORDION_ITEM_CONFIG, contentFontSizeClassName: 'text-xl' },
      onChange: vi.fn(),
    });
    const payload = serializeConfigScopeBindingDiff(binding);
    expect(payload).toBeTruthy();
    const [parsed] = parseComponentConfigUpdatePayloads(payload!);
    expect(parsed.knownKeys).toContain('contentFontSizeClassName');
    const source = readFileSync('pages/journal.config.ts', 'utf8');
    const result = applyComponentConfigUpdateToSource(source, parsed);
    expect(result.ok).toBe(true);
    expect(result.updatedSource).toContain("contentFontSizeClassName: 'text-xl'");
  });

  it('defaults article item typography to /about\'s own accordion content and exposes an intro-following alternative', () => {
    // Operator ask (2026-10-01): articles must look like /about's own
    // tablet accordion content specifically, not follow the narrow-column
    // intro's independent EditorialAccordionItem preset — so 'custom' (with
    // DEFAULT_ABOUT_MOBILE_ACCORDION_CONFIG-matching values) is now the
    // default; 'intro' remains a selectable, fully-supported alternative
    // for an operator who wants the two columns to echo each other again.
    expect(DEFAULT_JOURNAL_TIMELINE_CONFIG.accordionTextStyleSource).toBe('custom');
    const panel = JSON.stringify(JOURNAL_TIMELINE_PANEL.fields);
    for (const key of [
      'accordionTextStyleSource',
      'accordionTitleFontWeight', 'accordionTitleFontWeightWide', 'accordionTitleFontWeightLg',
      'accordionTitleOpacity', 'accordionDescriptionOpacity',
      'accordionTitleLineHeight', 'accordionDescriptionLineHeight',
    ]) expect(panel).toContain(key);
    // Font size and description top-spacing are deliberately NOT part of
    // this panel anymore (bug fix, operator-reported 2026-10-01) — they
    // used to shadow the "Article item" panel's own contentFontSizeClassName*/
    // itemContentPaddingTop* at every breakpoint, making that panel's knobs
    // appear disconnected. 'custom' mode now falls through to
    // articleAccordionItemConfig for those instead of duplicating them here.
    for (const key of [
      'accordionTitleFontSize', 'accordionDescriptionFontSize',
      'accordionTitleFontSizeWide', 'accordionDescriptionFontSizeWide',
      'accordionTitleFontSizeLg', 'accordionDescriptionFontSizeLg',
      'accordionDescriptionPaddingTop', 'accordionDescriptionPaddingTopWide', 'accordionDescriptionPaddingTopLg',
    ]) expect(panel).not.toContain(key);

    const normalized = normalizeJournalTimelineConfig({
      ...DEFAULT_JOURNAL_TIMELINE_CONFIG,
      accordionTextStyleSource: 'custom',
      accordionTitleFontWeightWide: 'md:font-bold',
      accordionTitleOpacity: 1.5,
      accordionDescriptionOpacity: -0.5,
      accordionTitleLineHeight: 3,
      accordionDescriptionLineHeight: 0.5,
    });
    expect(normalized).toMatchObject({
      accordionTextStyleSource: 'custom', accordionTitleOpacity: 1,
      accordionDescriptionOpacity: 0, accordionTitleLineHeight: 2.5,
      accordionDescriptionLineHeight: 1,
      accordionTitleFontWeightWide: 'md:font-bold',
    });
    const invalidTokens = normalizeJournalTimelineConfig({
      accordionTitleFontWeightWide: 'font-bold' as never,
    });
    expect(invalidTokens.accordionTitleFontWeightWide).toBe(DEFAULT_JOURNAL_TIMELINE_CONFIG.accordionTitleFontWeightWide);
  });
});
