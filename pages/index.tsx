// @ts-nocheck
import fs from 'fs'
import matter from 'gray-matter'
import Head from 'next/head'
import Script from 'next/script'
import Image from 'next/image'
import { useEffect, useLayoutEffect, useRef, useState } from 'react' // hvle
import dynamic from 'next/dynamic'

import List from '../components/List'
import { formatDate } from 'components/helpers/date'
import { PostType } from './posts/[slug]'
import NavBarLite from '../experiences/sphere/NavBarLite'
import { safeStorage } from '../helpers/safeStorage' // hvle

// --- Debug HUD for iOS persistence (enable via ?debugPersist=1 or window.__DEBUG_IOS_PERSIST__=true) — hvle
declare global { interface Window { __DEBUG_IOS_PERSIST__?: boolean } }

const getDebugFlag = () => {
  if (typeof window === 'undefined') return false
  if (window.__DEBUG_IOS_PERSIST__ === true) return true
  try {
    const qs = new URLSearchParams(window.location.search)
    if (qs.get('debugPersist') === '1') return true
    if (localStorage.getItem('debugPersist') === '1') return true
  } catch {}
  return process.env.NEXT_PUBLIC_DEBUG_IOS_PERSIST === '1'
}

let __persistPanel: HTMLElement | null = null
const ensurePersistPanel = () => {
  if (typeof document === 'undefined') return null
  if (!__persistPanel) {
    const el = document.createElement('pre')
    el.id = 'persist-debug'
    Object.assign(el.style, {
      position: 'fixed', bottom: '10px', left: '10px', right: '10px',
      maxHeight: '40vh', overflow: 'auto', padding: '10px',
      font: '12px/1.4 Menlo, Consolas, monospace',
      background: 'rgba(0,0,0,0.72)', color: '#0ff',
      zIndex: 99999, borderRadius: '8px', pointerEvents: 'auto',
      whiteSpace: 'pre-wrap', boxShadow: '0 4px 18px rgba(0,0,0,0.5)'
    } as any)
    el.textContent = '[persist] HUD ready. Triple-tap anywhere to hide/show.\n'
    document.body.appendChild(el)
    __persistPanel = el
  }
  return __persistPanel
}

const dlog = (...args: any[]) => {
  const active = getDebugFlag()
  if (!active) return
  try { console.debug('[persist]', ...args) } catch {}
  const el = ensurePersistPanel()
  if (el) {
    const ts = new Date().toISOString().split('T')[1]?.replace('Z','')
    const msg = args.map(a => {
      try { return typeof a === 'string' ? a : JSON.stringify(a) } catch { return String(a) }
    }).join(' ')
    el.textContent = (el.textContent || '') + `[${ts}] ${msg}\n`
    el.scrollTop = el.scrollHeight
  }
}

// Use layout effect on client, effect on server to avoid SSR warning — hvle
const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect

// Centralized motion + background config
import {
  experienceMotion as exp,
  tweenFn,
  fadeWatchdogMs,
  backgroundLayers,
} from '../config/experienceMotion'

const ClientOnlySphere = dynamic(() => import('../experiences/sphere/Sphere'), { ssr: false })

type PropsType = { posts: PostType[]; slidesData: any[] }
type SOTAType = { label: string; link: string }

