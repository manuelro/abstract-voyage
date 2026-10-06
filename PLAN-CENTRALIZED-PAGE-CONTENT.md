# Centralized Page Content — Markdown Model and Migration Plan

## Status

Planning only. No runtime copy or page behavior is changed by this document.

## Decision

Use one Markdown document with YAML frontmatter per page, modeled after the
repository's established `posts/*.md` contract. This replaces the earlier
single-JSON proposal.

```text
content/
  pages/
    abstract.md
    about.md
    contact.md
    site.yml
  posts/
    …existing article-side assets…
posts/
  …existing long-form articles…
helpers/content/
  pageContent.schema.ts
  pageContent.build.ts
  pageContent.sections.ts
  SiteContentProvider.tsx
  usePageContent.ts
```

`site.yml` is intentionally separate from the three route documents. It owns
genuinely global copy—navigation labels and later shared SEO/brand phrases—so
no page becomes the accidental owner of site-wide strings.

Markdown is the canonical authoring format for page prose. YAML frontmatter is
the canonical authoring format for structured, component-addressable content.
The model never stores JSX, HTML, Tailwind classes, animation values, or
component configuration.

## Why this is the scalable choice

The current post system already provides the right editorial properties:

- `gray-matter` parses frontmatter and Markdown bodies.
- Markdown preserves readable prose, emphasis, links, headings, and clean Git
  diffs without JSON escaping.
- Per-page files isolate ownership and reduce merge conflicts.
- The existing local Decap workflow already understands file-backed Markdown.
- Typed loaders can still make invalid content fail during build/CI.

A giant JSON document would be convenient for a purely structured data model, but it
would make long prose harder to write, review, and merge. A Markdown body plus
typed frontmatter gives the same application contract without making editorial
work feel like source-code editing.

## Content contract

All four documents are versioned and validated with Zod. The first release is
English-only (`locale: en`) but includes the locale explicitly so a later
translation layer is additive.

### `content/pages/site.yml`

```yaml
schemaVersion: 1
locale: en
navigation:
  about: { label: About, href: /about }
  journal: { label: Journal, href: /journal }
  contact: { label: Contact, href: /contact }
```

### `content/pages/abstract.md`

```md
---
schemaVersion: 1
locale: en
meta:
  title: Abstract Voyage
  description: …
hero:
  id: editorial-hero
  heading: Abstract Voyage is where I think out loud.
---

<!-- block:hero-body -->

A name I build and write under, kept loose enough to follow whatever holds my
attention. It began with how **light and sound** relate…
```

### `content/pages/about.md`

```md
---
schemaVersion: 1
locale: en
meta:
  title: About
  description: …
timeline:
  - id: contractor
    title: Where it starts
    period: circa 2010
    preview: Contractor, then multiple squads, then whole engagements
  - id: questions
    title: The question
    period: circa 2017
    preview: …
---

<!-- section:contractor -->

Before any of this had a name, I was a **contractor**…

<!-- section:questions -->

Two questions in particular, and neither had a use…
```

Stable section directives are deliberately used instead of display headings as
machine keys. An editorial title can change without breaking the component's
content mapping. The parser returns the Markdown between directives as each
timeline item's rich body.

### `content/pages/contact.md`

```md
---
schemaVersion: 1
locale: en
meta:
  title: Contact
  description: …
conversation:
  agent:
    name: Relay
    entryMessage: |-
      Hello. I’m {{agentName}}, Manuel’s contact assistant.
  questions:
    replyRoute: What’s the best email for Manuel to reply to?
    name: What should Manuel call you? This is optional.
  messages:
    recapIntro: Here’s the note Manuel would receive.
    replyRouteError: Please enter an email address so Manuel can reply.
    close:
      default: That’s with Manuel now…
      withReplyWindow: That’s with Manuel now. He usually replies within {{replyWindow}}…
  placeholders:
    entry: Start anywhere
    replyRoute: your@email.com
    name: Your name (optional)
  actions:
    skipName: Stay anonymous
    sendAsIs: Use my original words
    editReplyDetails: Edit reply details
---

<!-- block:contact-introduction -->

Optional longer-form editorial contact copy belongs here when the page needs it.
```

Contact is intentionally frontmatter-heavy. Its visible strings are keyed by a
state machine, form validation, persistence, and transcript grouping; hiding
those keys inside prose sections would make the implementation fragile.

## Build-time content boundary

```text
page Markdown + site.yml
          |
          v
pageContent.build.ts        Build-only read + gray-matter parse
          |
          v
pageContent.schema.ts       Zod validation + inferred page models
          |
          +--> loadPageContent('abstract' | 'about' | 'contact')
          +--> loadSiteContent()
          +--> formatContentTemplate(template, values)
          |
          v
getStaticProps / page props
          |
          v
<SiteContentProvider value={...}>
          |
          +--> usePageContent('about')
          +--> useSiteContent()
```

- `pageContent.build.ts` is build tooling, not an application service. It is
  never imported by a client bundle and uses `fs`, `gray-matter`, and the
  Markdown-section parser only while `next build`/static export runs.
