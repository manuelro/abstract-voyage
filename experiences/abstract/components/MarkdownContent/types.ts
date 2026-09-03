export type FigureMeta = {
  id: string
  src?: string
  alt: string
  caption?: string | null
}

export type CodeBlockMeta = {
  html: string
  language: string | null
  code: string
}

export type TableData = {
  title?: string
  headers: string[]
  rows: string[][]
  footer?: string[]
}

export type MarkdownContentPresentation = {
  surfaceColor: string
  bodyInk: string
  headingInk: string
  mutedInk: string
  metadataInk: string
  linkInk: string
  strongInk: string
  dividerInk: string
  figureBorderInk: string
  codeSurface: string
  codeInk: string
}
