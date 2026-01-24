import { useEffect } from 'react'

type ImageModalProps = {
  open: boolean
  src: string
  alt: string
  onClose: () => void
}

export default function ImageModal({ open, src, alt, onClose }: ImageModalProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div className="max-h-[90vh] max-w-[90vw]" onClick={(event) => event.stopPropagation()}>
        <img src={src} alt={alt} className="h-auto max-h-[90vh] w-auto max-w-[90vw] rounded-md" />
        <button
          type="button"
          className="mt-3 text-xs uppercase tracking-wide text-white/60 hover:text-white"
          onClick={onClose}
        >
          Close
        </button>
      </div>
    </div>
  )
}
