import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { load as loadYaml } from 'js-yaml';

import {
  abstractSourceSchema,
  aboutSourceSchema,
  contactSourceSchema,
  siteContentSchema,
  type AbstractPageContent,
  type AboutPageContent,
  type ContactPageContent,
  type SiteContent,
} from './pageContent.schema';
import { parseContentSections } from './pageContent.sections';

const pagesDirectory = path.join(process.cwd(), 'content', 'pages');
const read = (name: string) => fs.readFileSync(path.join(pagesDirectory, name), 'utf8');

export function loadSiteContent(): SiteContent {
  return siteContentSchema.parse(loadYaml(read('site.yml')));
}

export function loadAbstractPageContent(): AbstractPageContent {
  const source = matter(read('abstract.md'));
  const parsed = abstractSourceSchema.parse(source.data);
  const sections = parseContentSections(source.content, 'content/pages/abstract.md');
  if (Object.keys(sections).length !== 1 || !sections['hero-body']) throw new Error('content/pages/abstract.md: expected only block:hero-body.');
  return { ...parsed, hero: { ...parsed.hero, body: [sections['hero-body']] } };
}

export function loadAboutPageContent(): AboutPageContent {
  const source = matter(read('about.md'));
  const parsed = aboutSourceSchema.parse(source.data);
  const sections = parseContentSections(source.content, 'content/pages/about.md');
  const expected = new Set(parsed.timeline.map(row => row.id));
  const received = Object.keys(sections);
  if (received.length !== expected.size || received.some(id => !expected.has(id))) throw new Error('content/pages/about.md: sections must match timeline ids exactly.');
  return { ...parsed, timeline: parsed.timeline.map(row => ({ ...row, body: sections[row.id] })) };
}

export function loadContactPageContent(): ContactPageContent {
  const source = matter(read('contact.md'));
  if (source.content.trim()) throw new Error('content/pages/contact.md: contact copy belongs in frontmatter.');
  return contactSourceSchema.parse(source.data);
}
