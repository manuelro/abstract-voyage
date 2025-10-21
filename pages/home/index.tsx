import dynamic from 'next/dynamic'
import React, { useEffect, useMemo, useState, useLayoutEffect } from 'react'
import { animate, stagger as motionStagger } from 'motion'
import NavBarLite from '../../experiences/sphere/NavBarLite'
import SiteFooterLite from '../../experiences/sphere/SiteFooterLite'
const ClientOnlySphere = dynamic(() => import('../../experiences/sphere/Sphere'), { ssr: false })
import { CONFIG, ORCHESTRATION } from '../../experiences/sphere/Sphere.config'
import fs from 'fs'
import matter from 'gray-matter'
import { formatDate } from 'components/helpers/date'
import { loadSlidesFromPosts } from '../../experiences/sphere/slidesFromPosts'
import { buildIntroFlow } from '../../experiences/sphere/intro'

import {
  bgStops,                        // ← three background colors — hvle
} from '../../config/experienceMotion'

const stops = bgStops() // { top, mid, bottom } — hvle

const GOLDEN = (1 + Math.sqrt(5)) / 2

function runTimeline(steps: Array<[Element | Element[] | NodeListOf<Element>, any, any]>) {
  const animations: any[] = []
  for (const [targets, keyframes, optsRaw] of steps) {
    const opts = { ...(optsRaw || {}) }
    const atSec = typeof (opts as any).at === 'number' ? (opts as any).at : 0
    delete (opts as any).at
    const origDelay = opts.delay
    if (typeof origDelay === 'function') opts.delay = (i: number, total: number) => atSec + origDelay(i, total)
    else opts.delay = atSec + (origDelay || 0)
    animations.push(animate(targets as any, keyframes, opts))
  }
  return {
    cancel: () => animations.forEach(a => a?.cancel?.()),
    finished: Promise.all(animations.map(a => a?.finished).filter(Boolean)).then(() => {})
  }
}

function awaitSphereReady(stageSel: string, textSels: string[], timeoutMs: number) {
  const getNow = () => {
    const stage = document.querySelector(stageSel) as HTMLElement | null
    const hasCanvas = !!stage?.querySelector('canvas')
    const textNodes = Array.from(new Set(textSels.flatMap(sel => Array.from(document.querySelectorAll(sel))))) as HTMLElement[]
    return { stage, hasCanvas, textNodes }
  }
  return new Promise<{ stage: HTMLElement | null; textNodes: HTMLElement[] }>((resolve) => {
    const first = getNow()
    if (first.stage && first.hasCanvas) { resolve({ stage: first.stage, textNodes: first.textNodes }); return }
    let settled = false
    const obs = new MutationObserver(() => {
      if (settled) return
      const cur = getNow()
      if (cur.stage && cur.hasCanvas) { settled = true; obs.disconnect(); resolve({ stage: cur.stage, textNodes: cur.textNodes }) }
    })
    obs.observe(document.documentElement, { childList: true, subtree: true })
    const to = window.setTimeout(() => {
      if (!settled) { settled = true; obs.disconnect(); const cur = getNow(); resolve({ stage: cur.stage, textNodes: cur.textNodes }) }
    }, timeoutMs)
    window.addEventListener('beforeunload', () => { if (!settled) { settled = true; obs.disconnect(); window.clearTimeout(to) } })
  })
}

