import { defineConfigScope } from '../../../../components/Panel/config';
import { createEditorialQuotePanel } from './EditorialQuote.panel';
import { DEFAULT_VOICE_QUOTE_CONFIG, type VoiceQuoteConfig } from './voiceQuoteConfig';

// Reuses the plain editorial quote's fields, same as BottomBannerQuote.panel.ts
// reuses featured. One shared scope: edited in quote-lab or on the wall, both
// update together through voiceQuoteLiveDesign.
const editorialPanel = createEditorialQuotePanel('plain');
const plainFields = editorialPanel.fields;

export const VOICE_QUOTE_PANEL = defineConfigScope<VoiceQuoteConfig>({
  id: 'Quote/voice',
  component: 'EditorialQuote',
  scope: 'appearance',
  title: 'Voice quote',
  createdAt: '2026-10-16',
  defaultOpen: false,
  summary: 'The editorial “think out loud” statement above the closing banner',
  defaultValue: DEFAULT_VOICE_QUOTE_CONFIG,
  hiddenKeys: editorialPanel.hiddenKeys,
  copy: {
    targetFile: 'experiences/abstract/components/Quote/voiceQuoteConfig.ts',
    targetSymbol: 'DEFAULT_VOICE_QUOTE_CONFIG',
    targetType: 'VoiceQuoteConfig',
    updateStrategy: 'replace_scope',
    completeScope: true,
  },
  fields: [...plainFields],
});
