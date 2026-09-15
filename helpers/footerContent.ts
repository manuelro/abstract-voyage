import fs from 'node:fs';
import path from 'node:path';
import { load as loadYaml } from 'js-yaml';
import { z } from 'zod';

import {
  DEFAULT_ABSTRACT_FOOTER_CONFIG,
  type AbstractFooterConfig,
} from '../pages/abstract.config';

const footerLinkSchema = z.object({
  enabled: z.boolean(),
  title: z.string().trim().min(1),
  description: z.string(),
});

const footerContentSchema = z.object({
  navigationLabel: z.string().trim().min(1),
  contactEmailEnabled: z.boolean(),
  contactText: z.union([z.literal(''), z.email()]),
  links: z.object({
    abstract: footerLinkSchema,
    about: footerLinkSchema,
    journal: footerLinkSchema,
    contact: footerLinkSchema,
  }),
});

export type FooterContent = z.infer<typeof footerContentSchema>;
export type FooterConfigOverrides = Pick<AbstractFooterConfig,
  | 'navigationLabel'
  | 'contactEmailEnabled'
  | 'contactText'
  | 'abstractEnabled'
  | 'abstractTitle'
  | 'abstractDescription'
  | 'aboutEnabled'
  | 'aboutTitle'
  | 'aboutDescription'
  | 'journalEnabled'
  | 'journalTitle'
  | 'journalDescription'
  | 'contactEnabled'
  | 'contactTitle'
  | 'contactDescription'
>;

export const DEFAULT_FOOTER_CONTENT: FooterContent = {
  navigationLabel: DEFAULT_ABSTRACT_FOOTER_CONFIG.navigationLabel,
  contactEmailEnabled: DEFAULT_ABSTRACT_FOOTER_CONFIG.contactEmailEnabled,
  contactText: DEFAULT_ABSTRACT_FOOTER_CONFIG.contactText,
  links: {
    abstract: {
      enabled: DEFAULT_ABSTRACT_FOOTER_CONFIG.abstractEnabled,
      title: DEFAULT_ABSTRACT_FOOTER_CONFIG.abstractTitle,
      description: DEFAULT_ABSTRACT_FOOTER_CONFIG.abstractDescription,
    },
    about: {
      enabled: DEFAULT_ABSTRACT_FOOTER_CONFIG.aboutEnabled,
      title: DEFAULT_ABSTRACT_FOOTER_CONFIG.aboutTitle,
      description: DEFAULT_ABSTRACT_FOOTER_CONFIG.aboutDescription,
    },
    journal: {
      enabled: DEFAULT_ABSTRACT_FOOTER_CONFIG.journalEnabled,
      title: DEFAULT_ABSTRACT_FOOTER_CONFIG.journalTitle,
      description: DEFAULT_ABSTRACT_FOOTER_CONFIG.journalDescription,
    },
    contact: {
      enabled: DEFAULT_ABSTRACT_FOOTER_CONFIG.contactEnabled,
      title: DEFAULT_ABSTRACT_FOOTER_CONFIG.contactTitle,
      description: DEFAULT_ABSTRACT_FOOTER_CONFIG.contactDescription,
    },
  },
};

export function parseFooterContent(value: unknown): FooterContent {
  return footerContentSchema.parse(value);
}

export function toFooterConfigOverrides(content: FooterContent): FooterConfigOverrides {
  return {
    navigationLabel: content.navigationLabel,
    contactEmailEnabled: content.contactEmailEnabled,
    contactText: content.contactText,
    abstractEnabled: content.links.abstract.enabled,
    abstractTitle: content.links.abstract.title,
    abstractDescription: content.links.abstract.description,
    aboutEnabled: content.links.about.enabled,
    aboutTitle: content.links.about.title,
    aboutDescription: content.links.about.description,
    journalEnabled: content.links.journal.enabled,
    journalTitle: content.links.journal.title,
    journalDescription: content.links.journal.description,
    contactEnabled: content.links.contact.enabled,
    contactTitle: content.links.contact.title,
    contactDescription: content.links.contact.description,
  };
}

export function loadFooterConfigOverrides(
  filePath = path.join(process.cwd(), 'content', 'settings', 'footer.yml'),
): FooterConfigOverrides {
  try {
    const source = fs.readFileSync(filePath, 'utf8');
    return toFooterConfigOverrides(parseFooterContent(loadYaml(source)));
  } catch (error) {
    if (process.env.NODE_ENV !== 'test') {
      console.warn(`Unable to load footer content from ${filePath}; using defaults.`, error);
    }
    return toFooterConfigOverrides(DEFAULT_FOOTER_CONTENT);
  }
}
