'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import {
  findSectionAncestor,
  widenAncestor,
  narrowAncestor,
  collectTextNodes,
  buildPageOutline,
  detectSiblingGroups,
} from '../helpers/copy/picker';
import {
  buildExtraction,
  guessSectionType,
  type ExtractionPayload,
} from '../helpers/copy/extraction';
import { previewNode, revertAll } from '../helpers/copy/preview';
import type { CopyResponse } from '../helpers/copy/schema';

// ── Types ──────────────────────────────────────────────────────────────────

type TaxonomyEntry = {
  label: string;
  visitor_question: string;
  narrative_role: string;
  strategies: Array<{ id: string; brief: string }>;
  failure_modes: string[];
  constraints: string[];
};

type PageMapLinkingPhrase = {
  phrase: string;
  origin: string;
  resolved_by: string;
  resolved_in: string;
};

type PageMapPageRole = {
  purpose: string;
  visitor_question: string;
  narrative_position: 'opens' | 'develops' | 'resolves';
  arrives_from: string[];
  arrives_knowing: string;
  leaves_to: string;
  must_not: string[];
};

type PageMapRoute = {
  page_role?: PageMapPageRole;
  narrative?: {
    inherits_from: string | string[] | null;
    hands_off_to: string[];
    linking_phrases: PageMapLinkingPhrase[];
  };
  sections: Array<{
    type: string;
    heading: string;
    node_count: number;
    index?: number;
    inherits_beat?: string | null;
    carries_downstream_reference?: string[];
    slot_constraints?: string[];
  }>;
};

type AcceptedGroup = {
  sectionType: string;
  sectionHeading: string;
  rationale: string;
  changes: Array<{
    id: string;
    role: string | null;
    tag: string;
    currentText: string;
    approvedText: string;
    hasElementChildren: boolean;
  }>;
};

// ── Inline styles ──────────────────────────────────────────────────────────

const OVERLAY_STYLE: CSSProperties = {
  all: 'initial',
  position: 'fixed',
  pointerEvents: 'none',
  zIndex: 2147483646,
  border: '2px solid rgba(59, 130, 246, 0.8)',
  borderRadius: '4px',
  boxShadow: '0 0 0 9999px rgba(0,0,0,0.35)',
  transition: 'top 60ms, left 60ms, width 60ms, height 60ms',
};

const TOOLBAR_STYLE: CSSProperties = {
  all: 'initial',
  position: 'fixed',
  bottom: '16px',
  left: '50%',
  transform: 'translateX(-50%)',
  zIndex: 2147483647,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '6px',
  background: '#1a1a2e',
  color: '#e0e0e0',
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
  fontSize: '12px',
  lineHeight: '1.4',
  padding: '10px 16px',
  borderRadius: '10px',
  boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
  maxWidth: '640px',
  width: 'max-content',
};

const ROW_STYLE: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  flexWrap: 'wrap',
  justifyContent: 'center',
};

const BTN_STYLE: CSSProperties = {
  all: 'initial',
  cursor: 'pointer',
  padding: '3px 10px',
  borderRadius: '4px',
  background: 'rgba(255,255,255,0.1)',
  color: '#e0e0e0',
  fontFamily: 'inherit',
  fontSize: '11px',
  border: '1px solid rgba(255,255,255,0.15)',
  whiteSpace: 'nowrap',
};

const BTN_PRIMARY_STYLE: CSSProperties = {
  ...BTN_STYLE,
  background: 'rgba(59, 130, 246, 0.3)',
  borderColor: 'rgba(59, 130, 246, 0.5)',
};

const SELECT_STYLE: CSSProperties = {
  all: 'initial',
  padding: '3px 6px',
  borderRadius: '4px',
  background: 'rgba(255,255,255,0.08)',
  color: '#e0e0e0',
  fontFamily: 'inherit',
  fontSize: '11px',
  border: '1px solid rgba(255,255,255,0.15)',
  cursor: 'pointer',
};

const WARN_STYLE: CSSProperties = {
  color: '#f59e0b',
  fontSize: '10px',
  maxWidth: '400px',
  textAlign: 'center' as const,
};

