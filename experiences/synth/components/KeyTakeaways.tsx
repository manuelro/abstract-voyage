type KeyTakeawaysProps = {
  items?: string[] | null
}

export default function KeyTakeaways({ items }: KeyTakeawaysProps) {
  if (!items || items.length === 0) return null
  return (
    <section className="mt-6 rounded-md border border-white/10 bg-white/5 p-4 text-sm text-slate-100/90">
      <div className="mb-2 text-xs uppercase tracking-wide text-white/60">Key takeaways</div>
      <ul className="list-disc pl-4 space-y-1">
        {items.slice(0, 5).map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  )
}