export default function Home({ posts, slidesData }: PropsType) {
  // ---------- Classic markup helpers ----------
  const aStyle =
    'px-3 py-1 dark:border-transparent dark:hover:border-transparent dark:bg-slate-950 inline-block rounded text-slate-500 cursor-pointer dark:hover:bg-slate-800 transition-colors cursor-pointer bg-slate-50 hover:border-slate-300 hover:border border-solid border border-transparent hover:text-slate-800'
  const liStyle = 'pl-2 py-1'
  const [borderColor, setBorderColor] = useState('#020617')

  useEffect(() => {
    const mql = window.matchMedia('(prefers-color-scheme: dark)')
    const onMqlChange = (e: any) => setBorderColor(e.matches ? '#020617' : '#CBD5E1')
    mql.onchange = (e: any) => onMqlChange(e)
    onMqlChange(mql)
  }, [])

  const Tree = ({ title, version, items }: { title: string; version: string; items: SOTAType[] }) => (
    <ul className="text-white tech">

      {/* Pre-hydration mode snap (static & iOS-safe) — hvle */}
      <Script id="exp-mode-snap" strategy="beforeInteractive">
        {`(function(){
          try {
            // 1) Read from query (?mode=..) OR hash (#mode=..); query wins, then hash — hvle
            var params = new URLSearchParams(location.search);
            var fromQuery = params.get('mode'); // "immersive" | "classic" | null
            var fromHash  = (location.hash.match(/mode=(immersive|classic)/)||[])[1] || null;
            var picked = (fromQuery === 'immersive' || fromQuery === 'classic') ? fromQuery
                       : (fromHash  === 'immersive' || fromHash  === 'classic') ? fromHash
                       : null;

            // 2) Otherwise fallback to storage/cookie — hvle
            var saved = picked;
            if (!saved) {
              try { saved = localStorage.getItem('experienceMode') || saved } catch(e){}
              if (!saved) {
                try {
                  var m = document.cookie.match(/(?:^|;\\s*)experienceMode=([^;]+)/);
                  if (m) saved = m[1];
                } catch(e){}
              }
            }

            // 3) Apply early (no flicker) — hvle
            var cls = saved === 'immersive' ? 'exp-imm' : (saved === 'classic' ? 'exp-cla' : null);
            if (cls) {
              document.documentElement.setAttribute('data-experience', saved);
              document.documentElement.classList.add(cls);
            }

            // 4) Best-effort persist for future loads — hvle
            if (saved) {
              try { localStorage.setItem('experienceMode', saved) } catch(e){}
              try {
                var maxAge = 60*60*24*365;
                var secure = (window.isSecureContext === true) ? '; Secure' : '';
                document.cookie = 'experienceMode=' + encodeURIComponent(saved) + '; Path=/; Max-Age=' + maxAge + '; SameSite=Lax' + secure;
              } catch(e){}
            }

            // 5) Clean URL: remove ?mode=.. and/or #mode=.., keep other params — hvle
            if (fromQuery || fromHash) {
              try {
                if (fromQuery) { params.delete('mode'); }
                var qs = params.toString();
                var clean = location.pathname + (qs ? ('?' + qs) : '');
                history.replaceState(null, '', clean); // removes both query "mode" and any hash
              } catch(e){}
            }
          } catch(e){}
        })();`}
      </Script>

      <Head>
        {/* Minimal CSS so the right layer is visible on the very first frame — hvle */}
        <style>{`
          :root[data-experience="immersive"] #immersive-root { opacity: 1 !important; }
          :root[data-experience="immersive"] #classic-root   { opacity: 0 !important; }
          :root[data-experience="classic"]   #classic-root   { opacity: 1 !important; }
          :root[data-experience="classic"]   #immersive-root { opacity: 0 !important; }
        `}</style>
      </Head>

      <style jsx>{`
        .version { opacity: 0; }
        .tech:hover .version { opacity: 1; }
        .list li { position: relative; }
        .list:before {
          position: absolute; top: 0px; left: 0px; content: ''; display: block;
          height: calc(100% - 15px); width: 8px; border-style: solid;
          border-color: ${borderColor}; border-width: 0px 0px 1px 1px; border-radius: 0px 0px 0px 6px;
        }
        .list li:before {
          position: absolute; top: 50%; left: -8px; content: ''; display: block;
          height: 1px; width: 8px; border-style: solid; border-color: ${borderColor}; border-width: 1px 0px 0px 0px;
        }
        .list li:last-of-type:before { display: none; }
      `}</style>

      <div>
        <label className="text-sm text-slate-900 dark:text-slate-50">{title}</label>
        <span className="version transition-opacity font-mono text-xs bg-slate-50 rounded px-2 py-1 text-slate-500 ml-2 dark:text-slate-300 dark:bg-slate-950">
          v{version}.0
        </span>
      </div>

      <li className="text-xs pl-3 pt-3">
        <label className="pl-4 pt-4 pb-2 border-l dark:border-l-slate-950 border-l-slate-300 block text-slate-900 dark:text-slate-50 hidden">
          Hooks
        </label>

        <ul className="list relative pl-2">
          {items.map(({ label, link }) => (
            <li key={label} className={liStyle}>
              <a className={aStyle} href={link} target="_blank" rel="noreferrer">{label}</a>
            </li>
          ))}
        </ul>
      </li>
    </ul>
  )

  // ---------- mode + sequential fades ----------
  type Mode = 'classic' | 'immersive'
  const [mode, setMode] = useState<Mode>('classic') // SSR default
  // Persist selection on every mode change (covers all toggle paths) — hvle

  // Extra safety: write-through on state changes too (diagnostic breadcrumbs) — hvle
  useEffect(() => {
    dlog('mode effect -> persist', { mode })
    safeStorage.set('experienceMode', mode)
  }, [mode])

  useEffect(() => {
    safeStorage.set('experienceMode', mode)
  }, [mode])

  const [classicOpacity, setClassicOpacity] = useState(1)
  const [immersiveOpacity, setImmersiveOpacity] = useState(0)
  const [classicZ, setClassicZ] = useState(exp.z.front)
  const [immersiveZ, setImmersiveZ] = useState(exp.z.back)
  const [switchDisabled, setSwitchDisabled] = useState(false)
  const [animate, setAnimate] = useState(true)
  const [transitioningTo, setTransitioningTo] = useState<Mode | null>(null)
  const [seqPhase, setSeqPhase] = useState<'idle' | 'fadeOut' | 'fadeIn'>('idle')

  // sphere dissolve controller (0=3D opaque, 1=flat+invisible)
  const [dissolveProgress, setDissolveProgress] = useState(1) // start in classic ⇒ sphere dissolved
  const dissolveRafRef = useRef<number | null>(null)

  // Watchdog for cases where CSS transitionend doesn't fire (e.g., 0ms)
  const outGuardRef = useRef<number | null>(null)
  const clearOutGuard = () => { if (outGuardRef.current != null) { clearTimeout(outGuardRef.current); outGuardRef.current = null } }
  const scheduleOutGuard = (cb: () => void) => {
    clearOutGuard()
    const ms = fadeWatchdogMs(animate)
    outGuardRef.current = window.setTimeout(() => {
      outGuardRef.current = null
      if (seqPhase === 'fadeOut') cb()
    }, ms)
  }

  const immersiveRef = useRef<HTMLDivElement>(null)
  const classicRef = useRef<HTMLDivElement>(null)

  // ---------- PRE-PAINT SNAP & CLASS CLEANUP ----------
  useIsomorphicLayoutEffect(() => { // hvle: avoid SSR warning
    // Prefer ?mode=.., then #mode=.., then storage — hvle
    const fromQuery =
      typeof window !== 'undefined'
        ? (new URLSearchParams(window.location.search).get('mode') as Mode | null)
        : null
    const fromHash =
      typeof window !== 'undefined'
        ? (window.location.hash.match(/mode=(immersive|classic)/)?.[1] as Mode | null)
        : null
    const fromAttr =
      typeof document !== 'undefined'
        ? (document.documentElement.getAttribute('data-experience') as Mode | null)
        : null // hvle

    // Diagnostics visible on-phone — hvle
    const secure = typeof window !== 'undefined' && window.isSecureContext
    const origin = typeof location !== 'undefined' ? location.origin : ''
    const hash = typeof window !== 'undefined' ? window.location.hash : ''
    let lsProbe: string | null | `!err:${string}` = null
    try { lsProbe = typeof window !== 'undefined' ? window.localStorage.getItem('experienceMode') : null } catch (e: any) { lsProbe = `!err:${e?.name||'unknown'}` }
    const cookieHas = typeof document !== 'undefined' ? document.cookie.includes('experienceMode=') : false
    dlog('prepaint env', { origin, secure, hash, lsProbe, cookieHas })

    const saved = (fromQuery ?? fromHash ?? fromAttr ?? (safeStorage.get('experienceMode') as Mode | null)) as Mode | null // hvle
    if (fromQuery) { try { safeStorage.set('experienceMode', fromQuery) } catch {} } // persist query choice

    dlog('prepaint saved', { saved }) // hvle
    const root = typeof document !== 'undefined' ? document.documentElement : null

    if (saved === 'immersive') {
      // Snap (no fade) to immersive before enabling animations
      setAnimate(false)
      setMode('immersive')
      setClassicOpacity(0)
      setImmersiveOpacity(1)
      setClassicZ(exp.z.back)
      setImmersiveZ(exp.z.front)
      setDissolveProgress(0) // sphere fully visible

      // Next frame: re-enable animations for future toggles and remove pre-paint class/attr
      requestAnimationFrame(() => {
        setAnimate(true)
        root?.classList.remove('exp-imm', 'exp-cla')
        root?.removeAttribute('data-experience') // hvle
      })
    } else if (saved === 'classic') {
      // Snap to classic, remove pre-paint classes/attr ASAP
      requestAnimationFrame(() => {
        root?.classList.remove('exp-imm', 'exp-cla')
        root?.removeAttribute('data-experience') // hvle
      })
    } else {
      // Default classic; ensure pre-paint class/attr are removed ASAP (no fade)
      requestAnimationFrame(() => {
        root?.classList.remove('exp-imm', 'exp-cla')
        root?.removeAttribute('data-experience') // hvle
      })
    }

    // Extra diagnostics
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent : ''
    const cookiePreview = typeof document !== 'undefined'
      ? (document.cookie.includes('experienceMode=') ? 'present' : 'absent')
      : 'n/a'
    dlog('prepaint', { origin, secure, hash, ua, lsProbe, cookie: cookiePreview })
    dlog('prepaint:getSavedMode()', { saved }) // hvle
  }, [])

  // Debug HUD init (client-only, no SSR side effects) — hvle
  useEffect(() => {
    if (!getDebugFlag()) return
    ensurePersistPanel()
    try {
      dlog('HUD active', {
        ua: typeof navigator !== 'undefined' ? navigator.userAgent : 'n/a',
        origin: typeof location !== 'undefined' ? location.origin : 'n/a',
        secure: typeof window !== 'undefined' ? window.isSecureContext : 'n/a',
      })
    } catch {}
    let taps: number[] = []
    const onTouchEnd = () => {
      const now = Date.now()
      taps = taps.filter(t => now - t < 600).concat(now)
      if (taps.length >= 3) {
        const el = ensurePersistPanel()
        if (el) el.style.display = el.style.display === 'none' ? 'block' : 'none'
        taps = []
      }
    }
    window.addEventListener('touchend', onTouchEnd, { passive: true })
    return () => window.removeEventListener('touchend', onTouchEnd)
  }, [])

  useEffect(() => {
    // avoid writing during the initial mount snap if you want; otherwise this is fine as-is
    safeStorage.set('experienceMode', mode)
  }, [mode])

  // -------- dissolve tween helper (centralized easing + durations) --------
  const stopDissolve = () => {
    if (dissolveRafRef.current != null) cancelAnimationFrame(dissolveRafRef.current)
    dissolveRafRef.current = null
  }
  const tweenDissolveTo = (target: number) => {
    stopDissolve()
    const start = dissolveProgress
    const delta = target - start
    const t0 = performance.now()
    const dur = Math.max(1, exp.durations.dissolveMs)
    const tick = () => {
      const t = Math.min(1, (performance.now() - t0) / dur)
      const e = tweenFn(t)
      setDissolveProgress(start + delta * e)
      if (t < 1) {
        dissolveRafRef.current = requestAnimationFrame(tick)
      } else {
        stopDissolve()
      }
    }
    dissolveRafRef.current = requestAnimationFrame(tick)
  }
  useEffect(() => () => { stopDissolve(); clearOutGuard(); clearSoftIntro() }, [])

  // ------ Small stagger so immersive layer fades in, then sphere re-inflates (soft intro) ------
  const SOFT_INTRO_DELAY_MS = exp.delays.immersiveSoftIntroMs
  const softIntroTimeoutRef = useRef<number | null>(null)
  const clearSoftIntro = () => {
    if (softIntroTimeoutRef.current != null) {
      clearTimeout(softIntroTimeoutRef.current)
      softIntroTimeoutRef.current = null
    }
  }

  // -------- Transition end handlers (drive second stage) --------
  const onImmersiveTransitionEnd = (e: React.TransitionEvent<HTMLDivElement>) => {
    if (e.propertyName !== 'opacity') return

    if (transitioningTo === 'classic' && seqPhase === 'fadeOut' && immersiveOpacity === 0) {
      clearOutGuard()
      proceedAfterImmersiveFadeOut()
      return
    }

    if (transitioningTo === 'immersive' && seqPhase === 'fadeIn' && immersiveOpacity === 1) {
      setSwitchDisabled(false)
      setTransitioningTo(null)
      setSeqPhase('idle')
      return
    }
  }

  const onClassicTransitionEnd = (e: React.TransitionEvent<HTMLDivElement>) => {
    if (e.propertyName !== 'opacity') return

    if (transitioningTo === 'immersive' && seqPhase === 'fadeOut' && classicOpacity === 0) {
      clearOutGuard()
      proceedAfterClassicFadeOut()
      return
    }

    if (transitioningTo === 'classic' && seqPhase === 'fadeIn' && classicOpacity === 1) {
      setMode('classic')
      setSwitchDisabled(false)
      setTransitioningTo(null)
      setSeqPhase('idle')
      return
    }
  }

  // -------- Helpers to advance sequential phases --------
  const proceedAfterImmersiveFadeOut = () => {
    // Immersive → Classic: classic fades in now
    setImmersiveZ(exp.z.back)
    setClassicZ(exp.z.front)
    setSeqPhase('fadeIn')
    requestAnimationFrame(() => { setClassicOpacity(1) })
  }

  const proceedAfterClassicFadeOut = () => {
    // Classic → Immersive: immersive fades in now (soft intro stagger for sphere)
    setClassicZ(exp.z.back)
    setImmersiveZ(exp.z.front)
    setSeqPhase('fadeIn')
    setMode('immersive')
    requestAnimationFrame(() => {
      setImmersiveOpacity(1) // layer fade-in first
      clearSoftIntro()
      softIntroTimeoutRef.current = window.setTimeout(() => {
        tweenDissolveTo(0)   // then re-inflate the sphere gently
      }, SOFT_INTRO_DELAY_MS)
    })
  }

  // -------- Switch handlers: stage 1 = fade-out current, stage 2 via end or guard --------
  const toImmersive = () => {
    try { history.replaceState(null, '', location.pathname + location.search + '#mode=immersive') } catch {} // hvle
    dlog('toImmersive:start', { mode }) // hvle
    if (mode === 'immersive' || switchDisabled) return
    setSwitchDisabled(true)
    setTransitioningTo('immersive')
    setSeqPhase('fadeOut')

    // Keep classic on top while it fades out; immersive behind & hidden
    setClassicZ(exp.z.front); setImmersiveZ(exp.z.back)
    setImmersiveOpacity(0)
    requestAnimationFrame(() => {
      setClassicOpacity(0)      // fade out current first
      scheduleOutGuard(proceedAfterClassicFadeOut)
    })
  }

  const toClassic = () => {
    try { history.replaceState(null, '', location.pathname + location.search + '#mode=classic') } catch {} // hvle
    dlog('toClassic:start', { mode }) // hvle
    if (mode === 'classic' || switchDisabled) return
    setSwitchDisabled(true)
    setTransitioningTo('classic')
    setSeqPhase('fadeOut')

    // Keep immersive on top while it fades out; classic behind & hidden
    setImmersiveZ(exp.z.front); setClassicZ(exp.z.back)
    setClassicOpacity(0)
    requestAnimationFrame(() => {
      setImmersiveOpacity(0)    // fade out current first
      tweenDissolveTo(1)        // dissolve sphere during immersive fade-out
      scheduleOutGuard(proceedAfterImmersiveFadeOut)
    })
  }

  const handleSwitch = (e?: React.MouseEvent) => { // hvle
    e?.preventDefault?.()
    dlog('toggle click', { defaultPrevented: !!e?.defaultPrevented, current: mode }) // hvle
    const next: Mode = mode === 'classic' ? 'immersive' : 'classic'
    safeStorage.set('experienceMode', next) // write synchronously before any nav

    // Verify right after the write — hvle
    let lsAfter: string | null | `!err:${string}` = null
    try { lsAfter = typeof window !== 'undefined' ? window.localStorage.getItem('experienceMode') : null } catch (err: any) { lsAfter = `!err:${err?.name||'unknown'}` }
    const cookieHas = typeof document !== 'undefined' && document.cookie.includes('experienceMode=')
    const newHash = typeof window !== 'undefined' ? window.location.hash : ''
    dlog('post-write', { next, lsAfter, cookieHas, hash: newHash })

    return next === 'immersive' ? toImmersive() : toClassic()
  }

  // Pointer events only for the top/visible layer
  const classicPe = classicOpacity > 0.5 && classicZ >= immersiveZ ? 'auto' : 'none'
  const immersivePe = immersiveOpacity > 0.5 && immersiveZ >= classicZ ? 'auto' : 'none'

  const fadeTransition = animate ? `opacity ${exp.durations.fadeMs}ms ${exp.easing.fadeCss}` : 'none'
  const bgLayers = backgroundLayers()

  return (
    <>
      {/* Immersive layer */}
      <div
        id="immersive-root"
        ref={immersiveRef}
        onTransitionEnd={onImmersiveTransitionEnd}
        aria-hidden={immersiveOpacity === 0}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: immersiveZ,
          opacity: immersiveOpacity,
          pointerEvents: immersivePe as any,
          transition: fadeTransition,
          // Share the exact same background (behind the Three.js stage)
          backgroundColor: exp.bg.top,
          backgroundImage: bgLayers,
          backgroundRepeat: exp.bg.repeat,
          backgroundSize: exp.bg.size,
          backgroundAttachment: exp.bg.attachment,
        }}
      >
        <ClientOnlySphere
          slidesData={slidesData}
          // These extra props are ignored by the Sphere component if not used; harmless.
          isImmersive={immersiveOpacity > 0 || mode === 'immersive'}
          dissolveProgress={dissolveProgress}
        />

        {/* Immersive footer: above sphere & hoverable */}
        <div
          id="immersive-footer"
          aria-hidden={immersiveOpacity === 0}
          style={{
            position: 'fixed',
            left: 0,
            right: 0,
            bottom: 20,
            textAlign: 'center',
            zIndex: exp.z.footer,
            pointerEvents: 'auto',
          }}
        >
          <small style={{ color: 'rgba(255,255,255,0.42)', letterSpacing: '0.04em' }}>
            stay curious
          </small>
        </div>
      </div>

      {/* Shared header with switch button */}
      <NavBarLite
        brand={{ href: '/', logoSrc: '/logo-white.svg', label: 'Sota' }}
        links={[
          // { href: '/posts', label: 'Posts' },
          // { href: '/visuals', label: 'Visuals' },
          { href: 'https://www.linkedin.com/in/manuelro/', label: 'LinkedIn' },
          { href: '#', label: mode === 'classic' ? 'Immersive' : 'Classic' }
        ]}
        onSwitchMode={handleSwitch}
        switchDisabled={switchDisabled}
      />

      {/* Classic layer */}
      <div
        id="classic-root"
        ref={classicRef}
        onTransitionEnd={onClassicTransitionEnd}
        style={{
          position: 'relative',
          zIndex: classicZ,
          opacity: classicOpacity,
          pointerEvents: classicPe as any,
          transition: fadeTransition,
          // Same background as immersive
          backgroundColor: exp.bg.top,
          backgroundImage: bgLayers,
          backgroundRepeat: exp.bg.repeat,
          backgroundSize: exp.bg.size,
          backgroundAttachment: exp.bg.attachment,
          marginTop: '3rem', // fix 1px gap issue on some browsers
        }}
      >
        <main className="flex min-h-screen flex-col p-5 md:p-24" style={{ position: 'relative' }}>
          {/* <Head>
            <title>Abstract Voyage | Manuel Cerdas&apos; Journal on Web Technologies, Cloud Computing and Artificial Intelligence</title>
          </Head> */}

          {/* <div className="hidden lg:flex flex-col border-b dark:border-b-slate-950 mt-12 pb-12"></div> */}
          <div className="lg:flex flex-col mt-12 pb-12" style={{ display: 'none' }}>
            <Image className="relative mt-8 mb-12 hidden dark:block" src="/sota-dark.svg" alt="Abstract Voyage Logo" height={31} width={221} priority quality={100} />
            <Image className="relative mt-8 mb-12 dark:hidden" src="/sota-light.svg" alt="Abstract Voyage Logo" height={31} width={221} priority quality={100} />

            {/* <div className="flex flex-col lg:flex-row justify-between">
              <Tree
                title="React"
                version="18"
                items={[
                  { label: 'Server Components', link: 'https://react.dev/blog/2020/12/21/data-fetching-with-react-server-components' },
                  { label: 'Automatic Batching', link: 'https://react.dev/blog/2022/03/29/react-v18#new-feature-automatic-batching' },
                  { label: 'New Suspense Feature', link: 'https://github.com/reactjs/rfcs/blob/main/text/0213-suspense-in-react-18.md' }
                ]}
              />
              <Tree
                title="Vue"
                version="3"
                items={[
                  { label: 'Composition API', link: 'https://vuejs.org/guide/extras/composition-api-faq.html#what-is-composition-api' },
                  { label: 'Teleport', link: 'https://vuejs.org/guide/built-ins/teleport.html' },
                  { label: 'Fragments', link: 'https://v3-migration.vuejs.org/new/fragments.html' }
                ]}
              />
              <Tree
                title="Angular"
                version="16"
                items={[
                  { label: 'Angular Signals', link: 'https://angular.io/guide/signals' },
                  { label: 'Server Side Rendering', link: 'https://blog.angular.io/moving-angular-cli-to-jest-and-web-test-runner-ef85ef69ceca' },
                  { label: 'Experimental Jest Support', link: 'https://blog.angular.io/moving-angular-cli-to-jest-and-web-test-runner-ef85ef69ceca' }
                ]}
              />
            </div> */}

          </div>

          <List className="mt-5" posts={posts} />
        </main>
      </div>
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
    return { slug, date, formattedDate: formatDate(date), frontmatter }
  }).sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0)).reverse()

  const slidesData = (await import('../experiences/sphere/slidesFromPosts')).loadSlidesFromPosts()
  return { props: { posts, slidesData } }
}
