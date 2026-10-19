import { PLAIN_EDITORIAL_QUOTE_CONFIG, normalizeEditorialQuoteConfig, type EditorialQuoteConfig } from './editorialConfig';
import type { EditorialQuoteSource } from './EditorialQuote';

/**
 * The "voice" quote: the editorial identity statement that used to live inside
 * the closing banner (the page hero's headline + body), extracted into its own
 * quote placed between the wall and the bottom banner. Same standalone pattern
 * as bottomBannerConfig.ts -- an EditorialQuoteConfig with its own default and a
 * shared panel/store -- rendered through the base `plain` editorial treatment.
 */
export type VoiceQuoteConfig = EditorialQuoteConfig;

export const DEFAULT_VOICE_QUOTE_CONFIG: VoiceQuoteConfig = {
  ...PLAIN_EDITORIAL_QUOTE_CONFIG,
  headingEnabled: true,
  // The headline reads as the lead, so it carries its own prominent size and
  // normal-case (differing from the plain preset, so these win over the shared
  // heading appearance -- see EditorialQuote's headingSize/headingTransform).
  sourceHeadingText: 'Abstract Voyage is where I think out loud.',
  sourceHeadingFontSize: 'text-2xl',
  sourceHeadingTracking: 'tracking-tight',
  sourceHeadingTextTransform: 'normal-case',
  sourceHeadingOpacityPercent: 100,
  sourceHeadingContentGap: 'mb-5',
  headingPlacement: 'inside-top',
  headingAlign: 'start',
  linkEnabled: true,
  linkLabel: 'How that became my work',
  linkPlacement: 'inside-bottom',
  linkAlign: 'start',
  topRuleEnabled: false,
  backgroundMode: 'none',
  solidTextColor: '#31516f',
  textAlign: 'start',
  textOpacityPercent: 80,

  parentQuoteText: 'Abstract Voyage is where I follow the questions behind that work.',
};

// The content itself (what the quote says), separate from its appearance. Mirrors
// the page hero it was extracted from: hero.heading -> source heading,
// hero-body -> text + the "How that became my work" link to /about.
export const VOICE_QUOTE_SOURCE: EditorialQuoteSource = {
  key: 'wall-voice',
  title: 'Abstract Voyage is where I think out loud.',
  period: '',
  destination: '/about',
  text: 'I’m Manuel Cerdas. I build software, lead teams, and work on how people make sense of what we build. Abstract Voyage is where I follow the questions behind that work. It began with light and sound.',
  ariaLabel: 'Abstract Voyage',
};

export function normalizeVoiceQuoteConfig(value?: Partial<VoiceQuoteConfig>): VoiceQuoteConfig {
  return normalizeEditorialQuoteConfig({ ...DEFAULT_VOICE_QUOTE_CONFIG, ...value }, 'plain');
}