- `getStaticProps` loads and validates a page's source, then passes plain typed
  data as props. Public rendering has no content HTTP request, API route,
  server function, or loading state.
- `SiteContentProvider` is the client-facing bridge for nested components and
  future CMS previews. Its default comes from page props, not a duplicate
  client parser.
- `formatContentTemplate()` supports declared tokens only. It rejects missing
  or unknown values and never emits HTML. Contact's reply-window copy chooses
  an explicit template variant before interpolation.
- Layout configs, panel labels, visual tokens, state enums, submission payload keys,
  and user-entered conversation data remain in TypeScript.

### Static deployment guarantee

The deployed site is a purely static Netlify artifact. The only Node.js process
in this design is Netlify's build environment, which already runs the project's
static build. It parses and validates Markdown once, then emits static HTML,
JavaScript, and Next static-data artifacts. After deployment:

- No deployed Node.js content process exists.
- No API endpoint, serverless function, or middleware reads page content.
- No browser request is made to a content service; client navigation may use
  Next's generated static route data, which is a deployed file, not a service.
- Editing Markdown requires a new static build/deploy; there is no live content
  mutation path in production.

### Exact page-prop contracts

The loader boundary is explicit so Node-only file access can never leak into a
browser bundle:

```ts
type AbstractPageContentProps = {
  pageContent: AbstractPageContent;
  siteContent: SiteContent;
};
type AboutPageContentProps = {
  pageContent: AboutPageContent;
  siteContent: SiteContent;
};
type ContactPageContentProps = {
  pageContent: ContactPageContent;
  siteContent: SiteContent;
};
```

- `pages/abstract.tsx` extends its existing `getStaticProps` result with
  `loadPageContent('abstract')` and `loadSiteContent()`.
- `pages/about.tsx` adds `getStaticProps` and receives `AboutPageContentProps`.
- `pages/contact.tsx` adds `getStaticProps` and receives
  `ContactPageContentProps`. This content migration introduces no content API;
  its existing message-submission behavior is outside this plan.
- Each page mounts `SiteContentProvider` with its two validated props, or the
  provider is mounted once in the app shell with serialized page props. Choose
  one implementation during Phase 0; do not support both paths.
- Props are plain objects only—no `Date`, `Map`, functions, parser tokens, or
  raw frontmatter objects cross the Next.js serialization boundary.

### Supported Markdown and section-parser contract

Page-body Markdown is deliberately narrower than article Markdown. It supports
plain paragraphs, the already-shipped `**emphasis**` syntax, and
`[label](href)` links. It does not support headings, lists, images, tables,
HTML, embeds, directives other than this plan's block/section delimiters, or
code fences. This preserves the current page renderers rather than silently
introducing a second rich-text renderer.

The parser contract is:

- Normalize CRLF to LF before parsing.
- A delimiter occupies its own line exactly:
  `<!-- block:lowercase-kebab-id -->` or
  `<!-- section:lowercase-kebab-id -->`.
- Content begins after a delimiter and ends at the next delimiter or EOF.
- Trim only leading/trailing blank lines; preserve interior whitespace.
- A required block/section must occur exactly once and have non-empty content.
- Unknown, duplicate, malformed, or orphan delimiters are build errors.
- About `section:` IDs must exactly match its frontmatter timeline IDs; their
  source order must also match the frontmatter order, preserving chronology.
- The parser returns `Record<string, RichTextSource>`, not rendered HTML.

## Failure, rollout, and rollback policy

- Production build and CI fail closed on any source, schema, parser, link, or
  template violation. Publishing stale or partial copy is not an acceptable
  fallback.
- Development shows an actionable error naming the file, key/directive, and
  validation rule. It must not silently fall back to page-local retired copy.
- Migrate one page per pull request/commit series. Its Markdown source and
  consumer code land together; page-local constants remain until the same
  change's tests and visual checks pass, then are removed before merge.
- Rollback is a Git revert of the page's isolated migration. Retaining the old
  local literal during a deployed partial rollout is prohibited because it
  creates two competing sources of truth.
- Page-content changes after cutover must be validated in CI using the same
  build-time loader and schema as the static build.

## Validation rules

1. `schemaVersion` and `locale` are required in every document.
2. Required strings are trimmed and non-empty; IDs are unique and stable.
3. Markdown-lite links must be valid internal paths or absolute URLs.
4. Every About timeline ID in frontmatter has exactly one matching
   `<!-- section:id -->` body section; no orphan body sections are allowed.
5. Contact template tokens are declared and supplied. All question/action keys
   needed by the conversation model are required.
6. The parser returns plain, serializable props only.
7. Unit tests cover malformed frontmatter, duplicate IDs, missing/duplicate/
   out-of-order sections, CRLF normalization, invalid links, unsupported
   Markdown, serialization, and template failures.

## Page-by-page migration

### Phase 0 — foundations

1. Add the four source files with copy byte-identical to current production
   values.
2. Add page/site schemas, a build-only loader, section parser, typed selectors,
   provider, and template formatter.
