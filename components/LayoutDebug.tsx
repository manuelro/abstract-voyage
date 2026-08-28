import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useOptionalSharedDesignConfig } from './SharedDesignConfigProvider';
import { useLayoutDebugHighlight } from './LayoutDebugHighlight';

/**
 * Purely cosmetic inspect-mode overlay for the split-column layout — the
 * layout-boundary analogue of Chrome DevTools' own element-inspect overlay.
 * Every render site adds this as an *extra* child, pointer-events-none, so
 * it can never change the size, position, or paint order of anything it
 * sits on top of, and never intercepts input. Disabled (the default) means
 * this returns null — not a hidden box, no DOM at all — so a disabled site
 * is byte-identical to a site that never rendered this.
 */
export function useLayoutDebugEnabled(): boolean {
  return useOptionalSharedDesignConfig()?.layoutDebugConfig.enabled ?? false;
}

export type LayoutDebugTone = 'wideColumn' | 'narrowColumn' | 'contentBox' | 'headerLeft' | 'headerRight' | 'body';

/**
 * Every literal `label` string any LayoutDebugOverlay call site actually
 * renders, across the whole codebase — the closed set a config-panel field's
 * own `debugHighlightIds` (components/Panel/config/types.ts) is typed
 * against. Shared here (not duplicated in types.ts) so the two can never
 * silently drift: a field referencing a label that isn't a real overlay
 * fails `tsc`, not just a live hover test. Add a new value here in the same
 * change that adds its own `<LayoutDebugOverlay label="...">` call site —
 * PLAN-POSTS-LAB-PANEL-TABS.md finding 1.6 is the incident this closes (the
 * body-gutter fields shipped once pointing at the wrong overlay labels,
 * caught only by a live screenshot, not by any automated check).
 */
export type LayoutDebugOverlayLabel =
  | 'WIDE COLUMN'
  | 'NARROW COLUMN'
  | 'BODY'
  | 'HEADER · LEFT'
  | 'HEADER · LEFT CONTENT'
  | 'HEADER · RIGHT'
  | 'HEADER · RIGHT CONTENT'
  | 'CARD PREVIEW'
  | 'READING COLUMN'
  | 'TABLE OF CONTENTS'
  | 'WIDE COLUMN CONTENT'
  | 'NARROW COLUMN CONTENT';

// Fixed, literal Tailwind classes per tone — never interpolated, so the JIT
// scanner can always discover them (this codebase's Tailwind-only styling
// rule). Distinct hues per tone mirror DevTools' own margin/border/padding/
// content color coding, so nested boxes stay visually distinguishable.
// headerLeft/headerRight deliberately get their own hues rather than
// reusing narrowColumn/wideColumn's — the header's own left/right split
// (SiteHeaderConfig's splitBandSide) and the body grid's own
// wideColumnSide are separately-typed config values kept in sync only by
// convention (see SiteHeader.tsx's own doc comments), not the same
// value, so implying a fixed correspondence via shared color would overstate
// what's actually guaranteed.
const TONE_CLASSES: Record<LayoutDebugTone, string> = {
  wideColumn: 'bg-fuchsia-500/25 outline outline-2 outline-fuchsia-500',
  narrowColumn: 'bg-cyan-400/25 outline outline-2 outline-cyan-400',
  contentBox: 'bg-amber-400/25 outline outline-2 outline-amber-400',
  headerLeft: 'bg-orange-400/25 outline outline-2 outline-orange-400',
  headerRight: 'bg-teal-400/25 outline outline-2 outline-teal-400',
  // Deliberately its own hue, distinct from every column/header tone above —
  // 'body' is the outermost box (components/SplitColumnPageShell.tsx's own
  // PageContainer wrapping the whole SplitColumnLayout grid), so its overlay
  // always renders *around* wideColumn/narrowColumn's own, never inside or
  // instead of them. Its own gutter padding is exactly the area visible
  // between this box's outline and the column overlays nested within it.
  body: 'bg-indigo-500/25 outline outline-2 outline-indigo-500',
};

const LABEL_CLASSES = [
  'pointer-events-none absolute left-1 top-1 z-50 w-max max-w-[calc(100%-0.5rem)]',
  'rounded border border-white/15 bg-black/85 px-1.5 py-0.5',
  'font-mono text-[10px] leading-[1.3] text-white shadow-lg',
  'truncate',
].join(' ');

/** getBoundingClientRect()'s own return shape, the subset this component
 * actually needs to reproduce as a `position: fixed` box. */
type MeasuredRect = { top: number; left: number; width: number; height: number };

