import MarkdownIt from 'markdown-it'

const markdown = new MarkdownIt({
  html: false,
  linkify: true,
})

export const parseMarkdown = (content: string) => markdown.parse(content, {})

export const renderMarkdownInline = (value: string) => ({
  __html: markdown.renderInline(value),
})

export const slugifyMarkdownHeading = (value: string) => value
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/(^-|-$)/g, '')

export const extractMarkdownTableKey = (value: string) => {
  const match = value.match(/table:([a-z0-9-]+)/i)
  return match ? match[1].toLowerCase() : null
}
