type TableData = {
  title?: string
  headers: string[]
  rows: string[][]
  footer?: string[]
}

type TableBlockProps = {
  table: TableData
}

export default function TableBlock({ table }: TableBlockProps) {
  return (
    <div className="not-prose my-6 overflow-x-auto">
      {table.title ? (
        <div className="mb-2 text-xs uppercase tracking-[0.2em] text-white/60">
          {table.title}
        </div>
      ) : null}
      <table className="w-full min-w-[520px] border-collapse text-left text-sm text-slate-100/90">
        <thead>
          <tr className="border-b border-white/10 text-white/80">
            {table.headers.map((header, index) => (
              <th key={`${header}-${index}`} className="py-2 pr-4 font-semibold last:pr-0">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/10">
          {table.rows.map((row, rowIndex) => (
            <tr key={`row-${rowIndex}`}>
              {row.map((cell, cellIndex) => (
                <td key={`cell-${rowIndex}-${cellIndex}`} className="py-2 pr-4 last:pr-0">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
          {table.footer ? (
            <tr className="text-white/80">
              {table.footer.map((cell, cellIndex) => (
                <td key={`footer-${cellIndex}`} className="py-2 pr-4 font-semibold last:pr-0">
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