export default function HomePage({ posts, slidesData }: { posts: any[], slidesData: any[] }) {
  const [vw, setVw] = useState(0)
  const [vh, setVh] = useState(0)
  const [showHeader, setShowHeader] = useState(false)
  const [showFooter, setShowFooter] = useState(false)

  const FLOW = useMemo(() => buildIntroFlow({ CONFIG, ORCHESTRATION, GOLDEN }), [])

  useLayoutEffect(() => {
    const style = document.createElement('style')
    style.id = FLOW.prehideStyleTagId
    style.textContent = FLOW.prehideCss
    document.head.appendChild(style)
    return () => { style.remove() }
  }, [FLOW.prehideCss, FLOW.prehideStyleTagId])

  useEffect(() => {
    const measure = () => { setVw(window.innerWidth || 0); setVh(window.innerHeight || 0) }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [])

  const sphereDiameterPx = useMemo(() => (vw && vh ? Math.min(vw, vh) / GOLDEN : 0), [vw, vh])
  const footerTopPx = useMemo(() => (!vh || !sphereDiameterPx ? undefined : 0.75 * vh + 0.25 * sphereDiameterPx), [vh, sphereDiameterPx])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches

    const start = async () => {
      const t0 = performance.now()

      const { stage, textNodes: initialTextNodes } = await awaitSphereReady(
        FLOW.selectors.sphereStage,
        FLOW.selectors.sphereTextTargets,
        FLOW.tokens.gateTimeoutMs
      )

      const header = document.querySelector(FLOW.selectors.header) as HTMLElement | null
      const logo = document.querySelector(FLOW.selectors.headerLogo) as HTMLElement | null
      const links = Array.from(document.querySelectorAll(FLOW.selectors.headerLinks)) as HTMLElement[]
      const footer = document.querySelector(FLOW.selectors.footerRoot) as HTMLElement | null
      const footerLine1 = document.querySelector(FLOW.selectors.footerLine1) as HTMLElement | null
      const footerLine2 = document.querySelector(FLOW.selectors.footerLine2) as HTMLElement | null

      if (stage) {
        for (const el of Array.from(stage.querySelectorAll('div')) as HTMLElement[]) {
          if (el.style.getPropertyValue('--arw-start')) { el.style.display = 'none'; el.setAttribute('aria-hidden', 'true') }
        }
      }

      if (header) header.style.opacity = '0'
      if (footer) footer.style.opacity = '0'

      if (prefersReducedMotion) {
        if (stage) { stage.style.opacity = '1'; stage.style.transform = 'none' }
        if (header) header.style.opacity = '1'
        if (footer) footer.style.opacity = '1'
        if (footerLine2) footerLine2.style.opacity = '0'
        if (footerLine1) footerLine1.style.opacity = '1'
        setShowHeader(true); setShowFooter(true)
        return
      }

      const steps = FLOW.buildSteps({
        stage,
        textNodes: initialTextNodes || [],
        header,
        logo,
        links,
        footer,
        footerLine1,
        footerLine2,
      })

      const tl = runTimeline(steps)
      const tChrome = window.setTimeout(() => { setShowHeader(true); setShowFooter(true) }, FLOW.anchors.chromeStart)

      let textObs: MutationObserver | null = null
      if (!initialTextNodes || initialTextNodes.length === 0) {
        textObs = new MutationObserver(() => {
          const nodes = Array.from(new Set(
            FLOW.selectors.sphereTextTargets.flatMap(sel => Array.from(document.querySelectorAll(sel)))
          )) as HTMLElement[]
          if (nodes.length === 0) return
          nodes.forEach(n => { (n as HTMLElement).style.opacity = '0' })

          const elapsedMs = performance.now() - t0
          const remainingMs = Math.max(0, FLOW.anchors.textStart - elapsedMs)

          animate(
            nodes as any,
            { opacity: [0, 1], transform: ['translateY(6px)', 'translateY(0px)'] },
            {
              duration: (CONFIG.behavior.carouselFade.durationMs || 0) / 1000,
              delay: motionStagger((FLOW.tokens.textStaggerMs || 0) / 1000, { start: remainingMs / 1000 }),
              easing: FLOW.tokens.textEase,
            }
          )

          textObs?.disconnect()
          textObs = null
        })
        textObs.observe(document.documentElement, { childList: true, subtree: true })
      }

      return () => { tl?.cancel?.(); window.clearTimeout(tChrome); textObs?.disconnect() }
    }

    start()
  }, [FLOW])

  return (
    <>
      <NavBarLite
        brand={{ href: '/', logoSrc: '/logo-white.svg', label: 'Sota' }}
        links={[
          { href: '/posts', label: 'Posts' },
          { href: '/visuals', label: 'Visuals' },
          { href: '/', label: 'Classic' } // ← switch (ALWAYS last)
        ]}
        style={{
          opacity: showHeader ? 1 : 0,
          transition: `opacity ${FLOW.tokens.logoFadeMs}ms ${FLOW.tokens.ease}`,
          willChange: 'opacity'
        }}
      />
       
      <ClientOnlySphere
        slidesData={slidesData}
        gradientStops={stops}              /* top/mid/bottom; Sphere stage is transparent */
      />


      <SiteFooterLite
        mode="midgap"
        style={{
          ['--footer-top' as any]: footerTopPx ? `${footerTopPx}px` : undefined,
          opacity: showFooter ? 1 : 0,
          transition: `opacity ${FLOW.tokens.footerFadeMs}ms ${FLOW.tokens.ease}`,
          willChange: 'opacity'
        } as React.CSSProperties}
        yearPrefix={`© ${new Date().getFullYear()} `}
      />
    </>
  )
}

export async function getStaticProps() {
  const files = fs.readdirSync('posts')

  const posts = files.map((fileName) => {
    const slug = fileName.replace('.md', '')
    const date = fileName.split('_')[0]
    const readFile = fs.readFileSync(`posts/${fileName}`, 'utf-8')
    const { data: frontmatter } = matter(readFile)
    console.log({frontmatter})
    return { slug, date, formattedDate: formatDate(date), frontmatter }
  }).sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0)).reverse()

  const slidesData = loadSlidesFromPosts()

  return { props: { posts, slidesData } }
}
