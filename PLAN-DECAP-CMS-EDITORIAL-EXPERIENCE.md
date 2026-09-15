# Decap CMS Editorial Experience Plan

## Status

- Core implementation complete on 2026-09-15
- Local article listing, creation, editing, preview, and filesystem save verified
- Structured footer content and development-only footer entry point implemented
- Broader page-content extraction remains an incremental follow-up after editorial use validates the content model
- Target editor: Decap CMS using its local repository proxy
- CMS schema moved behind a development-only, loopback-only endpoint
- Expanded visual-composer requirements documented; Decap remains the working baseline but does not satisfy the final single-canvas interaction model

## Objective

Add a local, browser-based editorial workspace to Abstract Voyage that can list, create, edit, preview, and save the site's Markdown articles while preserving the repository's existing content conventions.

After article editing is proven safe, extend the same workspace to selected page and footer content. Markdown, YAML, JSON, and repository media remain the source of truth. No database or mandatory hosted CMS service is introduced.

## Architectural Decision

Use Decap CMS as a local-only, Git/file-backed headless CMS.

```text
Development-only /admin
        |
        v
Decap browser interface
        |
        v
Local Decap proxy on 127.0.0.1:8081
        |
        v
posts/*.md + content/**/*.yml + public/posts/**/*
        |
        v
Existing getStaticProps/content helpers
        |
        v
Public pages and article routes
```

The CMS owns editorial content. TypeScript and the existing configuration-panel system continue to own presentation and behavior.

## Content Ownership

### Managed by Decap

- Article Markdown bodies
- Article frontmatter
- Article creation and listing
- Featured status
- Source attribution
- Hero images and article media
- Snippet and table directives
- Footer labels, descriptions, navigation visibility, and contact information
- Selected page copy introduced incrementally after the article workflow is stable

### Retained in TypeScript

- Layout and responsive behavior
- Animation and interaction settings
- Gradient and color calculations
- Typography presentation
- Component configuration
- Accessibility behavior
- Design-system defaults and normalization

This boundary prevents an editorial change from destabilizing the page's visual system.

## Visual Composer Functional Requirements

The target editorial experience is a template-aware visual composer, not a generic rich-text form. The operator edits the article through the same components, typography, spacing, responsive behavior, and content width used by the published site.

### Single editing canvas

- Present one primary article canvas rather than separate form and preview panes.
- Render the canvas with the production article components and site styles.
- Allow direct editing of text where it appears in the article.
- Keep global commands in a restrained toolbar and secondary document settings in a drawer.
- Provide desktop and mobile canvas widths without substituting a different preview renderer.

### Template-defined zones

Each article template declares named, typed zones. A zone controls both its visual component and its storage destination.

Initial article zones include:

- Title -> `title` frontmatter
- Excerpt -> `excerpt` frontmatter
- Hero image -> `heroImage` and `heroAlt` frontmatter
- Author and publication date -> `author` and `date` frontmatter
- Tags -> `tags` frontmatter
- Source attribution -> nested `source` frontmatter
- Article body -> Markdown body
- Data table -> Markdown directive plus JSON sidecar
- Code include -> Markdown directive plus snippet sidecar
- Inline image and caption -> Markdown body and repository media

Changing the position of a special zone must never change its storage binding. For example, an excerpt moved below the hero image still serializes to the `excerpt` frontmatter key.

### Zone rules

- The template declares whether a zone is required, optional, repeatable, removable, or movable.
- Required singleton zones such as Title and Body cannot be deleted or duplicated.
- Optional singleton zones such as Hero image and Excerpt can be inserted once from the sidebar.
- Repeatable body blocks such as images, tables, and code includes can be inserted multiple times.
- Invalid drops are prevented before they alter the document.
- Removing a zone that contains content requires confirmation and offers undo.
- Template rules, rather than ad hoc editor checks, remain the source of truth for valid article structure.

### Sidebar and drag-and-drop

- Provide a component sidebar containing the zones and blocks permitted by the active template.
- Allow operators to drag an available zone from the sidebar into a valid insertion point on the canvas.
- Allow existing zones and blocks to be reordered by dragging or by explicit Move up and Move down commands.
- Show insertion indicators, valid targets, disabled unavailable singleton zones, and the currently selected zone.
- Provide a document outline for selecting and reordering content without precise pointer movement.
- Support keyboard reordering and insertion so drag-and-drop is not the only interaction path.
- Preserve selection, scroll position, and undo history after a move.

