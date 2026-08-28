import type Token from 'markdown-it/lib/token'
import { ReactNode } from 'react'
import {
  extractMarkdownTableKey,
  parseMarkdown,
  renderMarkdownInline,
  slugifyMarkdownHeading,
} from '../../../helpers/markdownRendering'
import Figure from './MarkdownContent/components/Figure'
import CodeBlock from './MarkdownContent/components/CodeBlock'
import TableBlock from './MarkdownContent/components/TableBlock'
import type { MarkdownContentConfig } from './MarkdownContent/config/registered'
import type {
  CodeBlockMeta,
  FigureMeta,
  MarkdownContentPresentation,
  TableData,
} from './MarkdownContent/types'

type MarkdownContentProps = {
  content: string
  figures: FigureMeta[]
  codeBlocks: CodeBlockMeta[]
  tables: Record<string, TableData>
  articlePresentation?: MarkdownContentPresentation
  articleConfig?: MarkdownContentConfig
  /** Opt-in: overrides the heading anchors' own scroll-mt-24 (a fixed 96px
   * fallback, kept for pages/posts/[slug].tsx and any other consumer that
   * doesn't pass this) with a live-measured pixel value. Exists so a hash
   * jump lands headings clear of a page's own fixed header at whatever
   * height that header actually measures, rather than a guessed constant
   * that can drift from it — see TableOfContents.tsx's own doc comment on
   * currentSectionLinePx for the sibling bug this same class of drift
   * caused (a hardcoded scroll-mt-24 here was not that bug's root cause,
   * since it happened to stay smaller than the live threshold, but it's
   * the same "two numbers that should be one" risk). */
  scrollMarginTopPx?: number
}

const findFigureBySrc = (figures: FigureMeta[], src: string) => figures.find((figure) => figure.src === src)

