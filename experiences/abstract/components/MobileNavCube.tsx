import { useRouter } from 'next/router';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import {
  CUBE_FACE_ROTATIONS,
  CubeNavigator,
  type CubeNavigatorPhase,
} from '../../../components/CubeNavigator';
import { CTA_BUTTON_MOTION_EASINGS } from '../../../components/CtaButton/config/registered';
import { usePrefersReducedMotion } from '../../../helpers/usePrefersReducedMotion';
import { deriveTransparentTint } from '../../../helpers/surfaceColorDerivation';
import {
  BRAND_WORDMARK_VIEWBOX_HEIGHT,
  BRAND_WORDMARK_VIEWBOX_WIDTH,
} from '../../../components/BrandWordmark';
import { useNavPrefetchCoordinator } from '../hooks/useNavPrefetchCoordinator';
import {
  AboutTimeline,
  type AboutTimelineRowData,
} from '../../about/components/AboutTimeline';
import type { AboutTimelineConfig } from '../../about/components/AboutTimeline.config';
import { normalizeMobileNavCubeConfig, type MobileNavCubeConfig } from './MobileNavCube.config';
import styles from './MobileNavCube.module.css';

const NAV_ID = 'abstract-mobile-cube-navigation';
// Read-only: this selector locates the wordmark purely to align the trigger
// against it (its overall vertical center as a fallback, or — when
// triggerAlignToWordmarkE is on — its own "E" letterform's three strokes
// exactly). The trigger never writes anything back onto the wordmark or its
// layout; this is a one-directional dependency, not the two-way coupling
// removed previously.
const WORDMARK_ANCHOR_SELECTOR = '[data-site-wordmark-anchor="true"]';
// The wordmark (components/BrandWordmark.tsx) is fixed, hand-authored vector
// art in a constant 589x31 viewBox — never live text — so these coordinates
// are permanent constants, not a runtime measurement. Read directly off the
// last entry in BRAND_WORDMARK_GLYPH_PATHS (the "E" in "VOYAGE", the
// wordmark's final glyph), whose outline is drawn entirely in straight H/V
// segments:
//   "M588.133 3.31836H578.305V14.0703H586.032V16.8428H578.305V27.4268
//    H588.553V30.0723H575.532V0.672852H588.133V3.31836Z"
// If BrandWordmark.tsx's glyph art is ever redrawn, these need re-deriving
// from the new path data (the comment above shows exactly how).
const E_LETTER_BAR_Y_RANGES: ReadonlyArray<readonly [number, number]> = [
  [0.672852, 3.31836], // top stroke
  [14.0703, 16.8428], // middle stroke
  [27.4268, 30.0723], // bottom stroke
];
const E_LETTER_RIGHT_EDGE_X = 588.553;
const NAV_LINKS: ReadonlyArray<AboutTimelineRowData> = [
  {
    caption: 'Home',
    line: 'A concise view of selected work, writing, and current explorations.',
    href: '/',
    slideIndex: 0,
  },
  {
    caption: 'About',
    line: 'The experience, principles, and point of view behind the practice.',
    href: '/about',
    slideIndex: 1,
  },
  {
    caption: 'Journal',
    line: 'Notes on software, systems, leadership, and thoughtful product craft.',
    href: '/journal',
    slideIndex: 2,
  },
  {
    caption: 'Contact',
    line: 'Start a conversation about a product, team, or technical challenge.',
    href: '/contact',
    slideIndex: 3,
  },
];

function routeMatches(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/' || pathname === '/abstract';
  if (href === '/journal') return pathname === '/journal' || pathname.startsWith('/posts/');
  return pathname === href || pathname.startsWith(`${href}/`);
}

type WordmarkEAlignedGeometry = {
  left: number;
  /** Viewport-space top of each bar, in the same [top, middle, bottom] order
   * as E_LETTER_BAR_Y_RANGES. */
  barTopPx: readonly [number, number, number];
  barThicknessPx: readonly [number, number, number];
};