### Persisted ordering

Frontmatter values do not currently encode presentation order. Per-article ordering therefore requires an explicit layout sequence while preserving each zone's existing storage field.

The proposed additive representation is:

```yaml
layout:
  - title
  - heroImage
  - excerpt
  - byline
  - body
  - source
```

- Existing articles without `layout` use the template's default order and require no immediate migration.
- A `layout` field is written only after an operator changes the default order or inserts/removes an optional zone.
- The public renderer and editor consume the same normalized template layout.
- Unknown layout entries are preserved on read and reported as validation errors rather than silently discarded.
- Body-level blocks retain their order in Markdown; the layout sequence positions the Body zone relative to frontmatter-backed zones.

### Selection and contextual controls

- Selecting a zone reveals only controls relevant to that zone.
- Text zones expose formatting appropriate to their semantic role; Title does not expose paragraph-level formatting.
- Image zones expose replace, crop/focal-point, alternative text, and remove controls.
- Table zones expose direct cell editing, row and column operations, header/footer controls, and a table caption.
- Code-include zones expose snippet selection, language, title, and an explicit source-edit action.
- Frontmatter-only properties that are not visible article elements remain in the document settings drawer.

### Saving and source fidelity

- Save frontmatter-backed zones to their designated YAML keys.
- Save the article body as Markdown, not generated HTML.
- Save tables and snippets to their established sidecar paths.
- Validate the complete document before writing any related file.
- Write the Markdown and sidecars as one logical operation, with rollback if part of the save fails.
- Preserve unsupported or unknown Markdown as protected source blocks.
- A no-op open/save must remain semantically equivalent and must not reorder unrelated frontmatter.
- Detect on-disk changes made after the editor loaded and require conflict resolution before overwriting them.

### Editor states

- Clearly represent loading, dirty, saving, saved, invalid, conflict, and save-failure states.
- Support undo and redo across text edits, zone insertion, removal, and reordering.
- Warn before navigation when unsaved changes exist.
- Offer recovery from a local draft after a browser refresh or editor crash.

### Architectural consequence

Decap remains a useful, working local CMS baseline and fallback editor. Its form-plus-preview architecture does not provide this single-canvas template composition model. The expanded requirement should be implemented as a project-specific editor that reuses the production renderer and a proven rich-text engine, rather than by progressively replacing Decap's internal interface.

## Existing Content Contract

The editor must preserve the following repository conventions.

### Article location

Articles live in `posts/*.md` and are parsed directly with `gray-matter`.

### Filename contract

New article files must use:

```text
YYYY-MM-DD_<slug>.md
```

`helpers/postContent.ts` derives the journal-summary date directly from the filename. The date prefix is therefore behavioral, not cosmetic.

Existing filenames must remain stable when an article title or publication metadata changes. Renaming an existing file changes its canonical article route.

### Frontmatter

The currently observed schema includes:

- `title`
- `excerpt`
- `author`
- `date`
- `tags`
- `featured`
- `url`
- `heroImage`
- `heroAlt`
- Nested `source.platform`
- Nested `source.url`
- Nested `source.originallyPublished`

The runtime additionally supports external-navigation and table-of-contents fields. The implementation must reconcile the complete runtime schema before finalizing `config.yml`.

### Custom Markdown directives

Code snippets are included with:

```md
<!-- code:include file="example.js" lang="js" title="example.js" -->
```

Snippet files live under:

```text
content/posts/<article-slug>/snippets/
```

JSON tables are included with:

```md
<!-- table:table-name -->
```

Table data lives under:

```text
content/posts/<article-slug>/tables/
```

The body also contains fenced code, images, figure captions, headings, blockquotes, Unicode punctuation, and non-breaking spaces. These must survive editor round trips.

### Special entries

`posts/welcome.md` is introductory site content rather than a normal journal article. It must be represented as a singleton or excluded from the normal article-creation workflow.

### Featured behavior

`featured: true` opts an article into the homepage hero sequence. It does not remove non-featured articles from the journal archive.

## Phase 1: Compatibility Spike

### Goal

Prove that Decap can safely round-trip the most complex existing article before integrating it with real content.

### Work

