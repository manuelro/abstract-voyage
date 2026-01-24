import MarkdownIt from 'markdown-it'
import type Token from 'markdown-it/lib/token'
import { ReactNode } from 'react'
import Figure from './Figure'
import CodeBlock from './CodeBlock'
import TableBlock from './TableBlock'

type FigureMeta = {
  id: string
  src?: string
  alt: string
  caption?: string | null
}

type MarkdownContentProps = {
  content: string
  figures: FigureMeta[]
  codeBlocks: CodeBlockMeta[]
  tables: Record<string, TableData>
}

type CodeBlockMeta = {
  html: string
  language: string | null
  code: string
}

type TableData = {
  title?: string
  headers: string[]
  rows: string[][]
  footer?: string[]
}

const md = new MarkdownIt({
  html: false,
  linkify: true,
})

const renderInline = (value: string) => ({ __html: md.renderInline(value) })

const findFigureBySrc = (figures: FigureMeta[], src: string) => figures.find((figure) => figure.src === src)

const slugify = (value: string) => value
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/(^-|-$)/g, '')

const extractTableKey = (value: string) => {
  const match = value.match(/table:([a-z0-9-]+)/i)
  return match ? match[1].toLowerCase() : null
}

const buildNodes = (
  tokens: Token[],
  figures: FigureMeta[],
  codeBlocks: CodeBlockMeta[],
  tables: Record<string, TableData>
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
      const id = token.attrGet('id') ?? slugify(text)
      nodes.push(
        <span
          key={`${id}-${i}`}
          id={id}
          className="block scroll-mt-24"
          tabIndex={-1}
        >
          {level === 'h2' ? (
            <h2 dangerouslySetInnerHTML={renderInline(text)} />
          ) : (
            <h3 dangerouslySetInnerHTML={renderInline(text)} />
          )}
        </span>
      )
      i += 3
      continue
    }

    if (token.type === 'html_block' || token.type === 'html_inline') {
      const key = extractTableKey(token.content)
      if (key) {
        if (tables[key]) {
          nodes.push(
            <TableBlock key={`table-${key}-${i}`} table={tables[key]} />
          )
        }
        i += 1
        continue
      }
    }

    if (token.type === 'paragraph_open') {
      const inlineToken = tokens[i + 1]
      const inlineContent = inlineToken?.content ?? ''
      const key = extractTableKey(inlineContent.trim())
      if (key) {
        if (tables[key]) {
          nodes.push(
            <TableBlock key={`table-${key}-${i}`} table={tables[key]} />
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
          />
        )
        figureIndex += 1
      } else {
        nodes.push(
          <p key={`p-${i}`} dangerouslySetInnerHTML={renderInline(inlineContent)} />
        )
      }
      i += 3
      continue
    }

    if (token.type === 'blockquote_open') {
      const inlineToken = tokens[i + 2]
      nodes.push(
        <blockquote key={`bq-${i}`} dangerouslySetInnerHTML={renderInline(inlineToken?.content ?? '')} />
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
            <li key={`li-${i}`} dangerouslySetInnerHTML={renderInline(inlineToken?.content ?? '')} />
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
        <CodeBlock key={`code-${i}`} language={language} code={code} html={html}>
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

export default function MarkdownContent({ content, figures, codeBlocks, tables = {} }: MarkdownContentProps) {
  const tokens = md.parse(content, {})
  return <>{buildNodes(tokens, figures, codeBlocks, tables)}</>
}
