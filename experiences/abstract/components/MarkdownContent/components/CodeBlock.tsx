import { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { copyTextToClipboard, extractCodeText } from '../../../../../helpers/codeCopy'
import type { MarkdownContentConfig } from '../config/registered'
import type { MarkdownContentPresentation } from '../types'

type CodeBlockProps = {
  id?: string
  children: ReactNode
  language?: string | null
  code?: string
  html?: string | null
  articlePresentation?: MarkdownContentPresentation
  articleConfig?: MarkdownContentConfig
}

export default function CodeBlock({ id, children, language, code, html, articlePresentation, articleConfig }: CodeBlockProps) {
  const [copied, setCopied] = useState(false)
  const [hasOverflow, setHasOverflow] = useState(false)
  const [hasMoreInlineEnd, setHasMoreInlineEnd] = useState(false)
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const content = useMemo(() => (code && code.trim() ? code : extractCodeText(children)), [code, children])
  const label = language ? language.toUpperCase() : 'CODE'

  const updateOverflowState = useCallback(() => {
    const node = scrollRef.current
    if (!node) return
    const overflow = node.scrollWidth - node.clientWidth > 1
    const direction = window.getComputedStyle(node).direction
    const inlineProgress = direction === 'rtl' ? Math.abs(node.scrollLeft) : node.scrollLeft
    const atInlineEnd = inlineProgress + node.clientWidth >= node.scrollWidth - 1
    setHasOverflow(overflow)
    setHasMoreInlineEnd(overflow && !atInlineEnd)
  }, [])

  useEffect(() => {
    let active = true
    const node = scrollRef.current
    const observer = node && typeof ResizeObserver === 'function'
      ? new ResizeObserver(updateOverflowState)
      : null
    if (node && observer) {
      observer.observe(node)
      if (node.firstElementChild) observer.observe(node.firstElementChild)
    }
    const frameId = window.requestAnimationFrame(updateOverflowState)
    void document.fonts?.ready.then(() => {
      if (active) updateOverflowState()
    })
    window.addEventListener('resize', updateOverflowState)
    return () => {
      active = false
      window.cancelAnimationFrame(frameId)
      observer?.disconnect()
      window.removeEventListener('resize', updateOverflowState)
    }
  }, [content, updateOverflowState])

  const onCopy = useCallback(async () => {
    if (!content) return
    if (await copyTextToClipboard(content)) {
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1200)
      return
    }
    setCopied(false)
  }, [content])

  return (
    <div
      id={id}
      className={[
        'group relative scroll-mt-24 overflow-hidden bg-slate-950/30 text-slate-100 shadow-sm',
        articleConfig?.richBlockMarginY ?? 'my-6',
        articleConfig?.codeRadius ?? 'rounded-lg',
      ].join(' ')}
      tabIndex={-1}
      style={articleConfig && articlePresentation ? {
        background: articlePresentation.codeSurface,
        color: articlePresentation.codeInk,
      } : undefined}
    >
      <div className="flex items-center justify-between gap-3 px-3 py-2 text-[10px] uppercase tracking-[0.2em] text-white/60" style={{ color: articlePresentation?.mutedInk }}>
        <span>{label}</span>
        <button
          data-code-copy="true"
          type="button"
          onClick={onCopy}
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md px-2 py-1 text-[10px] text-white/70 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-white/60"
          style={{ color: articlePresentation?.linkInk }}
        >
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <div className="relative">
        <div
          ref={scrollRef}
          data-code-scroll-region="true"
          data-code-overflow={hasOverflow ? 'true' : 'false'}
          className={[
            'codeblock-content overflow-x-auto [font-variant-ligatures:none] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/60',
            articleConfig?.codePadding ?? 'p-4',
            articleConfig?.codeFontSize ?? 'text-xs',
            articleConfig?.codeLeading ?? 'leading-relaxed',
          ].join(' ')}
          aria-label={hasOverflow ? 'Scrollable code sample' : undefined}
          onScroll={updateOverflowState}
          tabIndex={hasOverflow ? 0 : -1}
        >
          {html ? (
            <div
              className="shiki-code"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          ) : (
            children
          )}
        </div>
        {hasMoreInlineEnd ? (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 right-0 w-10"
            data-code-overflow-cue="true"
            style={{
              background: `linear-gradient(to left, ${articlePresentation?.codeSurface ?? 'rgba(15, 23, 42, 0.96)'}, transparent)`,
            }}
          />
        ) : null}
      </div>
      <style jsx>{`
        /* Keep Shiki token colors intact by avoiding blanket text color on code spans. */
        .codeblock-content :global(pre) {
          margin: 0;
          background: transparent !important;
          border: 0 !important;
          box-shadow: none !important;
          outline: none !important;
          border-radius: 0 !important;
          padding: 0 !important;
        }
        .codeblock-content :global(code) {
          font-size: inherit;
          line-height: inherit;
          background: transparent !important;
          padding: 0 !important;
        }
      `}</style>
    </div>
  )
}
