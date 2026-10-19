import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { z } from 'zod';
import type { PracticesSectionContent } from '../experiences/abstract/components/PracticesSection';

const DEFAULT_PRACTICES_CONTENT_PATH = 'content/practices.md';

// Every copy field is optional (empty allowed) -- PracticesSection hides any
// empty text entirely, so omitting a key from the frontmatter and writing it
// as `''` are equivalent. `practices` keeps a hard length of 4 (the grid's
// own column-count math assumes a fixed roster, see PracticesSection.config's
// maxColumnCount) and each item's title/description stay required, since a
// half-authored grid card has no sensible "hidden" rendering.
const copy = z.string().trim().default('');
const requiredCopy = z.string().trim().min(1);
const href = z.string().regex(/^(?:\/|https?:\/\/)/u, 'Use a site path or an absolute HTTP URL');

// The bottom banner's own editorial quote shares this exact visual space
// (PracticesSection renders as its `children`) -- its text, source heading,
// destination and aria-label used to be split between a bottomBannerConfig.ts
// default (text), content/wall.md (a now-dead fallback for that same text),
// and hardcoded literals in pages/wall.tsx (title/destination/ariaLabel).
// All genuine copy, so all four now live here instead. Required (not
// hide-when-empty like the fields below): this is the page's main editorial
// quote, not an optional decorative line -- an empty quote block would read
// as broken, not minimal.
const bottomBannerQuoteSchema = z.object({
  text: requiredCopy,
  /** Overrides the quote's own displayed source heading (EditorialQuoteConfig
   * .sourceHeadingText) -- the visible "Product, digital experience,
   * engineering & applied AI" line above the quote text. Was a
   * bottomBannerConfig.ts style-config default; it's copy, not styling. */
  sourceHeading: requiredCopy,
  title: requiredCopy,
  destination: href,
  ariaLabel: requiredCopy,
}).strict();

export const practicesContentSchema = z.object({
  schemaVersion: z.literal(1),
  locale: z.literal('en'),
  quote: bottomBannerQuoteSchema,
  eyebrow: copy,
  heading: copy,
  introduction: copy,
  subtext: copy,
  practices: z.array(z.object({
    title: z.string().trim().min(1),
    description: z.string().trim().min(1),
  }).strict()).length(4),
  delivery: z.object({ heading: copy, text: copy }).strict(),
  industry: z.object({ label: copy, title: copy, text: copy }).strict(),
  cta: z.object({ label: copy, href }).strict(),
}).strict();

export type PracticesContentSource = z.infer<typeof practicesContentSchema>;
export type BottomBannerQuoteContent = z.infer<typeof bottomBannerQuoteSchema>;
export type WallBannerContent = PracticesSectionContent & { quote: BottomBannerQuoteContent };

export function loadPracticesContent(filePath = DEFAULT_PRACTICES_CONTENT_PATH): WallBannerContent {
  const source = fs.readFileSync(path.join(process.cwd(), filePath), 'utf8');
  const { schemaVersion: _schemaVersion, locale: _locale, ...content } = practicesContentSchema.parse(matter(source).data);
  return content satisfies WallBannerContent;
}