function findWordmarkAnchor(): HTMLElement | undefined {
  const anchors = Array.from(document.querySelectorAll<HTMLElement>(WORDMARK_ANCHOR_SELECTOR));
  return anchors.find((element) => {
    const rect = element.getBoundingClientRect();
    const computed = window.getComputedStyle(element);
    return rect.width > 0 && rect.height > 0
      && computed.display !== 'none'
      && computed.visibility !== 'hidden';
  });
}

function measureWordmarkEGeometry(gapPx: number): WordmarkEAlignedGeometry | undefined {
  const anchor = findWordmarkAnchor();
  const svg = anchor?.querySelector('svg');
  if (!svg) return undefined;
  const rect = svg.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return undefined;

  // preserveAspectRatio="xMidYMid meet" on this SVG (Logo.tsx) keeps a single
  // uniform scale between viewBox units and rendered px on both axes.
  const scale = rect.height / BRAND_WORDMARK_VIEWBOX_HEIGHT;
  const barTopPx = E_LETTER_BAR_Y_RANGES.map(([y1]) => rect.top + y1 * scale) as [number, number, number];
  const barThicknessPx = E_LETTER_BAR_Y_RANGES
    .map(([y1, y2]) => (y2 - y1) * scale) as [number, number, number];
  const rightEdgeX = rect.left + (E_LETTER_RIGHT_EDGE_X / BRAND_WORDMARK_VIEWBOX_WIDTH) * rect.width;

  return { left: rightEdgeX + gapPx, barTopPx, barThicknessPx };
}