1. Add a temporary editor fixture collection containing copies of representative articles.
2. Include at least one fixture with nested frontmatter, fenced code, images, captions, snippet directives, and table directives.
3. Start the Decap local proxy bound to `127.0.0.1`.
4. Open and save each fixture without intentional changes.
5. Compare parsed frontmatter and body content before and after the save.
6. Test raw and rich-text modes independently.
7. Test creating a new file with the required filename convention.

### Approval gate

Proceed only if:

- Frontmatter remains semantically equivalent.
- Markdown body content remains byte-identical, or every formatting-only difference is explicitly reviewed and accepted.
- HTML-comment directives are neither removed nor rewritten.
- Existing files are not renamed.
- A new article receives the correct date-prefixed filename.

If rich-text mode changes unsupported syntax, raw mode becomes the only enabled body mode for the first release.

## Phase 2: Development-Only CMS Foundation

### Planned files

```text
pages/admin.tsx
components/Editor/
  initializeDecap.ts
  editor.css
  components/
  previews/
editor/decap.config.yml
pages/api/dev/editor-config.tsx
```

The schema is served through a loopback-only development API rather than copied into the production `public` tree.

### Implementation decisions

- Mount Decap inside a dedicated `/admin` route.
- Make the route return `notFound` in production.
- Add `noindex` metadata as defense in depth.
- Load a pinned Decap browser build isolated from the application's React 18 runtime.
- Add a pinned `decap-server` development dependency.
- Bind the proxy to `127.0.0.1:8081`.
- Restrict allowed origins to local Next.js development origins.
- Add an `editor` script for the proxy.
- Add a `dev:editor` script that runs Next.js and the proxy together.
- Verify that static export does not produce a usable admin route.

The current Decap npm application expects a newer React peer than this project. The compatibility spike should therefore use an isolated, pinned browser bundle. Directly installing the current application package into the site bundle is out of scope unless the React compatibility situation changes.

## Phase 3: Article Collection

Configure a folder collection targeting `posts/`.

The initial configuration should be equivalent to:

```yaml
name: posts
label: Articles
label_singular: Article
folder: posts
create: true
extension: md
format: yaml-frontmatter
slug: "{{year}}-{{month}}-{{day}}_{{slug}}"
preview_path: "posts/{{slug}}"
```

The exact filename behavior must be verified against a user-selected publication date during the compatibility spike. Do not assume that creation time and publication time are interchangeable.

### Article fields

- Title
- Publication date
- Excerpt
- Author
- Tags
- Featured
- Hero image
- Hero alternative text
- Original URL
- Source platform
- Source URL
- Original source publication date
- External-navigation settings supported by the runtime
- TOC visibility controls
- TOC heading/figure controls
- TOC minimum thresholds
- TOC include/exclude lists
- Markdown body

Required and optional status must match the existing runtime rather than Decap defaults.

### Collection view

The article library should provide:

- Search
- Title and publication date
- Featured status
- Primary tag
- Filename
- Sorting by title and date
- Filters for featured and externally sourced articles
- A clear New Article command

### Form organization

- Keep the body as the primary editing surface.
- Group publication metadata separately from source attribution.
- Place advanced TOC controls in a collapsed section.
- Present `featured` as a switch.
- Use human-readable labels rather than internal property names.
- Keep raw Markdown available at all times.
- Provide a post-save link to `/posts/<slug>`.

## Phase 4: Custom Markdown Controls

Register two Decap editor components.

### Code Include

Fields:

- Snippet filename
- Language
- Optional display title

Serialization must produce the existing `code:include` HTML comment exactly.

### Data Table

Fields:

- Table identifier

The control should enumerate table JSON files available for the current article and preview the selected table's title and column headings.

Serialization must produce the existing `table:<identifier>` HTML comment exactly.

These controls improve discoverability without migrating the source format to MDX, Markdoc, or proprietary blocks.

## Phase 5: Media Handling

Configure article media under `public/posts/`, with public paths rooted at `/posts/`.

### Rules

- Preserve all existing image paths.
- Never relocate existing assets automatically.
- Allow browsing and selecting existing media.
- Require an explicit destination folder for new uploads.
- Validate that referenced hero images exist.
- Preserve image alt text independently of captions.
- Do not treat snippet or table files as ordinary image media.

Existing asset directories do not consistently match article filenames, so the implementation must not assume a one-to-one filename-to-media-folder mapping.