export function LayoutDebugOverlay({
  tone,
  label,
}: {
  tone: LayoutDebugTone;
  label: LayoutDebugOverlayLabel;
}) {
  const enabled = useLayoutDebugEnabled();
  // Orientation-only hover wiring (see LayoutDebugHighlight.tsx's own doc
  // comment) — a config-panel field can name this exact `label` string in
  // its own debugHighlightIds to dim every *other* overlay while this one's
  // hovered. hoveredIds is empty almost always, in which case this renders
  // byte-identical to before this feature existed.
  const highlight = useLayoutDebugHighlight();

  // Zero-size, `position: static` anchor left in the exact spot this
  // overlay used to render itself (a child of whichever box a call site is
  // labeling) — its own getBoundingClientRect() is this component's only
  // real dependency on that box's DOM position, everything visible is
  // portaled out (see the doc comment below this hook block for why).
  const anchorRef = useRef<HTMLDivElement | null>(null);
  const [rect, setRect] = useState<MeasuredRect | null>(null);

  // Equality-guarded setter — both measurement paths below call this, and
  // the second one runs on every render, so it must never schedule a
  // render-triggering state update when the box genuinely hasn't moved
  // (getBoundingClientRect() returns a fresh object every call, so a naive
  // setRect(newObject) would otherwise re-render forever even at rest).
  const applyMeasurement = (nextRect: MeasuredRect) => {
    setRect(previous => (
      previous
        && previous.top === nextRect.top
        && previous.left === nextRect.left
        && previous.width === nextRect.width
        && previous.height === nextRect.height
    ) ? previous : nextRect);
  };

  useEffect(() => {
    if (!enabled) return undefined;
    const element = anchorRef.current;
    if (!element || typeof ResizeObserver === 'undefined') return undefined;
    const measure = () => applyMeasurement(element.getBoundingClientRect());
    measure();
    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(element);
    // capture: true — catches scrolling on *any* ancestor scroll container,
    // not just the window (a sticky/scrollable panel section, for example),
    // matching how getBoundingClientRect() itself accounts for every
    // intervening scroll offset regardless of which element scrolled.
    window.addEventListener('scroll', measure, true);
    window.addEventListener('resize', measure);
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('scroll', measure, true);
      window.removeEventListener('resize', measure);
    };
  }, [enabled]);

  // Re-measure after every commit, not just on the triggers above — a
  // layout-config edit (e.g. an align/margin/justify-content change) moves
  // this box via a React re-render alone: no window scroll/resize event
  // fires, and the anchor's own border-box size often doesn't change either
  // (only its position does), so ResizeObserver never fires for it. Any
  // such edit still causes a re-render somewhere upstream, which this catches
  // unconditionally. Runs before paint (useLayoutEffect, not useEffect) so a
  // moved box never visibly flashes at its old position first. Deliberately
  // no dependency array — every commit is a potential reposition.
  useLayoutEffect(() => {
    if (!enabled) return;
    const element = anchorRef.current;
    if (!element) return;
    applyMeasurement(element.getBoundingClientRect());
  });

  if (!enabled) return null;

  const hoveredIds = highlight?.hoveredIds ?? [];
  // '20' (not '15'): this project's Tailwind default opacity scale (v3.3.1)
  // is 0/5/10/20/25/30/40/50/60/70/75/80/90/95/100 — 15 isn't a step, so
  // 'opacity-15' silently compiles to nothing (confirmed: the class lands
  // in the DOM, but no matching CSS rule exists, so it visibly does
  // nothing — the same class of bug this codebase's Tailwind-only styling
  // rule exists to catch, caught here by checking the generated stylesheet
  // directly rather than trusting the class name looks plausible).
  const isDimmed = hoveredIds.length > 0 && !hoveredIds.includes(label);

  return (
    <>
      <div ref={anchorRef} aria-hidden="true" className="pointer-events-none absolute inset-0" />
      {/* Portaled straight to <body>, as a live-measured `position: fixed`
          box, instead of `position: absolute inset-0` nested inside
          whichever box a call site labels. A plain z-index bump (this
          overlay's own former z-40 → z-[2000] fix) only wins a stacking
          fight *within* the nearest ancestor that itself establishes a new
          stacking context (`position` + a real z-index) — and
          SplitColumnPageShell.tsx's own PageContainer wrapper
          (`relative z-[1]`, needed only to locally out-rank its own
          edge-backdrop sibling) is exactly that kind of ancestor. Once
          PageContainer opens its own stacking context, nothing nested
          inside it — no matter how large a z-index it declares — can ever
          out-rank something *outside* PageContainer, like the page's own
          fixed header (z-[1000]): confirmed live via
          `document.elementFromPoint()` on /abstract's own 'float'-header
          columns, where WIDE COLUMN/NARROW COLUMN/BODY's overlays sat
          directly under the header and silently lost that fight even at
          z-[2000], while CARD PREVIEW (nested at the same depth, but never
          visually contesting the header's own screen region) rendered
          correctly the whole time — proof this was a stacking-context
          boundary, not a missing-overlay or insufficient-z-index bug.
          Rendering at <body> instead structurally escapes every such
          boundary, present or future, the same guarantee real browser
          DevTools' own element-inspect overlay has. */}
      {rect && typeof document !== 'undefined' ? createPortal(
        <div
          style={{
            position: 'fixed',
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
          }}
          className={[
            'pointer-events-none z-[2000] transition-opacity duration-150',
            TONE_CLASSES[tone],
            isDimmed ? 'opacity-20' : '',
          ].filter(Boolean).join(' ')}
        >
          <span className={LABEL_CLASSES}>{label}</span>
        </div>,
        document.body,
      ) : null}
    </>
  );
}
