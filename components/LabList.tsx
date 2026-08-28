import { Fragment, type ReactNode } from 'react'
import Link from 'next/link'
import LabCard from './LabCard'
import { SectionHeading } from './SectionHeading'
import type { SectionHeadingConfig } from './SectionHeading.config'
import type { LabSummary } from '../helpers/labContent'

export type LabListCardRenderProps = {
  lab: LabSummary
  index: number
  count: number
  containerBg?: string
  className?: string
}

export type LabListProps = {
  labs: LabSummary[]
  title?: string
  showViewAll?: boolean
  /** Forwarded to SectionHeading — when provided, the heading uses the same
   *  config and styling as the journal section heading above. */
  headingConfig?: Partial<SectionHeadingConfig>
  /** CSS color of the section background forwarded to each LabCard so the
   *  gradient blends flush with the page surface at rest. */
  containerBg?: string
  /** Card min-width in px for `repeat(auto-fill, minmax(…, 1fr))`. When
   *  provided (driven from the same dockLayoutConfig as the journal cards),
   *  overrides the default Tailwind responsive columns. */
  cardWidthPx?: number
  /** Horizontal gap between grid columns in px. Used together with cardWidthPx. */
  columnGapPx?: number
  /** Vertical gap between grid rows in px. Used together with cardWidthPx. */
  rowGapPx?: number
  /** Tailwind border-radius class forwarded to each LabCard (e.g. 'rounded-lg').
   *  Matches dockLayoutConfig.cardRadius so lab and journal cards stay identical. */
  cardRadius?: string
  /** Optional card renderer for experience-specific surfaces. It replaces only
   *  the card element; LabList continues to own the exact same heading and
   *  grid, so opting in cannot introduce a second layout system. */
  renderCard?: (props: LabListCardRenderProps) => ReactNode
}

export default function LabList({
  labs,
  title = 'Labs',
  showViewAll,
  headingConfig,
  containerBg,
  cardWidthPx,
  columnGapPx,
  rowGapPx,
  cardRadius,
  renderCard,
}: LabListProps) {
  const gridStyle = cardWidthPx !== undefined
    ? {
        display: 'grid',
        // Fixed column width — cards never stretch wider than cardWidthPx,
        // matching the article cards' fixed-width scattered layout exactly.
        // min(…, 100%) is the narrow-viewport fallback: when a single card
        // would overflow (cardWidthPx > container width), the column shrinks
        // to 100% of the container rather than triggering horizontal scroll.
        gridTemplateColumns: `repeat(auto-fill, minmax(min(${cardWidthPx}px, 100%), ${cardWidthPx}px))`,
        columnGap: columnGapPx !== undefined ? `${columnGapPx}px` : undefined,
        rowGap: rowGapPx !== undefined ? `${rowGapPx}px` : undefined,
      }
    : undefined

  const gridClassName = cardWidthPx !== undefined
    ? undefined
    : 'grid gap-3 sm:grid-cols-2 lg:grid-cols-3'

  return (
    <div>
      <div className="flex items-center justify-between">
        <SectionHeading config={headingConfig}>
          {title}
        </SectionHeading>
        {showViewAll && (
          <Link
            href="/labs"
            className="text-xs font-medium text-gray-500 transition-colors hover:text-gray-300"
          >
            View all →
          </Link>
        )}
      </div>
      <div className={gridClassName} style={gridStyle}>
        {labs.map((lab, index) => (
          <Fragment key={lab.slug}>
            {renderCard ? renderCard({
              lab,
              index,
              count: labs.length,
              containerBg,
              className: cardRadius,
            }) : (
              <LabCard
                slug={lab.slug}
                title={lab.title}
                excerpt={lab.excerpt}
                tech={lab.tech}
                date={lab.date}
                formattedDate={lab.formattedDate}
                containerBg={containerBg}
                className={cardRadius}
              />
            )}
          </Fragment>
        ))}
      </div>
    </div>
  )
}
