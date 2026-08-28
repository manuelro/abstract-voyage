export type HeadingItem = {
  id: string
  text: string
  level: number
}

export type FigureItem = {
  id: string
  src?: string
  caption?: string | null
  alt: string
}

export type ArticleOutlineVisibilityOptions = {
  headings: ReadonlyArray<HeadingItem>
  figures: ReadonlyArray<FigureItem>
  tocEnabled?: boolean
  tocHeadingsEnabled?: boolean
  tocFiguresEnabled?: boolean
  tocMinHeadings?: number
  tocMinFigures?: number
}

export function resolveArticleOutlineVisible({
  headings,
  figures,
  tocEnabled = true,
  tocHeadingsEnabled = true,
  tocFiguresEnabled = true,
  tocMinHeadings = 2,
  tocMinFigures = 1,
}: ArticleOutlineVisibilityOptions): boolean {
  const showHeadings = tocEnabled && tocHeadingsEnabled && headings.length >= tocMinHeadings
  const showFigures = tocEnabled && tocFiguresEnabled && figures.length >= tocMinFigures
  return tocEnabled && (showHeadings || showFigures)
}

export function selectCurrentOutlineTarget(
  targets: ReadonlyArray<{ id: string; top: number }>,
  currentSectionLinePx: number,
) {
  if (!targets.length) return null
  const orderedTargets = [...targets].sort((a, b) => a.top - b.top)
  const lastReachedTarget = orderedTargets
    .filter(target => target.top <= currentSectionLinePx)
    .at(-1)
  return lastReachedTarget?.id ?? orderedTargets[0].id
}