export function MobileNavCube({
  config: rawConfig,
  faceETimelineConfig,
  children,
}: {
  config: Partial<MobileNavCubeConfig>;
  faceETimelineConfig: AboutTimelineConfig;
  children: ReactNode;
}) {
  const config = normalizeMobileNavCubeConfig(rawConfig);
  const router = useRouter();
  const prefetchCoordinator = useNavPrefetchCoordinator(router);
  const prefersReducedMotion = usePrefersReducedMotion();
  const [open, setOpen] = useState(false);
  const [frozen, setFrozen] = useState(false);
  const [routePending, setRoutePending] = useState(false);
  const [isNarrowViewport, setIsNarrowViewport] = useState(false);
  const [phase, setPhase] = useState<CubeNavigatorPhase>('idle');
  const [frozenDocumentHeight, setFrozenDocumentHeight] = useState(0);
  const [triggerTop, setTriggerTop] = useState(() => config.triggerTopPx);
  const [wordmarkEGeometry, setWordmarkEGeometry] = useState<WordmarkEAlignedGeometry | undefined>(undefined);
  const frozenScrollYRef = useRef(0);
  const openRef = useRef(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const navRef = useRef<HTMLElement | null>(null);

  openRef.current = open;

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 767px)');
    const update = () => setIsNarrowViewport(mediaQuery.matches);
    update();
    mediaQuery.addEventListener('change', update);
    return () => mediaQuery.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    if (!config.enabled || !isNarrowViewport || frozen) return undefined;

    let frame = 0;
    const update = () => {
      if (config.triggerAlignToWordmarkE) {
        const geometry = measureWordmarkEGeometry(config.triggerWordmarkGapPx);
        if (!geometry) return;
        setWordmarkEGeometry(current => (
          current && current.left === geometry.left
            && current.barTopPx.every((value, index) => value === geometry.barTopPx[index])
            && current.barThicknessPx.every((value, index) => value === geometry.barThicknessPx[index])
            ? current
            : geometry
        ));
        return;
      }

      setWordmarkEGeometry(current => (current === undefined ? current : undefined));
      const anchor = findWordmarkAnchor();
      if (!anchor) return;
      const rect = anchor.getBoundingClientRect();
      const nextTop = Math.max(0, rect.top + (rect.height - config.triggerSizePx) / 2);
      setTriggerTop(current => (current === nextTop ? current : nextTop));
    };
    const scheduleUpdate = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(update);
    };
    scheduleUpdate();
    window.addEventListener('resize', scheduleUpdate);
    const observer = new ResizeObserver(scheduleUpdate);
    document.querySelectorAll<HTMLElement>(WORDMARK_ANCHOR_SELECTOR).forEach(element => observer.observe(element));
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', scheduleUpdate);
      observer.disconnect();
    };
  }, [
    config.enabled,
    config.triggerSizePx,
    config.triggerAlignToWordmarkE,
    config.triggerWordmarkGapPx,
    frozen,
    isNarrowViewport,
  ]);

  const pathname = router.asPath.split(/[?#]/, 1)[0] || '/';
  const destinationHrefs = useMemo(() => NAV_LINKS
    .map(link => link.href)
    .filter((href): href is string => typeof href === 'string' && !routeMatches(pathname, href)),
  [pathname]);

  const warmDestinationsOnIntent = useCallback(() => {
    prefetchCoordinator.warmIntent(destinationHrefs);
  }, [prefetchCoordinator, destinationHrefs]);

  useEffect(() => {
    if (!config.enabled || !isNarrowViewport || !router.isReady) return undefined;
    prefetchCoordinator.scheduleIdleWarm(destinationHrefs);
    return () => prefetchCoordinator.dispose();
  }, [config.enabled, isNarrowViewport, router.isReady, prefetchCoordinator, destinationHrefs]);

  const openMenu = () => {
    frozenScrollYRef.current = window.scrollY;
    setFrozenDocumentHeight(document.documentElement.scrollHeight);
    setFrozen(true);
    setOpen(true);
    warmDestinationsOnIntent();
  };

  const closeMenu = useCallback(() => setOpen(false), []);

  const handleNavigationSelect = useCallback((index: number) => {
    const destination = NAV_LINKS.find(link => link.slideIndex === index)?.href;
    const pathname = router.asPath.split(/[?#]/, 1)[0] || '/';
    if (!destination || destination === pathname) {
      closeMenu();
      return;
    }
    setRoutePending(true);
  }, [closeMenu, router.asPath]);

  useEffect(() => {
    const handleRouteComplete = () => {
      if (!openRef.current) return;
      setRoutePending(false);
      frozenScrollYRef.current = 0;
      setFrozenDocumentHeight(document.documentElement.scrollHeight);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setOpen(false));
      });
    };
    const handleRouteError = () => {
      setRoutePending(false);
      requestAnimationFrame(() => {
        navRef.current?.querySelector<HTMLElement>('a[href]')?.focus({ preventScroll: true });
      });
    };
    router.events.on('routeChangeComplete', handleRouteComplete);
    router.events.on('routeChangeError', handleRouteError);
    return () => {
      router.events.off('routeChangeComplete', handleRouteComplete);
      router.events.off('routeChangeError', handleRouteError);
    };
  }, [router.events]);

  useEffect(() => {
    if (config.enabled && isNarrowViewport) return;
    openRef.current = false;
    setOpen(false);
    setRoutePending(false);
    if (!frozen) return;
    const scrollY = frozenScrollYRef.current;
    setFrozen(false);
    requestAnimationFrame(() => window.scrollTo(0, scrollY));
  }, [config.enabled, frozen, isNarrowViewport]);

  const handleSettled = useCallback(() => {
    if (openRef.current) {
      navRef.current?.querySelector<HTMLElement>('a[href]')?.focus({ preventScroll: true });
      return;
    }

    const scrollY = frozenScrollYRef.current;
    setFrozen(false);
    triggerRef.current?.focus({ preventScroll: true });
    requestAnimationFrame(() => {
      window.scrollTo(0, scrollY);
    });
    // Face A's new page content mounted at routeChangeComplete while the
    // cuboid was still rotated toward Face E — any layout measurement taken
    // at that instant (e.g. useMeasuredElementRect's mount-time
    // getBoundingClientRect(), used throughout this page's own measured
    // sections like the CoverFlow carousel) saw the element projected
    // through a 3D transform it isn't actually resting under, often
    // collapsing it to 0x0, and ResizeObserver never re-fires afterward
    // since the element's own layout box never actually changes size, only
    // the ancestor's rotation does. A synthetic resize event is the
    // existing, already-listened-for signal every such measurement already
    // falls back to, so this re-validates all of them at once now that Face
    // A is genuinely facing the camera again.
    window.dispatchEvent(new Event('resize'));
  }, []);

  useEffect(() => {
    if (!frozen) return undefined;
    const root = document.documentElement;
    const previousOverflow = root.style.overflow;
    const previousOverscroll = root.style.overscrollBehavior;
    root.style.overflow = 'hidden';
    root.style.overscrollBehavior = 'none';
    return () => {
      root.style.overflow = previousOverflow;
      root.style.overscrollBehavior = previousOverscroll;
    };
  }, [frozen]);

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeMenu();
        return;
      }
      if (event.key !== 'Tab' || phase === 'windup' || phase === 'turning') return;
      const links = Array.from(navRef.current?.querySelectorAll<HTMLElement>('a[href]') ?? []);
      const focusables = [triggerRef.current, ...links].filter(
        (element): element is HTMLElement => element !== null,
      );
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, phase, closeMenu]);

  // Present only while triggerAlignToWordmarkE is on AND the wordmark has
  // actually been measured — until then (or whenever the setting is off)
  // every position below falls back to the pre-existing config-driven values.
  const eAligned = config.triggerAlignToWordmarkE ? wordmarkEGeometry : undefined;
  const buttonTopPx = eAligned ? eAligned.barTopPx[0] : triggerTop;
  const buttonHeightPx = eAligned
    ? (eAligned.barTopPx[2] + eAligned.barThicknessPx[2]) - eAligned.barTopPx[0]
    : config.triggerSizePx;
  const barsLayout = eAligned
    ? ([0, 1, 2] as const).map(index => ({
      topPx: eAligned.barTopPx[index] - buttonTopPx,
      heightPx: eAligned.barThicknessPx[index],
    }))
    : null;
  // The burger->X morph's translateY amount: distance from the top/bottom
  // bar's own center to the middle bar's center. E-aligned bars are very
  // close to symmetric (~1.6% variance in the source art — see
  // E_LETTER_BAR_Y_RANGES), so half the total top-to-bottom span is an
  // accurate single value for both directions.
  const iconBarOffsetPx = eAligned
    ? (eAligned.barTopPx[2] - eAligned.barTopPx[0]) / 2
    : config.triggerBarThicknessPx + config.triggerBarGapPx;
  const iconStyle = {
    '--icon-duration': `${config.iconMorphDurationMs}ms`,
    '--icon-easing': CTA_BUTTON_MOTION_EASINGS[config.iconMorphEasing],
    '--icon-bar-offset': `${iconBarOffsetPx}px`,
    '--icon-bar-gap': `${config.triggerBarGapPx}px`,
  } as CSSProperties;
  const targetRotation = open ? CUBE_FACE_ROTATIONS.E : CUBE_FACE_ROTATIONS.A;
  const activeNavigationIndex = NAV_LINKS.findIndex(link => (
    typeof link.href === 'string' && routeMatches(pathname, link.href)
  ));
  const pageInteractionProps = open
    ? ({ inert: '', 'aria-hidden': true } as Record<string, unknown>)
    : {};
  // Bars flush against whichever edge the trigger itself is aligned to,
  // rather than centered in the middle of the (now invisible-by-default)
  // button box — closes the residual gap between the bars and the true
  // viewport edge that centering left behind. Only relevant in fallback
  // (flex-stacked) mode — E-aligned bars are individually absolutely
  // positioned instead.
  const triggerBarAlignClass = config.triggerAlign === 'right' ? 'items-end' : 'items-start';
  const triggerPaddingPx = eAligned ? 0 : config.triggerPaddingPx;
  // Driven by triggerWidthPx (the button's own box width), not triggerSizePx
  // (height/icon-scale) — was wired to the latter, so widening the button
  // via triggerWidthPx visibly did nothing to the bars themselves. Padding
  // is subtracted since the bars fill the button's padded content box, not
  // its full outer width.
  const triggerBarWidthPx = Math.max(4, config.triggerWidthPx - triggerPaddingPx * 2);

  return (
    <>
      {config.enabled && isNarrowViewport ? (
        <button
          ref={triggerRef}
          type="button"
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-controls={NAV_ID}
          aria-expanded={open}
          onClick={() => (open ? closeMenu() : openMenu())}
          onPointerEnter={warmDestinationsOnIntent}
          onFocus={warmDestinationsOnIntent}
          onTouchStart={warmDestinationsOnIntent}
          className={eAligned
            ? `${styles.trigger} md:hidden fixed`
            : `${styles.trigger} md:hidden fixed flex flex-col ${triggerBarAlignClass} justify-center gap-[var(--icon-bar-gap)]`}
          style={{
            ...iconStyle,
            top: buttonTopPx,
            left: eAligned
              ? eAligned.left
              : (config.triggerAlign === 'left' ? config.triggerOffsetXPx : undefined),
            right: eAligned
              ? undefined
              : (config.triggerAlign === 'right' ? config.triggerOffsetXPx : undefined),
            width: config.triggerWidthPx,
            height: buttonHeightPx,
            padding: triggerPaddingPx,
            borderRadius: config.triggerBorderRadiusPx,
            backgroundColor: deriveTransparentTint(config.triggerBackgroundColor, config.triggerBackgroundOpacity),
            zIndex: config.zIndex + 1,
            '--trigger-base-opacity': `${config.triggerOpacity}`,
            '--trigger-interaction-duration': `${config.triggerInteractionTransitionMs}ms`,
          } as CSSProperties}
        >
          {(['top', 'middle', 'bottom'] as const).map((bar, index) => (
            <span
              key={bar}
              data-open={open ? 'true' : 'false'}
              data-bar={bar}
              className={styles.bar}
              style={{
                display: 'block',
                position: barsLayout ? 'absolute' : undefined,
                top: barsLayout ? barsLayout[index].topPx : undefined,
                left: barsLayout ? 0 : undefined,
                width: triggerBarWidthPx,
                height: barsLayout ? barsLayout[index].heightPx : config.triggerBarThicknessPx,
                backgroundColor: config.triggerIconColor,
                borderRadius: barsLayout ? barsLayout[index].heightPx / 2 : config.triggerBarThicknessPx,
              }}
            />
          ))}
        </button>
      ) : null}

      {frozen ? <div aria-hidden="true" style={{ height: frozenDocumentHeight }} /> : null}

      <CubeNavigator
        config={config}
        rotation={targetRotation}
        faceWidth="100vw"
        faceHeight={`${config.faceHeightVh}dvh`}
        viewportMode
        frozen={frozen}
        frozenScrollY={frozenScrollYRef.current}
        zIndex={config.zIndex}
        interactiveFace={open ? 'E' : 'A'}
        onPhaseChange={setPhase}
        onSettled={handleSettled}
        faces={{
          A: (
            <div className={styles.pageFaceContent} {...pageInteractionProps}>
              {children}
            </div>
          ),
          E: (
            <nav
              ref={navRef}
              id={NAV_ID}
              className={styles.navFace}
              style={{
                backgroundColor: config.facePanelBackgroundColor,
                color: config.facePanelTextColor,
              }}
              {...(!open || phase === 'windup' || phase === 'turning' || routePending
                ? ({ inert: '', 'aria-hidden': true } as Record<string, unknown>)
                : {})}
              aria-busy={phase === 'windup' || phase === 'turning' || routePending}
            >
              <div className={styles.timeline}>
                <AboutTimeline
                  rows={NAV_LINKS}
                  activeIndex={activeNavigationIndex}
                  onSelect={handleNavigationSelect}
                  accentColor={config.facePanelTextColor}
                  columnBackgroundColor={config.facePanelBackgroundColor}
                  bodyColorOverride={config.facePanelTextColor}
                  highlightColorOverride={config.facePanelTextColor}
                  config={faceETimelineConfig}
                  prefersReducedMotion={prefersReducedMotion}
                  panelId={NAV_ID}
                  navigationMode
                  ariaLabel="Site navigation"
                />
              </div>
            </nav>
          ),
        }}
      />
    </>
  );
}

export default MobileNavCube;
