import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { z } from 'zod';

export const ARTICLE_FILE_NAME_PATTERN = /^\d{4}-\d{2}-\d{2}_[a-z0-9]+(?:-[a-z0-9]+)*\.md$/;

const sourceSchema = z.object({
  name: z.string().optional(),
  platform: z.string().optional(),
  url: z.url().optional(),
  originallyPublished: z.iso.date().optional(),
}).passthrough();

const articleFrontmatterSchema = z.object({
  title: z.string().trim().min(1),
  excerpt: z.string().optional(),
  author: z.string().optional(),
  date: z.iso.date().optional(),
  tags: z.union([z.array(z.string()), z.string()]).optional(),
  featured: z.boolean().optional(),
  url: z.url().optional(),
  source: sourceSchema.optional(),
  heroImage: z.string().startsWith('/').optional(),
  heroAlt: z.string().optional(),
  externalUrl: z.url().optional(),
  forceExternalNavigation: z.boolean().optional(),
  toc: z.boolean().optional(),
  tocHeadings: z.boolean().optional(),
  tocFigures: z.boolean().optional(),
  tocMinHeadings: z.number().int().nonnegative().optional(),
  tocMinFigures: z.number().int().nonnegative().optional(),
  tocInclude: z.array(z.string()).optional(),
  tocExclude: z.array(z.string()).optional(),
}).passthrough();

export type ArticleDirective = {
  kind: 'snippet' | 'table';
  id: string;
};

export type ArticleValidationResult = {
  valid: boolean;
  errors: string[];
  directives: ArticleDirective[];
};

export function isValidArticleFileName(fileName: string) {
  return fileName === 'welcome.md' || ARTICLE_FILE_NAME_PATTERN.test(fileName);
}

export function extractArticleDirectives(body: string): ArticleDirective[] {
  const directives: ArticleDirective[] = [];
  const snippetPattern = /<!--\s*code:include\s+file="([^"]+)"\s+lang="[^"]+"(?:\s+title="[^"]+")?\s*-->/g;
  const tablePattern = /<!--\s*table:([a-z0-9-]+)\s*-->/gi;

  let match = snippetPattern.exec(body);
  while (match) {
    directives.push({ kind: 'snippet', id: match[1] });
    match = snippetPattern.exec(body);
  }
  match = tablePattern.exec(body);
  while (match) {
    directives.push({ kind: 'table', id: match[1].toLowerCase() });
    match = tablePattern.exec(body);
  }

  return directives;
}

export function validateArticleSource({
  fileName,
  source,
  projectRoot = process.cwd(),
}: {
  fileName: string;
  source: string;
  projectRoot?: string;
}): ArticleValidationResult {
  const errors: string[] = [];
  const parsed = matter(source);
  const frontmatter = articleFrontmatterSchema.safeParse(parsed.data);

  if (!isValidArticleFileName(fileName)) {
    errors.push('Filename must be welcome.md or YYYY-MM-DD_<slug>.md.');
  }
  if (!frontmatter.success) {
    errors.push(...frontmatter.error.issues.map(issue => (
      `${issue.path.join('.') || 'frontmatter'}: ${issue.message}`
    )));
  }

  const slug = fileName.replace(/\.md$/, '');
  const directives = extractArticleDirectives(parsed.content);
  for (const directive of directives) {
    if (path.basename(directive.id) !== directive.id) {
      errors.push(`${directive.kind} directive contains an unsafe path: ${directive.id}`);
      continue;
    }

    const relativePath = directive.kind === 'snippet'
      ? path.join('content', 'posts', slug, 'snippets', directive.id)
      : path.join('content', 'posts', slug, 'tables', `${directive.id}.json`);
    if (!fs.existsSync(path.join(projectRoot, relativePath))) {
      errors.push(`Missing ${directive.kind} asset: ${relativePath}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    directives,
  };
}