const EMIT_TEXTAREA_STYLE: CSSProperties = {
  all: 'initial',
  width: '100%',
  maxHeight: '120px',
  padding: '6px',
  fontFamily: 'inherit',
  fontSize: '10px',
  color: '#a0a0b0',
  background: 'rgba(0,0,0,0.3)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '4px',
  resize: 'vertical' as const,
  overflow: 'auto',
};

const BADGE_STYLE: CSSProperties = {
  background: 'rgba(59, 130, 246, 0.2)',
  padding: '1px 6px',
  borderRadius: '3px',
  fontSize: '10px',
};

// ── Mock response generator ─────────────────────────────────────────────────

function buildMockResponse(extraction: ExtractionPayload): CopyResponse {
  const strategies = ['strategy_a', 'strategy_b', 'strategy_c'];
  return {
    brief: {
      sectionType: extraction.sectionType || 'unknown',
      sectionJob: 'Mock: demonstrate the preview loop with placeholder copy.',
      servesPageJob: 'Mock: this section supports the page purpose by previewing the copy tool.',
      readerAssumedToKnow: 'Mock: the reader has context from prior sections.',
      assumptions: ['This is a mock response for testing the preview loop.'],
      inheritsBeat: null,
      opensThreads: [],
    },
    variants: strategies.map((sid, vi) => ({
      strategyId: sid,
      label: `Mock variant ${vi + 1}`,
      rationale: `This mock variant ${vi + 1} demonstrates a different approach.`,
      proofHoles: [],
      nodes: extraction.nodes.map(n => ({
        id: n.id,
        text: `[V${vi + 1}] ${n.text.slice(0, Math.max(20, n.budget.target - 10))}…`,
        overBudget: false,
        proofRefs: [],
      })),
    })),
  };
}

// ── Emit prompt builder ─────────────────────────────────────────────────────

function buildEmitPrompt(
  route: string,
  groups: AcceptedGroup[],
): string {
  const payload = {
    route,
    generatedAt: new Date().toISOString(),
    groups: groups.map(g => ({
      sectionType: g.sectionType,
      sectionHeading: g.sectionHeading,
      rationale: `NON-ACTIONABLE — ${g.rationale}`,
      changes: g.changes,
    })),
  };

  return `Apply approved copy changes to this repository.

Follow \`.copy-tool/prompts/apply.md\` exactly. The strings below are final and
human-approved — do not rewrite, improve, shorten, or adjust them.

\`\`\`json
${JSON.stringify(payload, null, 2)}
\`\`\``;
}

// ── Component ──────────────────────────────────────────────────────────────

