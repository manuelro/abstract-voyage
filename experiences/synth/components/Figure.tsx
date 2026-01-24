import { useState } from 'react'
import ImageModal from './ImageModal'

type FigureProps = {
  id: string
  src: string
  alt: string
  caption?: string | null
}

export default function Figure({ id, src, alt, caption }: FigureProps) {
  const [open, setOpen] = useState(false)

  return (
    <figure id={id} className="my-6 scroll-mt-24" tabIndex={-1}>
      {/* figure id is generated in getStaticProps and applied here for TOC anchors */}
      <img src={src} alt={alt} className="h-auto max-w-full rounded-md border border-white/10" />
      <div className="mt-2 flex items-center justify-between text-xs text-white/60">
        {caption ? <figcaption>{caption}</figcaption> : <span />}
        <button
          type="button"
          className="uppercase tracking-wide text-white/60 hover:text-white"
          onClick={() => setOpen(true)}
        >
          Expand
        </button>
      </div>
      <ImageModal open={open} src={src} alt={alt} onClose={() => setOpen(false)} />
    </figure>
  )
}
