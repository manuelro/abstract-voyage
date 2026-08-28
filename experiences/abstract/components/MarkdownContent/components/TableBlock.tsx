import type { MarkdownContentConfig } from '../config/registered'
import type { MarkdownContentPresentation, TableData } from '../types'

type TableBlockProps = {
  table: TableData
  articlePresentation?: MarkdownContentPresentation
  articleConfig?: MarkdownContentConfig
}

export default function TableBlock({ table, articlePresentation, articleConfig }: TableBlockProps) {
  const presentationStyle = articlePresentation && articleConfig ? {
    color: articlePresentation.bodyInk,
  } : undefined
  const rowStyle = articlePresentation && articleConfig ? {
    borderColor: articlePresentation.dividerInk,
  } : undefined
  return (
    <div
      className={[
        'not-prose overflow-x-auto',
        articleConfig?.richBlockMarginY ?? 'my-6',
        articleConfig?.tableFontSize,
        articleConfig?.tableLeading,
        articleConfig?.tableFontFamily === 'inherit' ? '' : articleConfig?.tableFontFamily,
      ].filter(Boolean).join(' ')}
      style={presentationStyle}
    >
      {table.title ? (
        <div className="mb-2 text-xs uppercase tracking-[0.2em] text-white/60" style={{ color: articlePresentation?.mutedInk }}>
          {table.title}
        </div>
      ) : null}
      <table className="w-full min-w-[520px] border-collapse text-left text-sm text-slate-100/90" style={{ color: articlePresentation?.bodyInk }}>
        <thead>
          <tr className="border-b border-white/10 text-white/80" style={{ ...rowStyle, color: articlePresentation?.headingInk }}>
            {table.headers.map((header, index) => (
              <th key={`${header}-${index}`} className={[articleConfig?.tableRowPaddingY ?? 'py-2', 'pr-4 font-semibold last:pr-0'].join(' ')}>
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className={articlePresentation ? '' : 'divide-y divide-white/10'}>
          {table.rows.map((row, rowIndex) => (
            <tr
              key={`row-${rowIndex}`}
              className={articlePresentation ? 'border-t' : undefined}
              style={rowStyle}
            >
              {row.map((cell, cellIndex) => (
                <td key={`cell-${rowIndex}-${cellIndex}`} className={[articleConfig?.tableRowPaddingY ?? 'py-2', 'pr-4 last:pr-0'].join(' ')}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
          {table.footer ? (
            <tr
              className={articlePresentation ? 'border-t' : 'text-white/80'}
              style={{ ...rowStyle, color: articlePresentation?.headingInk }}
            >
              {table.footer.map((cell, cellIndex) => (
                <td key={`footer-${cellIndex}`} className={[articleConfig?.tableRowPaddingY ?? 'py-2', 'pr-4 font-semibold last:pr-0'].join(' ')}>
                  {cell}
                </td>
              ))}
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  )
}
