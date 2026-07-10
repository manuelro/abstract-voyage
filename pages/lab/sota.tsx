import Link from 'next/link'
import SeoHead from '../../components/SeoHead'
import { SITE_METADATA } from '../../helpers/siteMetadata'
import SynthLayout from '../../experiences/synth/components/SynthLayout'
import SotaTracker from '../../experiences/synth/components/SotaTracker'

export default function SotaPage() {
  return (
    <SynthLayout
      controls={(
        <Link
          href="/"
          className="text-xs uppercase tracking-[0.18em] text-slate-200/55 transition-colors hover:text-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
        >
          Home
        </Link>
      )}
    >
      <SeoHead
        title={`State of the Art - ${SITE_METADATA.siteName}`}
        description="A compact reference of modern front-end framework capabilities tracked by Abstract Voyage."
        canonicalPath="/lab/sota"
        ogImagePath={SITE_METADATA.defaultOgImagePath}
      />

      <div className="py-8">
        <p className="text-xs uppercase tracking-[0.24em] text-slate-200/45">
          Lab
        </p>
        <h1 className="mt-5 max-w-[12ch] text-4xl font-semibold tracking-tight text-slate-50 md:text-6xl">
          State of the Art
        </h1>
        <p className="mb-12 mt-6 max-w-[54ch] text-base leading-relaxed text-slate-100/72 md:text-lg">
          A small framework capability map for agentic discovery and human reference.
        </p>

        <SotaTracker />
      </div>
    </SynthLayout>
  )
}