export default function CopyTool() {
  // --- Data loaded from API ---
  const [taxonomy, setTaxonomy] = useState<Record<string, TaxonomyEntry> | null>(null);
  const [pageMap, setPageMap] = useState<Record<string, PageMapRoute> | null>(null);

  // --- Picker state ---
  const [pickMode, setPickMode] = useState(false);
  const [hoveredSection, setHoveredSection] = useState<Element | null>(null);
  const [lockedSection, setLockedSection] = useState<Element | null>(null);

  // --- Extraction & generation ---
  const [extraction, setExtraction] = useState<ExtractionPayload | null>(null);
  const [sectionType, setSectionType] = useState('');
  const [response, setResponse] = useState<CopyResponse | null>(null);
  const [activeVariant, setActiveVariant] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // --- Accepted state ---
  const [accepted, setAccepted] = useState<AcceptedGroup[]>([]);
  const [showEmit, setShowEmit] = useState(false);
  const [emitText, setEmitText] = useState('');

  // --- Page & continuity ---
  const [continuityExpanded, setContinuityExpanded] = useState(false);
  const [upstreamRoute, setUpstreamRoute] = useState<string | null>(null);
  const [pinnedBeat, setPinnedBeat] = useState<string | null>(null);

  // --- Brief expand ---
  const [briefExpanded, setBriefExpanded] = useState(false);

  // --- Refs ---
  const elementMapRef = useRef(new Map<string, Element>());
  const abortRef = useRef<AbortController | null>(null);

  // --- Load taxonomy + page-map on mount ---
  useEffect(() => {
    fetch('/api/copy/generate')
      .then(r => r.json())
      .then(data => {
        if (data.taxonomy) setTaxonomy(data.taxonomy);
        if (data.pageMap) setPageMap(data.pageMap);
      })
      .catch(() => {
        // Silently fail — taxonomy will be empty, dropdown disabled
      });
  }, []);

  // --- Keyboard: toggle pick mode (Alt+Shift+C) ---
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.altKey && e.shiftKey && e.code === 'KeyC') {
        e.preventDefault();
        setPickMode(prev => !prev);
        return;
      }
      // Escape: clear everything or close toolbar
      if (e.key === 'Escape') {
        if (response) {
          revertAll(elementMapRef.current);
          setResponse(null);
          setActiveVariant(0);
        }
        if (lockedSection) {
          setLockedSection(null);
          setExtraction(null);
          setSectionType('');
          setError(null);
        }
        if (pickMode) {
          setPickMode(false);
          setHoveredSection(null);
        }
        return;
      }
    };
    window.addEventListener('keydown', handleKey, true);
    return () => window.removeEventListener('keydown', handleKey, true);
  }, [pickMode, lockedSection, response]);

  // --- Arrow keys while hovering: widen/narrow ---
  useEffect(() => {
    if (!pickMode || !hoveredSection || lockedSection) return;
    const handleArrow = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHoveredSection(prev => prev ? widenAncestor(prev) : prev);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHoveredSection(prev => prev ? narrowAncestor(prev) : prev);
      }
    };
    window.addEventListener('keydown', handleArrow);
    return () => window.removeEventListener('keydown', handleArrow);
  }, [pickMode, hoveredSection, lockedSection]);

  // --- Left/Right arrows: cycle variants ---
  useEffect(() => {
    if (!response) return;
    const handleLR = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setActiveVariant(prev => Math.max(0, prev - 1));
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setActiveVariant(prev => Math.min(response.variants.length - 1, prev + 1));
      }
    };
    window.addEventListener('keydown', handleLR);
    return () => window.removeEventListener('keydown', handleLR);
  }, [response]);

  // --- Apply current variant preview whenever activeVariant or response changes ---
  useEffect(() => {
    if (!response || !extraction) return;
    const variant = response.variants[activeVariant];
    if (!variant) return;
    // Revert first, then apply
    revertAll(elementMapRef.current);
    for (const node of variant.nodes) {
      const el = elementMapRef.current.get(node.id);
      if (el) previewNode(node.id, el, node.text);
    }
  }, [response, activeVariant, extraction]);

  // --- Mouse tracking in pick mode ---
  useEffect(() => {
    if (!pickMode || lockedSection) return;
    const handleMove = (e: MouseEvent) => {
      const target = document.elementFromPoint(e.clientX, e.clientY);
      if (!target) return;
      // Don't highlight the overlay or toolbar itself
      const ct = (target as HTMLElement).closest('[data-copy-tool]');
      if (ct) return;
      setHoveredSection(findSectionAncestor(target));
    };
    const handleClick = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (hoveredSection) {
        lockSection(hoveredSection);
      }
    };
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('click', handleClick, true);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('click', handleClick, true);
    };
  }, [pickMode, lockedSection, hoveredSection]);

  // --- Warn on navigate with unemitted changes ---
  useEffect(() => {
    if (accepted.length === 0) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [accepted.length]);

  // --- Lock section and extract ---
  const lockSection = useCallback((section: Element) => {
    setPickMode(false);
    setLockedSection(section);
    setHoveredSection(null);

    elementMapRef.current.clear();
    const textElements = collectTextNodes(section);
    const outline = buildPageOutline(section);
    const siblingGroups = detectSiblingGroups(textElements);
    const ext = buildExtraction(textElements, siblingGroups, outline, elementMapRef.current);

    // Guess section type
    const keys = taxonomy ? Object.keys(taxonomy) : [];
    const routes = pageMap
      ? Object.fromEntries(
          Object.entries(pageMap).map(([k, v]) => [k, v]),
        )
      : null;
    const guessed = guessSectionType(ext, routes, keys);
    ext.sectionType = guessed;

    // Populate page role from page-map
    const currentRoute = window.location.pathname;
    const routeData = pageMap?.[currentRoute] as PageMapRoute | undefined;
    if (routeData?.page_role) {
      const pr = routeData.page_role;
      ext.page = {
        purpose: (pr.purpose ?? '').trim(),
        visitorQuestion: pr.visitor_question ?? '',
        narrativePosition: pr.narrative_position ?? 'develops',
        arrivesKnowing: (pr.arrives_knowing ?? '').trim(),
        leavesTo: pr.leaves_to ?? '',
        mustNot: pr.must_not ?? [],
      };
    }

    // Populate slotConstraints and carriesDownstreamReference from page-map section
    if (routeData?.sections) {
      const matchedSection = routeData.sections.find(s => s.type === guessed);
      if (matchedSection) {
        ext.slotConstraints = matchedSection.slot_constraints ?? [];
        // Match downstream references to node text
        const downstreamRefs = matchedSection.carries_downstream_reference ?? [];
        for (const node of ext.nodes) {
          node.carriesDownstreamReference = downstreamRefs.filter(
            ref => node.text.includes(ref),
          );
        }
      }
    }

    // Set upstream default from narrative
    const narrative = routeData?.narrative;
    if (narrative?.inherits_from) {
      const from = Array.isArray(narrative.inherits_from)
        ? narrative.inherits_from[0]
        : narrative.inherits_from;
      setUpstreamRoute(from);
    } else {
      setUpstreamRoute(null);
    }
    setPinnedBeat(null);
    setContinuityExpanded(false);

    setSectionType(guessed);
    setExtraction(ext);
    setError(null);
    setResponse(null);
    setActiveVariant(0);

    // eslint-disable-next-line no-console
    console.log('[CopyTool] extraction:', ext);
  }, [taxonomy, pageMap]);

  // --- Generate (mock or real) ---
  const handleGenerate = useCallback(async () => {
    if (!extraction) return;
    const ext = { ...extraction, sectionType };

    // Populate upstream from current state
    if (upstreamRoute) {
      const currentRoute = window.location.pathname;
      // Find linking phrases from the upstream route that resolve to this route
      const upstreamData = pageMap?.[upstreamRoute] as PageMapRoute | undefined;
      const linkingPhrases = upstreamData?.narrative?.linking_phrases
        ?.filter(lp => lp.resolved_in === currentRoute)
        ?.map(lp => lp.phrase) ?? [];

      // Fetch upstream page copy (best-effort — dev server SSRs pages)
      let upstreamCopy = '';
      try {
        const html = await fetch(upstreamRoute).then(r => r.text());
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        // Remove script/style content before extracting text
        doc.querySelectorAll('script,style,noscript,template').forEach(el => el.remove());
        upstreamCopy = (doc.body?.textContent ?? '').replace(/\s+/g, ' ').trim();
      } catch {
        // Non-fatal — upstream copy will be empty
      }

      ext.upstream = {
        route: upstreamRoute,
        copy: upstreamCopy,
        linkingPhrases: linkingPhrases,
        pinnedBeat,
      };
    } else {
      ext.upstream = null;
    }

    setExtraction(ext);
    setLoading(true);
    setError(null);
    setResponse(null);
    setActiveVariant(0);
    revertAll(elementMapRef.current);

    // Abort any in-flight request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch('/api/copy/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ext),
        signal: controller.signal,
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || `Server error ${res.status}`);
      }
      setResponse(data as CopyResponse);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        setError('Generation cancelled.');
        setLoading(false);
        return;
      }
      // Fallback to mock if API fails
      // eslint-disable-next-line no-console
      console.warn('[CopyTool] API failed, using mock:', err);
      setResponse(buildMockResponse(ext));
      setError(err instanceof Error ? `API error (mock active): ${err.message}` : 'Unknown error');
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  }, [extraction, sectionType, upstreamRoute, pinnedBeat, pageMap]);

  // --- Accept current variant ---
  const handleAccept = useCallback(() => {
    if (!response || !extraction) return;
    const variant = response.variants[activeVariant];
    if (!variant) return;

    const headingNode = extraction.nodes.find(n => n.role === 'heading');
    const group: AcceptedGroup = {
      sectionType: extraction.sectionType,
      sectionHeading: headingNode?.text ?? '',
      rationale: variant.rationale,
      changes: variant.nodes.map(vn => {
        const en = extraction.nodes.find(n => n.id === vn.id);
        return {
          id: vn.id,
          role: en?.role ?? null,
          tag: en?.tag ?? 'span',
          currentText: en?.text ?? '',
          approvedText: vn.text,
          hasElementChildren: en?.hasElementChildren ?? false,
        };
      }),
    };

    setAccepted(prev => [...prev, group]);
    // Don't close — operator may continue to next section
  }, [response, extraction, activeVariant]);

  // --- Close toolbar ---
  const handleClose = useCallback(() => {
    revertAll(elementMapRef.current);
    setResponse(null);
    setActiveVariant(0);
    setLockedSection(null);
    setExtraction(null);
    setSectionType('');
    setError(null);
    setBriefExpanded(false);
  }, []);

  // --- Emit ---
  const handleEmit = useCallback(() => {
    const prompt = buildEmitPrompt(window.location.pathname, accepted);
    setEmitText(prompt);
    setShowEmit(true);
    navigator.clipboard.writeText(prompt).catch(() => {
      // Clipboard may fail — textarea fallback is visible
    });
  }, [accepted]);

  // --- Remove accepted entry ---
  const handleRemoveAccepted = useCallback((index: number) => {
    setAccepted(prev => prev.filter((_, i) => i !== index));
  }, []);

  // --- Overlay rect ---
  const displaySection = lockedSection ?? hoveredSection;
  const rect = displaySection?.getBoundingClientRect();

  // --- Derived: page & continuity ---
  const currentRoute = typeof window !== 'undefined' ? window.location.pathname : '/';
  const currentRouteData = pageMap?.[currentRoute] as PageMapRoute | undefined;
  const pageRole = currentRouteData?.page_role;
  const isPageCharacterised = !!pageRole;
  const allRoutes = pageMap ? Object.keys(pageMap) : [];

  // Linking phrases: from upstream route's narrative that resolve to this route
  const upstreamData = upstreamRoute && pageMap
    ? pageMap[upstreamRoute] as PageMapRoute | undefined
    : undefined;
  const availableBeats = upstreamData?.narrative?.linking_phrases
    ?.filter(lp => lp.resolved_in === currentRoute)
    ?.map(lp => lp.phrase) ?? [];

  // Is this an unrecorded link? (operator selected upstream not in page-map narrative)
  const recordedUpstream = currentRouteData?.narrative?.inherits_from;
  const recordedUpstreamList = recordedUpstream
    ? (Array.isArray(recordedUpstream) ? recordedUpstream : [recordedUpstream])
    : [];
  const isUnrecordedLink = upstreamRoute !== null
    && !recordedUpstreamList.includes(upstreamRoute);

  // Protected phrases: nodes carrying downstream references
  const protectedPhraseNodes = extraction?.nodes.filter(
    n => n.carriesDownstreamReference.length > 0,
  ) ?? [];

  // Narrative role from taxonomy
  const currentTaxEntry = sectionType ? taxonomy?.[sectionType] : null;
  const narrativeRole = currentTaxEntry?.narrative_role ?? null;

  // --- Warnings ---
  const flattenedNodes = response
    ? extraction?.nodes.filter(n => n.hasElementChildren).map(n => n.id) ?? []
    : [];
  const overBudgetNodes = response
    ? response.variants[activeVariant]?.nodes.filter(n => {
        const en = extraction?.nodes.find(x => x.id === n.id);
        return en && n.text.length > en.budget.max;
      }).map(n => n.id) ?? []
    : [];

  const taxonomyKeys = taxonomy ? Object.keys(taxonomy) : [];

  return (
    <>
      {/* Highlight overlay */}
      {(pickMode || lockedSection) && rect && (
        <div
          data-copy-tool="overlay"
          style={{
            ...OVERLAY_STYLE,
            top: `${rect.top}px`,
            left: `${rect.left}px`,
            width: `${rect.width}px`,
            height: `${rect.height}px`,
          }}
        />
      )}

      {/* Pick mode indicator */}
      {pickMode && !lockedSection && (
        <div
          data-copy-tool="hint"
          style={{
            ...TOOLBAR_STYLE,
            padding: '6px 14px',
          }}
        >
          <span>PICK MODE — click a section, ↑↓ to widen/narrow, Esc to exit</span>
        </div>
      )}

      {/* Toolbar — shown when section is locked */}
      {lockedSection && extraction && (
        <div data-copy-tool="toolbar" style={TOOLBAR_STYLE}>
          {/* Row 1: section type + generate */}
          <div style={ROW_STYLE}>
            <select
              style={SELECT_STYLE}
              value={sectionType}
              onChange={e => setSectionType(e.target.value)}
            >
              {taxonomyKeys.length === 0 && <option value="">Loading…</option>}
              {taxonomyKeys.map(key => (
                <option key={key} value={key}>
                  {taxonomy![key].label}
                </option>
              ))}
            </select>
            <button
              type="button"
              style={{
                ...BTN_PRIMARY_STYLE,
                ...(loading ? { background: 'rgba(239, 68, 68, 0.3)', borderColor: 'rgba(239, 68, 68, 0.5)' } : {}),
              }}
              onClick={loading ? () => abortRef.current?.abort() : handleGenerate}
            >
              {loading ? 'Cancel' : response ? 'Regenerate' : 'Generate'}
            </button>
            <span style={{ opacity: 0.5, fontSize: '10px' }}>
              {extraction.nodes.length} nodes
            </span>
          </div>

          {/* Page & continuity row — always present */}
          <div style={{ width: '100%' }}>
            <div
              style={{ ...ROW_STYLE, cursor: 'pointer', fontSize: '10px', opacity: 0.7, justifyContent: 'flex-start' }}
              onClick={() => setContinuityExpanded(prev => !prev)}
            >
              <span>
                Page: {isPageCharacterised ? pageRole!.narrative_position : 'uncharacterised'}
                {' · '}
                Continues from: {upstreamRoute ?? '—'}
                {' '}
                {continuityExpanded ? '▴' : '▾'}
              </span>
            </div>
            {continuityExpanded && (
              <div style={{ fontSize: '10px', opacity: 0.6, padding: '4px 0', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {/* Page role — display only */}
                {isPageCharacterised ? (
                  <div>
                    <div><strong>Purpose:</strong> {pageRole!.purpose}</div>
                    <div><strong>Visitor Q:</strong> {pageRole!.visitor_question}</div>
                    <div style={{ opacity: 0.5, fontSize: '9px' }}>Page role is edited in page-map.yaml</div>
                  </div>
                ) : (
                  <div style={{ opacity: 0.5 }}>No page_role in page-map.yaml for {currentRoute}</div>
                )}
                {/* Continues from — all routes + none */}
                <div style={ROW_STYLE}>
                  <span>Continues from:</span>
                  <select
                    style={SELECT_STYLE}
                    value={upstreamRoute ?? ''}
                    onChange={e => {
                      setUpstreamRoute(e.target.value || null);
                      setPinnedBeat(null);
                    }}
                  >
                    <option value="">—</option>
                    {allRoutes.filter(r => r !== currentRoute).map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
                {/* Beat — linking phrases from upstream */}
                <div style={ROW_STYLE}>
                  <span>Beat:</span>
                  <select
                    style={SELECT_STYLE}
                    value={pinnedBeat ?? ''}
                    onChange={e => setPinnedBeat(e.target.value || null)}
                  >
                    <option value="">auto{availableBeats.length === 0 ? ' (no phrases recorded)' : ''}</option>
                    {availableBeats.map(b => (
                      <option key={b} value={b}>{b.length > 50 ? b.slice(0, 50) + '…' : b}</option>
                    ))}
                    {availableBeats.length > 0 && <option value="__none__">none of these</option>}
                  </select>
                </div>
                {/* Narrative role — from taxonomy, read-only */}
                {narrativeRole && (
                  <div><strong>Section role:</strong> {narrativeRole}</div>
                )}
              </div>
            )}
          </div>

          {/* Error */}
          {error && (
            <div style={{ ...WARN_STYLE, color: '#ef4444' }}>{error}</div>
          )}

          {/* Row 2: variant navigation */}
          {response && (
            <div style={ROW_STYLE}>
              <button
                type="button"
                style={BTN_STYLE}
                onClick={() => setActiveVariant(v => Math.max(0, v - 1))}
                disabled={activeVariant === 0}
              >
                ‹
              </button>
              <span>
                {activeVariant + 1} / {response.variants.length}
                {' — '}
                <strong>{response.variants[activeVariant]?.label}</strong>
              </span>
              <button
                type="button"
                style={BTN_STYLE}
                onClick={() =>
                  setActiveVariant(v =>
                    Math.min(response.variants.length - 1, v + 1),
                  )
                }
                disabled={activeVariant === response.variants.length - 1}
              >
                ›
              </button>
              <button type="button" style={BTN_PRIMARY_STYLE} onClick={handleAccept}>
                Accept
              </button>
              <button type="button" style={BTN_STYLE} onClick={handleClose}>
                Close
              </button>
            </div>
          )}

          {/* Brief */}
          {response?.brief && (
            <div
              style={{ cursor: 'pointer', opacity: 0.6, fontSize: '10px', textAlign: 'center' as const, maxWidth: '500px' }}
              onClick={() => setBriefExpanded(prev => !prev)}
            >
              {briefExpanded ? (
                <>
                  <div><strong>Job:</strong> {response.brief.sectionJob}</div>
                  <div><strong>Serves page:</strong> {response.brief.servesPageJob}</div>
                  <div><strong>Reader knows:</strong> {response.brief.readerAssumedToKnow}</div>
                  {response.brief.inheritsBeat && (
                    <div><strong>Inherits beat:</strong> {response.brief.inheritsBeat}</div>
                  )}
                  {response.brief.opensThreads.length > 0 && (
                    <div><strong>Opens threads:</strong> {response.brief.opensThreads.join('; ')}</div>
                  )}
                  {response.brief.assumptions.map((a, i) => (
                    <div key={i}>• {a}</div>
                  ))}
                </>
              ) : (
                <span>
                  {response.brief.sectionJob} ▸
                </span>
              )}
            </div>
          )}

          {/* Warnings */}
          {!isPageCharacterised && (
            <div style={WARN_STYLE}>
              ⚠ {currentRoute} has no page role — section will be written without page context
            </div>
          )}
          {isUnrecordedLink && upstreamRoute && (
            <div style={WARN_STYLE}>
              ⚠ no linking phrases recorded for {upstreamRoute} — continuity will be inferred, phrase protection unavailable
            </div>
          )}
          {protectedPhraseNodes.length > 0 && (
            <div style={WARN_STYLE}>
              {protectedPhraseNodes.flatMap(n =>
                n.carriesDownstreamReference.map(ref => (
                  <div key={`${n.id}-${ref}`}>⚠ &ldquo;{ref}&rdquo; is referenced downstream — rewriting may orphan it</div>
                )),
              )}
            </div>
          )}
          {extraction?.currentScore && (
            <div style={{
              ...WARN_STYLE,
              color: extraction.currentScore.passed === extraction.currentScore.total
                ? '#22c55e' : '#f59e0b',
            }}>
              current copy scores {extraction.currentScore.passed}/{extraction.currentScore.total}
              {extraction.currentScore.passed === extraction.currentScore.total
                ? ' · regeneration may regress'
                : ` · failed: ${extraction.currentScore.failed.join(', ')}`}
            </div>
          )}
          {flattenedNodes.length > 0 && (
            <div style={WARN_STYLE}>
              ⚠ Flattened markup: {flattenedNodes.join(', ')}
            </div>
          )}
          {overBudgetNodes.length > 0 && (
            <div style={WARN_STYLE}>
              ⚠ Over budget: {overBudgetNodes.join(', ')}
            </div>
          )}

          {/* Accepted count + emit */}
          {accepted.length > 0 && (
            <div style={ROW_STYLE}>
              <span style={BADGE_STYLE}>{accepted.length} section{accepted.length > 1 ? 's' : ''} accepted</span>
              {accepted.map((g, i) => (
                <button
                  key={i}
                  type="button"
                  style={{ ...BTN_STYLE, fontSize: '9px' }}
                  onClick={() => handleRemoveAccepted(i)}
                  title={`Remove: ${g.sectionType}`}
                >
                  ✕ {g.sectionType}
                </button>
              ))}
              <button type="button" style={BTN_PRIMARY_STYLE} onClick={handleEmit}>
                Copy apply prompt
              </button>
            </div>
          )}

          {/* Emit textarea fallback */}
          {showEmit && emitText && (
            <textarea
              readOnly
              value={emitText}
              style={EMIT_TEXTAREA_STYLE}
              rows={6}
              onFocus={e => e.target.select()}
            />
          )}
        </div>
      )}
    </>
  );
}