## Phase 6: Footer Entry Point

Add a restrained Editor utility link to the existing footer.

### Behavior

- Visible only when `showAuthoringTools` is true.
- Links to `/admin`.
- Absent from production markup.
- Uses the footer's existing adaptive ink, focus, and spacing behavior.
- Lives in a small utility row near the contact or wordmark area.
- Does not embed the editor or article library in the footer.

Likely integration points:

- `pages/abstract.tsx`
- `experiences/abstract/components/SiteFooter/SiteFooter.tsx`
- `components/Panel/useAuthoringToolsVisibility.ts`

The footer remains navigation and identity. It is only the entrance to the editorial workspace.

## Phase 7: Footer Content Extraction

Create:

```text
content/settings/footer.yml
helpers/footerContent.ts
```

Move only editorial footer properties into YAML:

- Navigation label
- Page titles
- Page descriptions
- Page visibility
- Contact email
- Accessible labels

Keep all visual footer properties in `DEFAULT_ABSTRACT_FOOTER_CONFIG`.

`helpers/footerContent.ts` should:

1. Parse the YAML file.
2. Validate it with Zod.
3. Normalize optional values.
4. Merge content with safe defaults.
5. Return a typed editorial-content object.

`getStaticProps()` in `pages/abstract.tsx` should load the footer content and pass it to `SiteFooter` separately from its presentation config.

Expose `content/settings/footer.yml` as a Decap file collection singleton.

## Phase 8: Page Content Rollout

After article and footer authoring are stable, introduce page singletons incrementally:

```text
content/pages/
  abstract.yml
  about.yml
  contact.yml
```

Do not perform a wholesale migration. Extract one coherent editorial section at a time, beginning with static headings, supporting copy, and calls to action.

Every loader must retain a safe in-code fallback so that a missing or invalid content file cannot break a production build.

## Validation and Security

### Save validation

- Reject empty titles.
- Validate publication dates as ISO dates.
- Require at least one non-empty tag where appropriate.
- Validate URLs when present.
- Enforce the article filename pattern for new content.
- Reject duplicate slugs.
- Reject paths containing traversal sequences.
- Validate referenced media, snippet, and table files.
- Validate table JSON structure before save.

### Local security

- Bind the proxy to loopback only.
- Restrict CORS to the local site origin.
- Do not expose write endpoints in production.
- Do not ship credentials or tokens.
- Do not add GitHub mode during the local-only release.
- Ensure the production `/admin` route resolves to 404.

## Testing Strategy

### Unit tests

- Filename generation and parsing
- Slug validation
- Path traversal rejection
- Frontmatter schema validation
- Footer-content normalization and fallback behavior
- Missing asset detection
- Snippet directive parsing and serialization
- Table directive parsing and serialization
- Table JSON validation

### Round-trip tests

For every existing article, compare the state before and after a no-op CMS save:

- Parsed frontmatter deep equality
- Markdown body bytes
- HTML comments
- Code fences and fence metadata
- Image URLs and alt text
- Figure captions
- Unicode punctuation
- Non-breaking spaces
- Final newline behavior

### Integration tests

- List existing articles.
- Create a new article.
- Edit and save an article fixture.
- Insert a snippet directive.
- Insert a table directive.
- Select an existing image.
- Open the saved article route.
- Confirm the footer Editor link in development.
- Confirm its absence in production.

### Release verification

```text
npm test
npm run build
npm run export
npm run verify:release
```

The production build must also be inspected to confirm that the admin UI and write integration are unavailable.

## Delivery Sequence

### Milestone 1: Compatibility spike

Estimate: 1-2 engineering days.

Deliverables:

- Local proxy
- Temporary `/admin` workspace
- Fixture article collection
- Round-trip report
- Go/no-go decision

### Milestone 2: Article MVP

Estimate: 2-3 engineering days.

Deliverables:

- Complete article schema
- Article list
- Create/edit/save workflow
- Filename rules
- Raw Markdown authoring
- Existing-route preview link

### Milestone 3: Project-specific editing

Estimate: 2-3 engineering days.

Deliverables:

- Snippet include control
- Table include control
- Media selection
- Styled preview
- Editorial interface refinements

### Milestone 4: Footer content

Estimate: 1-2 engineering days.

Deliverables:

