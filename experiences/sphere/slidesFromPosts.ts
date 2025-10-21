// experiences/sphere/slidesFromPosts.ts
// Build-time loader for carousel slides sourced from /posts Markdown.
// Standard: metadata-first (title/description/date/tags from frontmatter).
// Fallbacks: body lines, filename date. Accept description aliases
// and tolerate the common typo "desciption" with a build-time warning.

import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { formatAbsolute, toISODateString } from '../../helpers/date';

export type SlideMeta = {
  slug: string;
  title: string;
  description: string;
  date: string | null;          // ISO YYYY-MM-DD
  formattedDate: string | null; // e.g., "Oct 14, 2025"
  tags: string[];
  cover: string | null;         // JSON-safe (never undefined)
};

const POSTS_DIR = path.join(process.cwd(), 'posts');

function firstNonEmptyLines(body: string, n: number): string[] {
  const out: string[] = [];
  for (const raw of body.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    out.push(line);
    if (out.length >= n) break;
  }
  return out;
}

/** Extract date (if present) and ONLY explicit hashtag tags from a line. */
function extractDateAndTags(line: string): { date: Date | null; tags: string[] } {
  // Try ISO first
  const iso = line.match(/\b(\d{4}-\d{2}-\d{2})\b/);

  let date: Date | null = null;
  let rest = line;

  if (iso && iso[1]) {
    date = new Date(iso[1]);
    rest = (line.slice(0, iso.index) + ' ' + line.slice((iso.index ?? 0) + iso[0].length)).trim();
  } else {
    // Common textual: "Oct 14, 2025" or "14 Oct 2025"
    const textual = line.match(/\b(?:\d{1,2}\s+\w{3,9}\s+\d{4}|\w{3,9}\s+\d{1,2},\s*\d{4})\b/);
    if (textual) {
      const d = new Date(textual[0]);
      if (!isNaN(d.getTime())) {
        date = d;
        rest = (line.slice(0, textual.index) + ' ' + line.slice((textual.index ?? 0) + textual[0].length)).trim();
      }
    }
  }

  // NEW: Only treat explicit hashtags as tags (prevents entire sentences becoming tags)
  const tagMatches = [...rest.matchAll(/#([A-Za-z0-9][\w-]*)/g)];
  const tags = tagMatches.map(m => m[1]);

  return { date, tags };
}

function filenameDateFallback(fileName: string): Date | null {
  // Pattern: 2016-12-24_medium-foo.md  → "2016-12-24"
  const stem = fileName.replace(/\.(md|mdx)$/i, '');
  const maybe = stem.split('_')[0];
  if (/^\d{4}-\d{2}-\d{2}$/.test(maybe)) {
    const d = new Date(maybe);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function ensureISO(d: Date | null): string | null {
  return d ? toISODateString(d) : null;
}

function pickFirstString(obj: any, keys: string[]): { value: string; key: string | null } {
  for (const k of keys) {
    const v = obj?.[k];
    if (typeof v === 'string' && v.trim()) return { value: v.trim(), key: k };
  }
  return { value: '', key: null };
}

export function loadSlidesFromPosts(dir = POSTS_DIR): SlideMeta[] {
  if (!fs.existsSync(dir)) return [];
  const files = fs.readdirSync(dir).filter(f => /\.(md|mdx)$/i.test(f));

  const items: SlideMeta[] = files.map((file) => {
    const slug = file.replace(/\.(md|mdx)$/i, '');
    const raw = fs.readFileSync(path.join(dir, file), 'utf8');
    const { data: fm, content } = matter(raw);

    const [l1, l2, l3] = firstNonEmptyLines(content, 3);

    // ----- Title (metadata-first, fallback to first body line) -----
    const fmTitle = typeof fm.title === 'string' ? fm.title.trim() : '';
    const title = (fmTitle || (l1 ?? '')).trim() || 'Untitled';

    // ----- Description (metadata-first with aliases, typo tolerant) -----
    const { value: fmDescription, key: descKey } = pickFirstString(
      fm,
      ['description', 'desc', 'summary', 'excerpt', 'desciption'] // last is common typo
    );
    if (descKey === 'desciption') {
      console.warn(`[slidesFromPosts] Non-standard description key "desciption" in ${file}. Prefer "description".`);
    }
    const description = (fmDescription || (l2 ?? '')).trim();

    // ----- Date: prefer frontmatter, then body, then filename -----
    let parsedDate: Date | null = null;
    if (fm.date) {
      const d = new Date(fm.date as any);
      if (!isNaN(d.getTime())) parsedDate = d;
    }
    if (!parsedDate && l3) {
      const r = extractDateAndTags(l3);
      if (r.date) parsedDate = r.date;
    }
    if (!parsedDate) {
      parsedDate = filenameDateFallback(file);
    }

    // ----- Tags/Categories: prefer frontmatter; only fall back to body hashtags if missing -----
    const fmTags = Array.isArray(fm.tags) ? fm.tags.map(x => String(x)) : [];
    const fmCategories = Array.isArray(fm.categories) ? fm.categories.map(x => String(x)) : [];
    const fmCats = Array.isArray((fm as any).category) ? (fm as any).category.map((x: any) => String(x)) : [];
    let tags: string[] = Array.from(new Set([...fmTags, ...fmCategories, ...fmCats])).filter(Boolean);

    if (tags.length === 0 && l3) {
      const r = extractDateAndTags(l3);
      const bodyTags = r.tags || [];
      tags = Array.from(new Set([...bodyTags]));
    }

    const iso = ensureISO(parsedDate);
    const formattedDate = iso ? formatAbsolute(iso) : null;

    // JSON-safe cover field
    const cover = (fm.image || fm.cover || fm.thumbnail || null) as string | null;

    return {
      slug,
      title,
      description,
      date: iso,
      formattedDate,
      tags,
      cover,
      url: fm.url || "", // allow absolute URLs
    };
  });

  // Sort by date desc (unknown dates go last)
  items.sort((a, b) => {
    const at = a.date ? new Date(a.date).getTime() : -Infinity;
    const bt = b.date ? new Date(b.date).getTime() : -Infinity;
    return bt - at;
  });

  return items;
}
