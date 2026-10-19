import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { createConfigScopeBinding } from '../../../../components/Panel/config';
import { serializeConfigScopeBindingDiff, serializeConfigScopeBindingsDiff } from '../../../../components/Panel/config/serialization';
import { parseComponentConfigUpdatePayloads } from '../../../../components/Panel/config/componentConfigUpdateParser';
import { applyComponentConfigUpdateToSource } from '../../../../components/Panel/config/applyComponentConfigUpdate';
import { QUOTE_PANEL } from './Quote.panel';
import { createEditorialQuotePanel } from './EditorialQuote.panel';
import { DEFAULT_QUOTE_CONFIG } from './config';
import { DEFAULT_EDITORIAL_QUOTE_CONFIGS, normalizeEditorialQuoteConfig, type EditorialVariant } from './editorialConfig';

describe('Quote Lab UPDATE DIFF targets', () => {
  it('can apply a core Quote field edit to the base and every editorial preset', () => {
    const bindings = [
      createConfigScopeBinding({ definition: QUOTE_PANEL,
        value: { ...DEFAULT_QUOTE_CONFIG, gradientInkTextColor: '#123456' }, onChange: () => {} }),
      ...(['featured', 'plain', 'solid'] as EditorialVariant[]).map(variant =>
        createConfigScopeBinding({ definition: createEditorialQuotePanel(variant),
          value: { ...DEFAULT_EDITORIAL_QUOTE_CONFIGS[variant], gradientInkTextColor: '#123456' }, onChange: () => {} })),
    ];
    for (const binding of bindings) {
      const serialized = serializeConfigScopeBindingDiff(binding);
      expect(serialized).not.toBeNull();
      const [payload] = parseComponentConfigUpdatePayloads(serialized!);
      const source = readFileSync(payload.targetFile, 'utf8');
      const result = applyComponentConfigUpdateToSource(source, payload);
      expect(result.ok, `${binding.definition.id}: ${result.error}`).toBe(true);
      expect(result.updatedSource).toContain("gradientInkTextColor: '#123456'");
    }
  });

  it('applies surface changes for all variants without writing derived flags', () => {
    const modes = { featured: 'solid', plain: 'gradient', solid: 'palette', practice: 'solid' } as const;
    const bindings = (Object.keys(modes) as EditorialVariant[]).map(variant => {
      const definition = createEditorialQuotePanel(variant);
      const value = normalizeEditorialQuoteConfig({
        ...DEFAULT_EDITORIAL_QUOTE_CONFIGS[variant], backgroundMode: modes[variant],
      }, variant);
      return createConfigScopeBinding({ definition, value, onChange: () => {} });
    });
    const payloads = parseComponentConfigUpdatePayloads(serializeConfigScopeBindingsDiff(bindings));
    expect(payloads).toHaveLength(4);
    for (const payload of payloads) {
      expect(payload.config).toHaveProperty('backgroundMode');
      expect(payload.config).not.toHaveProperty('gradientInkEnabled');
      expect(payload.config).not.toHaveProperty('paletteBackgroundEnabled');
      const source = readFileSync(payload.targetFile, 'utf8');
      const result = applyComponentConfigUpdateToSource(source, payload);
      expect(result.ok, `${payload.targetSymbol}: ${result.error}`).toBe(true);
      expect(result.changedKeys).toEqual(['backgroundMode']);
    }
  });
});
