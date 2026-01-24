import { ReactNode, useCallback, useMemo, useState } from 'react'

type CodeBlockProps = {
  id?: string
  children: ReactNode
  language?: string | null
  code?: string
  html?: string | null
}

const extractText = (node: ReactNode): string => {
  if (node == null) return ''
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(extractText).join('')
  if (typeof node === 'object' && 'props' in node) {
    const props = (node as { props?: { children?: ReactNode } }).props
    return extractText(props?.children)
  }
  return ''
}

export default function CodeBlock({ id, children, language, code, html }: CodeBlockProps) {
  const [copied, setCopied] = useState(false)
  const content = useMemo(() => (code && code.trim() ? code : extractText(children)), [code, children])
  const label = language ? language.toUpperCase() : 'CODE'

  const onCopy = useCallback(async () => {
    if (!content) return
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(content)
      } else {
        const textarea = document.createElement('textarea')
        textarea.value = content
        textarea.setAttribute('readonly', 'true')
        textarea.style.position = 'absolute'
        textarea.style.left = '-9999px'
        document.body.appendChild(textarea)
        textarea.select()
        document.execCommand('copy')
        document.body.removeChild(textarea)
      }
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1200)
    } catch {
      setCopied(false)
    }
  }, [content])

  return (
    <div id={id} className="group relative my-6 scroll-mt-24 overflow-hidden rounded-lg bg-slate-950/30 text-slate-100 shadow-sm" tabIndex={-1}>
      <div className="flex items-center justify-between gap-3 px-3 py-2 text-[10px] uppercase tracking-[0.2em] text-white/60">
        <span>{label}</span>
        <button
          type="button"
          onClick={onCopy}
          className="rounded-md px-2 py-1 text-[10px] text-white/70 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-white/60"
        >
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <div className="codeblock-content overflow-x-auto p-4 text-xs leading-relaxed [font-variant-ligatures:none]">
        {html ? (
          <div
            className="shiki-code"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        ) : (
          children
        )}
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
          font-size: 0.75rem;
          line-height: 1.6;
          background: transparent !important;
          padding: 0 !important;
        }
      `}</style>
    </div>
  )
}
