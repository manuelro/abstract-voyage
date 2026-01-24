type TocTriggerProps = {
  onClick: () => void
  isOpen: boolean
}

export default function TocTrigger({ onClick, isOpen }: TocTriggerProps) {
  return (
    <button
      type="button"
      className="mt-4 inline-flex items-center gap-2 text-xs uppercase tracking-wide text-white/70 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-white/60 lg:hidden"
      aria-expanded={isOpen}
      aria-controls="article-toc-panel"
      onClick={onClick}
    >
      On this page
    </button>
  )
}