3. Add fixture and validation tests before a page consumes the files.
4. Add a content-authoring guide beside `content/pages/` documenting IDs,
   directives, markdown-lite syntax, templates, and the ownership boundary.

### Phase 1 — `/` (`pages/abstract.tsx`)

Current local sources include `ABSTRACT_EDITORIAL_HEADLINE`,
`ABSTRACT_EDITORIAL_PARAGRAPH_1`, `ABSTRACT_EDITORIAL_PARAGRAPHS`, and the
page-specific SEO strings.

1. Extend the existing `getStaticProps` and `AbstractPageProps` with
   `AbstractPageContentProps`; do not replace its existing dock/lab/footer
   loading contract.
2. Replace local hero literals with `content.hero.heading` and the parsed
   `hero-body` block.
3. Feed the same typed values into every existing `AbstractEditorialHero`
   render path, including classic and split-column branches. There must be no
   branch-local fallback copy.
4. Source `SeoHead` title/description from `content.meta`; canonical-path logic
   remains code-owned.
5. Test and visually verify desktop, tablet, mobile, default hero mode, and
   alternate hero render branch.
6. Remove retired local copy constants only after both branches pass.

### Phase 2 — `/about` (`pages/about.tsx`)

Current copy is split between `ABOUT_TIMELINE_ROWS`,
`ABOUT_NARRATIVE_PARAGRAPHS`, and derived `ABOUT_NARRATIVE_PREVIEWS`.

1. Add `getStaticProps` and `AboutPageContentProps`; the page currently has no
   static-props entry point, so this is an explicit new boundary.
2. Replace the parallel arrays with one loader-produced collection. Each item
   contains `id`, title, period, preview, and parsed Markdown body.
3. Adapt that collection once at the page boundary into existing
   `AboutTimelineRowData`, dock-slide, and accordion inputs. Do not reconnect
   data by array position.
4. Keep `preview` explicit when it differs from title; otherwise the loader may
   derive it from title. Preserve the current copy exactly during migration.
5. Move page SEO values to `content.meta`.
6. Add an ID one-to-one test spanning timeline rows, desktop dock slides, and
   mobile/tablet accordion items. Visually verify all five entries in both
   render systems, including inline links and emphasis.
7. Delete the old arrays only after the mappings and visual checks pass.

### Phase 3 — `/contact` (`pages/contact.tsx`)

Contact is the highest-risk migration because visible strings are used by a
conversation state machine.

1. Add `getStaticProps` and `ContactPageContentProps`; the page currently has
   no static-props entry point. Pass its typed conversation model to the
   page/provider without changing runtime message-submission behavior.
2. Migrate greeting, degraded greeting, recap strings, questions, validation
   errors, placeholders, narrow-screen variants, action labels, close-message
   variants, and metadata from local literals to frontmatter keys.
3. Replace `ANSWER_FIELD_QUESTION_TEXT` text matching with the existing stable
   `ChatTurn.field` vocabulary (`'reply-route' | 'name'`) and a typed mapping
   to content keys (`reply-route → replyRoute`, `name → name`). Find and move
   answer/question blocks by `field`, never rendered text. Resolve visible
   wording only at render time, so editorial edits cannot break grouping,
   answer editing, persistence, or reordering.
4. Keep `Step`, `Phase`, roles, storage versions, localStorage keys, endpoint
   payload keys, and conversation algorithms in TypeScript.
5. Select `messages.close.default` or `.withReplyWindow` before calling
   `formatContentTemplate()`.
6. Extend tests for initial flow, invalid email, anonymous-name path, answer
   editing, persistence/resume, degraded mode, and both reply-window variants.
   Verify mobile and desktop, because narrow placeholders/action labels have
   explicit text-fit behavior.
7. Remove retired contact copy constants after all behavioral tests and visual
   checks pass; do not leave a fallback literal path.

### Phase 4 — shared and future content

- Move navigation labels to `site.yml` only after SiteHeader can accept the
  typed navigation model without changing its active-route behavior.
- Keep the existing footer YAML on its current loader until a dedicated footer
  migration aligns it with the page-content model.
- Migrate Journal and posts later under their own plan. Long-form article
  Markdown already has a mature `posts/*.md` pipeline with frontmatter,
  tables, snippets, media, headings, and reading-time behavior; do not flatten
  it into page-content frontmatter.
- Register the files with Decap only after validated filesystem writes, preview,
  and rollback behavior are proven locally.

## Cutover criteria

- The three pages consume typed build-time content models, not local
  visitor-facing copy literals.
- A page Markdown file is the sole content source for its route; `site.yml` is
  the sole source for its shared global strings.
- Build/CI fails for schema, section, key, link, or template violations.
- Abstract's render branches, About's desktop/mobile content paths, and
  Contact's normal/error/resume paths are tested and visually verified.
- No public page fetches its copy over HTTP or relies on a deployed Node.js
  service, API route, serverless function, or middleware.
- Each migrated page has a single build-time content source and an isolated
  Git-revert rollback path.
