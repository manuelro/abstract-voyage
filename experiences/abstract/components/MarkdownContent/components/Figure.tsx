import { useState } from 'react'
import ImageModal from './ImageModal'
import type { MarkdownContentConfig } from '../config/registered'
import type { MarkdownContentPresentation } from '../types'

type FigureProps = {
  id: string
  src: string
  alt: string
  caption?: string | null
  articlePresentation?: MarkdownContentPresentation
  articleConfig?: MarkdownContentConfig
}

export default function Figure({ id, src, alt, caption, articlePresentation, articleConfig }: FigureProps) {
  const [open, setOpen] = useState(false)

  return (
    <figure
      id={id}
      className={[articleConfig?.richBlockMarginY ?? 'my-6', 'scroll-mt-24'].join(' ')}
      tabIndex={-1}
    >
      {/* figure id is generated in getStaticProps and applied here for TOC anchors */}
      <img
        src={src}
        alt={alt}
        className={[
          'h-auto max-w-full border border-white/10',
          articleConfig?.figureRadius ?? 'rounded-md',
        ].join(' ')}
        style={articleConfig && articlePresentation ? {
          borderColor: articlePresentation.figureBorderInk,
        } : undefined}
      />
      <div
        className={[
          'mt-2 flex items-center justify-between text-white/60',
          articleConfig?.captionFontSize ?? 'text-xs',
          articleConfig?.captionFontFamily === 'inherit' ? '' : articleConfig?.captionFontFamily,
        ].join(' ')}
        style={articleConfig && articlePresentation ? {
          color: articlePresentation.mutedInk,
        } : undefined}
      >
        {caption ? <figcaption>{caption}</figcaption> : <span />}
        <button
          type="button"
          className="uppercase tracking-wide text-white/60 hover:text-white"
          onClick={() => setOpen(true)}
          style={articlePresentation ? { color: articlePresentation.linkInk } : undefined}
        >
          Expand
        </button>
      </div>
      <ImageModal open={open} src={src} alt={alt} onClose={() => setOpen(false)} />
    </figure>
  )
}