const buildNodes = (
  tokens: Token[],
  figures: FigureMeta[],
  codeBlocks: CodeBlockMeta[],
  tables: Record<string, TableData>,
  articlePresentation?: MarkdownContentPresentation,
  articleConfig?: MarkdownContentConfig,
  scrollMarginTopPx?: number,
) => {
  const nodes: ReactNode[] = []
  let i = 0
  let figureIndex = 0
  let codeIndex = 0

  while (i < tokens.length) {
    const token = tokens[i]
    if (token.type === 'heading_open') {
      const level = token.tag
      const inlineToken = tokens[i + 1]
      const text = inlineToken?.content ?? ''
      const id = token.attrGet('id') ?? slugifyMarkdownHeading(text)
      nodes.push(
        <span
          key={`${id}-${i}`}
          id={id}
          className="block scroll-mt-24"
          style={scrollMarginTopPx !== undefined ? { scrollMarginTop: scrollMarginTopPx } : undefined}
          tabIndex={-1}
        >
          {level === 'h2' ? (
            <h2
              className={articleConfig ? [
                articleConfig.h2MarginTop,
                articleConfig.h2MarginBottom,
                articleConfig.h2FontSize,
                articleConfig.h2FontSizeDesktop,
                articleConfig.headingFontWeight,
                articleConfig.headingLeading,
                articleConfig.headingFontFamily === 'inherit' ? '' : articleConfig.headingFontFamily,
              ].join(' ') : undefined}
              dangerouslySetInnerHTML={renderMarkdownInline(text)}
            />
          ) : (
            <h3
              className={articleConfig ? [
                articleConfig.h3MarginTop,
                articleConfig.h3MarginBottom,
                articleConfig.h3FontSize,
                articleConfig.h3FontSizeDesktop,
                articleConfig.headingFontWeight,
                articleConfig.headingLeading,
                articleConfig.headingFontFamily === 'inherit' ? '' : articleConfig.headingFontFamily,
              ].join(' ') : undefined}
              dangerouslySetInnerHTML={renderMarkdownInline(text)}
            />
          )}
        </span>
      )
      i += 3
      continue
    }

    if (token.type === 'html_block' || token.type === 'html_inline') {
      const key = extractMarkdownTableKey(token.content)
      if (key) {
        if (tables[key]) {
          nodes.push(
            <TableBlock
              key={`table-${key}-${i}`}
              table={tables[key]}
              articlePresentation={articlePresentation}
              articleConfig={articleConfig}
            />
          )
        }
        i += 1
        continue
      }
    }

    if (token.type === 'paragraph_open') {
      const inlineToken = tokens[i + 1]
      const inlineContent = inlineToken?.content ?? ''
      const key = extractMarkdownTableKey(inlineContent.trim())
      if (key) {
        if (tables[key]) {
          nodes.push(
            <TableBlock
              key={`table-${key}-${i}`}
              table={tables[key]}
              articlePresentation={articlePresentation}
              articleConfig={articleConfig}
            />
          )
        }
        i += 3
        continue
      }
      if (/^_Figure\s*(\d+)?\.\s*.*_/.test(inlineContent.trim())) {
        i += 3
        continue
      }
      if (inlineToken?.type === 'inline' && inlineToken.children?.length === 1 && inlineToken.children[0].type === 'image') {
        const image = inlineToken.children[0]
        const src = image.attrGet('src') ?? ''
        const alt = image.content ?? ''
        const figure = findFigureBySrc(figures, src) ?? figures[figureIndex]
        const figureId = figure?.id ?? `fig-${figureIndex + 1}`
        const figureAlt = alt || figure?.alt || 'Figure'
        const figureCaption = figure?.caption ?? null
        nodes.push(
          <Figure
            key={`${src}-${i}`}
            id={figureId}
            src={src || figure?.src || ''}
            alt={figureAlt}
            caption={figureCaption}
            articlePresentation={articlePresentation}
            articleConfig={articleConfig}
          />
        )
        figureIndex += 1
      } else {
        nodes.push(
          <p
            key={`p-${i}`}
            className={articleConfig?.paragraphMarginBottom}
            dangerouslySetInnerHTML={renderMarkdownInline(inlineContent)}
          />
        )
      }
      i += 3
      continue
    }

    if (token.type === 'blockquote_open') {
      const inlineToken = tokens[i + 2]
      nodes.push(
        <blockquote
          key={`bq-${i}`}
          className={articleConfig ? [
            articleConfig.richBlockMarginY,
            articleConfig.blockquoteRuleWidth,
            articleConfig.blockquotePaddingLeft,
            articleConfig.headingFontFamily === 'inherit' ? '' : articleConfig.headingFontFamily,
          ].join(' ') : undefined}
          dangerouslySetInnerHTML={renderMarkdownInline(inlineToken?.content ?? '')}
        />
      )
      i += 5
      continue
    }

    if (token.type === 'bullet_list_open' || token.type === 'ordered_list_open') {
      const isOrdered = token.type === 'ordered_list_open'
      const listItems: ReactNode[] = []
      i += 1
      while (tokens[i] && tokens[i].type !== (isOrdered ? 'ordered_list_close' : 'bullet_list_close')) {
        if (tokens[i].type === 'list_item_open') {
          const inlineToken = tokens[i + 2]
          listItems.push(
            <li key={`li-${i}`} dangerouslySetInnerHTML={renderMarkdownInline(inlineToken?.content ?? '')} />
          )
          i += 4
          continue
        }
        i += 1
      }
      nodes.push(isOrdered ? <ol key={`ol-${i}`}>{listItems}</ol> : <ul key={`ul-${i}`}>{listItems}</ul>)
      i += 1
      continue
    }

    if (token.type === 'fence' || token.type === 'code_block') {
      const block = codeBlocks[codeIndex]
      const language = block?.language ?? null
      const html = block?.html ?? null
      const code = block?.code ?? token.content
      nodes.push(
        <CodeBlock
          key={`code-${i}`}
          language={language}
          code={code}
          html={html}
          articlePresentation={articlePresentation}
          articleConfig={articleConfig}
        >
          <pre>
            <code>{token.content}</code>
          </pre>
        </CodeBlock>
      )
      codeIndex += 1
      i += 1
      continue
    }

    i += 1
  }

  return nodes
}

export default function MarkdownContent({
  content,
  figures,
  codeBlocks,
  tables = {},
  articlePresentation,
  articleConfig,
  scrollMarginTopPx,
}: MarkdownContentProps) {
  const tokens = parseMarkdown(content)
  return <>{buildNodes(tokens, figures, codeBlocks, tables, articlePresentation, articleConfig, scrollMarginTopPx)}</>
}
