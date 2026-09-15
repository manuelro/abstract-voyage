import { describe, expect, it } from 'vitest';
import { load as loadYaml } from 'js-yaml';

import {
  DEFAULT_FOOTER_CONTENT,
  loadFooterConfigOverrides,
  parseFooterContent,
  toFooterConfigOverrides,
} from './footerContent';

describe('footer content', () => {
  it('maps the structured content shape to SiteFooter config keys', () => {
    const overrides = toFooterConfigOverrides(DEFAULT_FOOTER_CONTENT);

    expect(overrides.aboutTitle).toBe('About');
    expect(overrides.journalEnabled).toBe(true);
    expect(overrides.abstractEnabled).toBe(false);
    expect(overrides.contactText).toBe('reach@abstract.voyage');
  });

  it('rejects invalid contact email values', () => {
    expect(() => parseFooterContent({
      ...DEFAULT_FOOTER_CONTENT,
      contactText: 'not-an-email',
    })).toThrow();
  });

  it('loads the checked-in YAML content', () => {
    const overrides = loadFooterConfigOverrides();
    expect(overrides.navigationLabel).toBe('Footer navigation');
  });

  it('accepts an empty contact value when the contact line is disabled', () => {
    const parsed = parseFooterContent(loadYaml(`
navigationLabel: Footer
contactEmailEnabled: false
contactText: ''
links:
  abstract: { enabled: false, title: Abstract, description: '' }
  about: { enabled: true, title: About, description: About page }
  journal: { enabled: true, title: Journal, description: Journal page }
  contact: { enabled: true, title: Contact, description: Contact page }
`));

    expect(parsed.contactText).toBe('');
  });
});
