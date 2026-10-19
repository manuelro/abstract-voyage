import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { z } from 'zod';
import type { SliderContentSlide } from './postContent';
import { getThoughts } from './thoughtContent';
import type { AboutPageContent } from './content/pageContent.schema';
import { buildWallQuoteItems } from '../pages/wallQuoteModel';
import { buildWallFeed, type WallFeedEntry } from './wallFeedModel';
import { loadPracticesContent } from './practicesContent.server';

const visibleText = z.string().trim().min(1);
const href = z.string().regex(/^(?:\/|https?:\/\/)/u, 'Use a site path or an absolute HTTP URL');
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/u, 'Use YYYY-MM-DD');
const shared = { ref: visibleText, title: visibleText, text: visibleText, href };
const featuredQuoteSchema = z.object({
  ref: z.literal('the-next-change'),
  title: visibleText,
  introTitle: visibleText,
  introText: visibleText,
  sourceHref: href,
  cta: z.object({ label: visibleText, target: z.literal('#practices-heading') }).strict(),
}).strict();
const statementSchema = z.object({
  kind: z.literal('statement'), ref: visibleText,
  presentation: z.enum(['featured', 'plain', 'solid']), link: z.boolean(),
  linkLabel: visibleText.optional(), contentRef: z.literal('wall-featured-quote').optional(),
  title: visibleText.optional(), text: visibleText.optional(), href: href.optional(),
}).strict();
const manifestSchema = z.object({
  layout: z.object({ maxColumnWidthPx: z.number().int().min(280).max(800) }).strict(),
  entries: z.array(z.discriminatedUnion('kind', [
    z.object({ ...shared, kind: z.literal('article'), date, keywords: z.array(visibleText).min(1) }).strict(),
    z.object({ ...shared, kind: z.literal('quotation'), period: visibleText.optional(),
      presentation: z.enum(['featured', 'plain', 'solid']), link: z.boolean(), linkLabel: visibleText.optional() }).strict(),
    statementSchema,
    z.object({ ...shared, kind: z.literal('thought'), date }).strict(),
  ])).min(1),
}).strict();

export function loadWallContent(articles: SliderContentSlide[], about: AboutPageContent) {
  const source = fs.readFileSync(path.join(process.cwd(), 'content/wall.md'), 'utf8');
  const manifest = manifestSchema.parse(matter(source).data);
  const practices = loadPracticesContent();
  const entries: WallFeedEntry[] = manifest.entries.map(entry => {
    if (entry.kind !== 'statement') return entry;
    if (entry.contentRef) {
      if (entry.ref !== 'the-next-change' || entry.presentation !== 'featured' || entry.title || entry.text || entry.href) {
        throw new Error('The featured wall statement must use only its contentRef for copy.');
      }
      // The reference is a literal allowlist member, never a user-supplied path.
      const featuredSource = fs.readFileSync(path.join(process.cwd(), 'content/wall-featured-quote.md'), 'utf8');
      const parsed = matter(featuredSource);
      const featured = featuredQuoteSchema.parse(parsed.data);
      const text = parsed.content.replace(/\s+/gu, ' ').trim();
      if (!text || /(?:\n\s*\n|^\s*#)/u.test(parsed.content)) {
        throw new Error('The featured wall quote must be one nonempty Markdown paragraph.');
      }
      if (featured.ref !== entry.ref) {
        throw new Error('The featured wall quote reference does not match its manifest entry.');
      }
      return {
        kind: 'statement', ref: entry.ref, presentation: entry.presentation, link: entry.link,
        title: featured.title, text, href: featured.sourceHref,
        featuredContent: {
          introTitle: featured.introTitle,
          introText: featured.introText,
          cta: featured.cta,
        },
      };
    }
    if (!entry.title || !entry.text || !entry.href) {
      throw new Error(`Wall statement ${entry.ref} requires title, text, and href.`);
    }
    return { ...entry, title: entry.title, text: entry.text, href: entry.href };
  });
  return {
    wallFeed: buildWallFeed(entries, articles, buildWallQuoteItems(about.timeline), getThoughts()),
    maxColumnWidthPx: manifest.layout.maxColumnWidthPx,
    practices,
  };
}

export function loadWallFeed(articles: SliderContentSlide[], about: AboutPageContent) {
  return loadWallContent(articles, about).wallFeed;
}
