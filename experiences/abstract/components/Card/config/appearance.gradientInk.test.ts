import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createConfigScopeBinding } from '../../../../../components/Panel/config/binding';
import { serializeConfigScopeBindingDiff } from '../../../../../components/Panel/config/serialization';
import { parseComponentConfigUpdatePayloads } from '../../../../../components/Panel/config/componentConfigUpdateParser';
import { applyComponentConfigUpdateToSource } from '../../../../../components/Panel/config/applyComponentConfigUpdate';
import { CARD_APPEARANCE_PANEL } from './appearance.panel';
import {
  DEFAULT_CARD_APPEARANCE_CONFIG,
  normalizeCardAppearanceConfig,
  resolveCardGradientInkTreatment,
} from './appearance';

describe('Card shared gradient ink treatment', () => {
  it('uses one normalized treatment across independently enabled tiers', () => {
    const config = normalizeCardAppearanceConfig({
      ...DEFAULT_CARD_APPEARANCE_CONFIG,
      invertedGradientInkEnabled: true,
      invertedGradientInkEnabledMd: false,
      invertedGradientInkEnabledLg: true,
      invertedGradientInkBackgroundOpacity: 0.35,
      invertedGradientInkBlendMode: 'multiply',
    });
    expect(resolveCardGradientInkTreatment(config, 'mobile')).toMatchObject({
      backgroundOpacity: 0.35,
      blendMode: 'multiply',
    });
    expect(resolveCardGradientInkTreatment(config, 'md')).toBeUndefined();
    expect(resolveCardGradientInkTreatment(config, 'lg')).toMatchObject({
      backgroundOpacity: 0.35,
      blendMode: 'multiply',
    });
    expect(resolveCardGradientInkTreatment({
      ...config,
      invertedGradientInkBackgroundOpacity: 0,
    }, 'mobile')).toBeUndefined();
  });

  it('carries a shared ink control through the registered diff payload and AST updater', () => {
    const binding = createConfigScopeBinding({
      definition: CARD_APPEARANCE_PANEL,
      value: { ...DEFAULT_CARD_APPEARANCE_CONFIG, invertedGradientInkBackgroundOpacity: 0.5 },
      onChange: () => {},
    });
    const text = serializeConfigScopeBindingDiff(binding);
    expect(text).toContain('known_keys:');
    expect(text).toContain('invertedGradientInkBackgroundOpacity: 0.5');
    const [payload] = parseComponentConfigUpdatePayloads(text!);
    expect(payload.targetFile).toBe('experiences/abstract/components/Card/config/appearance.ts');
    const source = readFileSync(join(process.cwd(), payload.targetFile), 'utf8');
    const updated = applyComponentConfigUpdateToSource(source, payload);
    expect(updated.ok).toBe(true);
    expect(updated.updatedSource).toContain('invertedGradientInkBackgroundOpacity: 0.5,');
  });
});
