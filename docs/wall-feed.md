# Editing the wall

`content/wall.md` is the wall's published content and reading sequence. Its
YAML frontmatter also holds the closing banner and Practices section copy. Each
entry shows the title, text, destination, and the visual treatment when one is
needed. Editing those fields changes the wall on the next build. Article,
About quotation, and thought `ref` values identify existing sources; a
statement `ref` is a unique editorial ID. Source entries let the page reuse
artwork, reading time, and canonical detail pages where applicable.

The `banner.practices` frontmatter block supplies the section eyebrow,
heading, introduction, four practice titles and descriptions, delivery and
industry copy, and contact link. The four descriptions use the editable
`practice` quote design, available in the wall page's config panel.

| Field | What it does |
| --- | --- |
| `kind` | Chooses an article card, About quotation, original editorial statement, or thought quote. |
| `ref` | Article and thought refs are source slugs; quotation refs are `<About id>-line` or `-body` slots. Statement refs are unique editorial IDs. |
| `title` | Article card title, quote or statement heading, or thought title for accessible labels. |
| `text` | The exact copy shown on the wall: an article summary, a curated About quotation, an original statement, or a complete thought passage. |
| `href` | The article or thought link destination, or the source supporting a quotation or statement. |
| `date` | Publication date for articles and thoughts; article cards show its month and year, and dated entries must run newest first. |
| `keywords` | Article topics; the first one appears on the card. Remaining terms are editorial metadata. |
| `period` | Historical period shown in an About quotation heading; it is not a publication date. Statements have no historical period. |
| `presentation` | Quotation or statement design: `featured`, `plain`, or `solid`. |
| `link` | Whether a quotation or statement shows its source link. Current entries use `false`. |
| `linkLabel` | Optional quotation or statement link text when `link: true`; otherwise the selected quote design's label is used. |

The current manifest contains six articles, eight About quotations, and two
original editorial statements. One of the ten quote-form entries is featured;
the two longer passages are presented as solid quotes. It contains **no
thought entry**, so no thought is currently shown on the wall.
To publish the existing thought there, insert this entry at the appropriate
date position:

```yaml
- kind: thought
  ref: nobody-made-this-alone
  title: Nobody made this alone.
  text: >-
    Nobody made this alone. The color came from an algorithm. The words were
    argued into shape with a machine that pushed back. What is left over is
    judgment, and that is the part worth signing.
  date: '2026-09-02'
  href: /thoughts/nobody-made-this-alone
```

The route loads and validates this file at build time, resolves each `ref`,
then renders its entries in file order. Article cards use the manifest's
title, text, date, first keyword, and link. Quotations and statements use the
same quote designs; only About quotations show a historical period. Original
statements are author-written syntheses supported by the linked source, not
verbatim quotations. Thoughts use their date and full text in the existing
solid quote design. A missing article, About quote, or thought source,
duplicate entry, malformed field, or reversed publication date fails the build.

The wall places entries from the YAML sequence into the shortest available
column, starting across the top row. The DOM and keyboard order follow the
same sequence. On wider screens, differing card heights stagger later entries,
so a horizontal scan is not a strict chronological reading. Live quote design
settings can hide an entire quotation presentation; that setting affects
display without changing the manifest.

The full article, About page, and thought page remain in their own files.
Changing those sources does not silently rewrite curated wall copy; update
the corresponding wall entry when its preview should change too.