- Development-only footer link
- Footer YAML singleton
- Typed loader and fallbacks
- CMS form for footer copy

### Milestone 5: Hardening

Estimate: 1-2 engineering days.

Deliverables:

- Automated validation
- Round-trip coverage
- Production exclusion verification
- Build and release verification

Estimated total: 7-12 engineering days.

This estimate covers the completed Decap-based baseline only. It does not cover the visual composer described above.

## Visual Composer Delivery Estimate

### Composer foundation

Estimate: 4-6 engineering days.

- Shared template and layout schema
- Normalization for articles without an explicit layout
- Development-only article load/save endpoints
- Production article renderer consuming the normalized layout

### In-place rich-text canvas

Estimate: 5-8 engineering days.

- Production-styled editable article surface
- Markdown-backed text, headings, lists, links, quotes, and captions
- Selection toolbar, paste behavior, undo, and redo
- Protected representation for unsupported source constructs

### Template zones and composition

Estimate: 5-8 engineering days.

- Typed zone registry and storage bindings
- Component sidebar and document outline
- Pointer drag-and-drop
- Keyboard insertion and reordering
- Required, optional, singleton, and repeatable constraints

### Project-specific blocks

Estimate: 5-8 engineering days.

- Hero image and media workflow
- Direct table-grid editing with JSON sidecar persistence
- Code-include editing and snippet selection
- Captions, source attribution, and article metadata drawer

### Save integrity and hardening

Estimate: 6-10 engineering days.

- Atomic multi-file writes and rollback
- Dirty state, draft recovery, and conflict handling
- Lossless fixture round trips
- Accessibility, responsive interaction, and browser coverage
- Migration and rollback verification

### Reassessed total

- Focused proof of concept using the Biomimetics article: 8-12 engineering days
- Useful author-only MVP with template zones and reordering: 20-30 engineering days
- Reliable replacement for the current CMS workflow: 25-40 engineering days, approximately 5-8 weeks for one engineer

The drag interaction itself is not the primary cost. The larger work is maintaining a durable mapping among visual position, typed frontmatter fields, Markdown blocks, and sidecar files while preserving existing articles losslessly.

## Implementation Verification

Completed on 2026-09-15:

- Existing article and directive validation: passing
- Footer schema, normalization, and fallback tests: passing
- Development-only admin route tests: passing
- Desktop and mobile editorial workspace smoke tests: passing
- Browser-driven article creation and filesystem save: passing
- Disposable article cleanup after the save test: passing
- CMS YAML and footer YAML parsing: passing
- Production build and repository-wide TypeScript check: currently blocked by unrelated, pre-existing CoverFlow easing edits in the working tree

## Rollback Strategy

- Keep the existing content readers unchanged during the article MVP.
- Introduce no content-format migration in the first release.
- Make the editor additive and development-only.
- Remove the `/admin` route, editor scripts, and Decap configuration to roll back the CMS without changing any article.
- Retain in-code footer defaults after content extraction so the YAML integration can be disabled independently.
- Do not rename or reorganize existing posts or media as part of this work.

## Definition of Done

The implementation is complete when:

- Existing articles can be listed and edited locally.
- A new article can be created with a valid filename and frontmatter.
- Save updates or creates the expected repository file.
- Existing Markdown conventions survive a no-op save.
- Snippet and table directives have usable insertion controls.
- Article images can be selected without path rewrites.
- Footer copy can be edited through a structured singleton.
- The footer provides a development-only link to the editor.
- The editor and local write path are unavailable in production.
- All tests and release-verification commands pass.

## References

- [Decap local proxy](https://decapcms.org/docs/decap-proxy/)
- [Decap installation](https://decapcms.org/docs/install-decap-cms/)
- [Decap configuration options](https://decapcms.org/docs/configuration-options/)
- [Decap folder collections](https://decapcms.org/docs/collection-folder/)
- [Decap file collections](https://decapcms.org/docs/collection-file/)
- [Decap custom widgets and editor components](https://decapcms.org/docs/custom-widgets/)
- [Decap custom previews](https://decapcms.org/docs/customization/)
- `helpers/postContent.ts`
- `helpers/postArticle.ts`
- `pages/abstract.tsx`
- `pages/abstract.config.ts`
- `experiences/abstract/components/SiteFooter/SiteFooter.tsx`
