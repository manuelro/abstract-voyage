import Link from 'next/link'

export default function Nav() {
  return (
    <nav className="pointer-events-auto fixed left-6 top-6 z-50 text-xs uppercase tracking-[0.25em] text-white/70">
      <Link href="/">Back</Link>
    </nav>
  )
}
