import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { createConfigScopeBinding } from '../components/Panel/config';
import { applyComponentConfigUpdateToSource } from '../components/Panel/config/applyComponentConfigUpdate';
import { parseComponentConfigUpdatePayloads } from '../components/Panel/config/componentConfigUpdateParser';
import { serializeConfigScopeBindingDiff } from '../components/Panel/config/serialization';
import { applyPolymorphicLayoutAllSizesUpdate } from '../experiences/abstract/components/PolymorphicLayout.allSizes';
import { normalizePolymorphicLayoutConfig, type PolymorphicLayoutConfig } from '../experiences/abstract/components/PolymorphicLayout.config';
import { ABSTRACT_POLYMORPHIC_LAYOUT_CONFIG } from './abstract.config';
import { ABSTRACT_POLYMORPHIC_LAYOUT_PANEL } from './abstract.panel';
import { JOURNAL_POLYMORPHIC_LAYOUT_CONFIG } from './journal.config';
import { JOURNAL_POLYMORPHIC_LAYOUT_PANEL } from './journal.panel';

describe('Journal and Abstract Polymorphic Layout panel parity', () => {
  it('uses the identical shared field tree with independent page-owned update targets', () => {
    expect(JOURNAL_POLYMORPHIC_LAYOUT_PANEL.fields).toBe(ABSTRACT_POLYMORPHIC_LAYOUT_PANEL.fields);
    expect(JOURNAL_POLYMORPHIC_LAYOUT_PANEL.copy.targetFile).toBe('pages/journal.config.ts');
    expect(ABSTRACT_POLYMORPHIC_LAYOUT_PANEL.copy.targetFile).toBe('pages/abstract.config.ts');
    expect(JOURNAL_POLYMORPHIC_LAYOUT_PANEL.copy.targetSymbol).toBe('JOURNAL_POLYMORPHIC_LAYOUT_CONFIG');
  });

  it('keeps Journal header placement in editable defaults', () => {
    const config = normalizePolymorphicLayoutConfig(JOURNAL_POLYMORPHIC_LAYOUT_CONFIG);
    expect(config).toMatchObject({
      headerLeftSegmentAlignWide: 'md:justify-start',
      headerLeftSegmentAlignLg: 'lg:justify-start',
      headerLeftContentWidthWide: 'md:max-w-percent-100',
      headerLeftContentWidthLg: 'lg:max-w-percent-90',
      headerRightSegmentAlignWide: 'md:justify-end',
      headerRightSegmentAlignLg: 'lg:justify-end',
    });
  });

  it('keeps Abstract’s stacked mobile and tablet carousel padding at zero through editable defaults', () => {
    const config = normalizePolymorphicLayoutConfig(ABSTRACT_POLYMORPHIC_LAYOUT_CONFIG);
    expect(config).toMatchObject({
      wideColumnContentPaddingTop: 'pt-0', wideColumnContentPaddingTopWide: 'md:pt-0',
      wideColumnContentPaddingRight: 'pr-0', wideColumnContentPaddingRightWide: 'md:pr-0',
      wideColumnContentPaddingBottom: 'pb-0', wideColumnContentPaddingBottomWide: 'md:pb-0',
      wideColumnContentPaddingLeft: 'pl-0', wideColumnContentPaddingLeftWide: 'md:pl-0',
    });
  });

  it.each([
    [JOURNAL_POLYMORPHIC_LAYOUT_PANEL, JOURNAL_POLYMORPHIC_LAYOUT_CONFIG],
    [ABSTRACT_POLYMORPHIC_LAYOUT_PANEL, ABSTRACT_POLYMORPHIC_LAYOUT_CONFIG],
  ] as const)('writes a changed layout token to the page-owned config for %s', (panel, defaultValue) => {
    const binding = createConfigScopeBinding<PolymorphicLayoutConfig>({
      definition: panel,
      value: { ...defaultValue, wideColumnContentPaddingTop: 'pt-4' },
      onChange: () => {},
    });
    const payload = serializeConfigScopeBindingDiff(binding);
    expect(payload).toBeTruthy();
    const [parsed] = parseComponentConfigUpdatePayloads(payload!);
    expect(parsed.knownKeys).toContain('wideColumnContentPaddingTop');
    const source = readFileSync(panel.copy.targetFile, 'utf8');
    const result = applyComponentConfigUpdateToSource(source, parsed);
    expect(result.ok).toBe(true);
    expect(result.updatedSource).toContain("wideColumnContentPaddingTop: 'pt-4'");
  });

  it('cascades an All sizes alignment change to tablet and desktop, while later tier edits remain independent', () => {
    const initial = normalizePolymorphicLayoutConfig(JOURNAL_POLYMORPHIC_LAYOUT_CONFIG);
    const allSizes = applyPolymorphicLayoutAllSizesUpdate(initial, {
      ...initial,
      narrowColumnContentVerticalAlign: 'justify-center',
      wideColumnContentVerticalAlign: 'justify-end',
    });
    expect(allSizes).toMatchObject({
      narrowColumnContentVerticalAlignWide: 'md:justify-center',
      narrowColumnContentVerticalAlignLg: 'lg:justify-center',
      wideColumnContentVerticalAlignWide: 'md:justify-end',
      wideColumnContentVerticalAlignLg: 'lg:justify-end',
    });
    expect(applyPolymorphicLayoutAllSizesUpdate(allSizes, {
      ...allSizes, wideColumnContentVerticalAlignWide: 'md:justify-start',
    }).wideColumnContentVerticalAlignWide).toBe('md:justify-start');
  });
});
