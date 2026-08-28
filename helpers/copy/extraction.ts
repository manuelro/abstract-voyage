/**
 * Extraction builder — converts a DOM section + collected text nodes into
 * the ExtractionSchema payload the API endpoint expects.
 */

import type { OutlineEntry } from './picker';

export type ExtractionNode = {
  id: string;
  tag: string;
  text: string;
  chars: number;
  fontSize: number;
  fontWeight: number;
  isLink: boolean;
  isButton: boolean;
  hasElementChildren: boolean;
  siblingGroup: string | null;
  role: string | null;
  carriesDownstreamReference: string[];
  budget: { target: number; min: number; max: number; hard: boolean };
};

export type ExtractionPayload = {
  route: string;
  page: {
    purpose: string;
    visitorQuestion: string;
    narrativePosition: 'opens' | 'develops' | 'resolves';
    arrivesKnowing: string;
    leavesTo: string;
    mustNot: string[];
  };
  sectionType: string;
  homepageH1: string | null;
  pageOutline: OutlineEntry[];
  slotConstraints: string[];
  upstream: {
    route: string;
    copy: string;
    linkingPhrases: string[];
    pinnedBeat: string | null;
  } | null;
  currentScore: { passed: number; total: number; failed: string[] } | null;
  nodes: ExtractionNode[];
};

function isInsideTag(el: Element, tag: string): boolean {
  let current: Element | null = el;
  while (current) {
    if (current.tagName === tag.toUpperCase()) return true;
    current = current.parentElement;
  }
  return false;
}

function inferRole(el: Element, fontSize: number, allFontSizes: number[]): string | null {
  const tag = el.tagName.toLowerCase();
  if (/^h[1-6]$/.test(tag)) return 'heading';
  if (tag === 'button' || (tag === 'a' && el.closest('button'))) return 'cta_primary';
  if (tag === 'a') return 'cta_primary';
  const maxFs = Math.max(...allFontSizes);
  if (fontSize >= maxFs * 0.85 && tag !== 'a') return 'heading';
  if (tag === 'p' || tag === 'span' || tag === 'div') return 'body';
  return null;
}

function computeBudget(
  chars: number,
  isButton: boolean,
): { target: number; min: number; max: number; hard: boolean } {
  if (isButton) {
    return { target: chars, min: Math.max(1, chars - 4), max: chars + 4, hard: true };
  }
  if (chars < 20) {
    return { target: chars, min: Math.max(1, chars - 4), max: chars + 4, hard: false };
  }
  const tolerance = Math.round(chars * 0.15);
  return { target: chars, min: chars - tolerance, max: chars + tolerance, hard: false };
}

export function buildExtraction(
  textElements: Element[],
  siblingGroups: Map<Element, string>,
  outline: OutlineEntry[],
  elementMap: Map<string, Element>,
): ExtractionPayload {
  const allFontSizes = textElements.map(el => {
    const computed = window.getComputedStyle(el);
    return parseFloat(computed.fontSize) || 16;
  });

  const nodes: ExtractionNode[] = textElements.map((el, i) => {
    const id = `n${i}`;
    elementMap.set(id, el);

    const computed = window.getComputedStyle(el);
    const fontSize = parseFloat(computed.fontSize) || 16;
    const fontWeight = parseInt(computed.fontWeight, 10) || 400;
    const text = (el.textContent ?? '').trim();
    const chars = text.length;
    const isButton = isInsideTag(el, 'BUTTON');
    const isLink = isInsideTag(el, 'A');
    const hasElementChildren = el.children.length > 0;
    const siblingGroup = siblingGroups.get(el) ?? null;

    return {
      id,
      tag: el.tagName.toLowerCase(),
      text,
      chars,
      fontSize,
      fontWeight,
      isLink,
      isButton,
      hasElementChildren,
      siblingGroup,
      role: inferRole(el, fontSize, allFontSizes),
      carriesDownstreamReference: [],
      budget: computeBudget(chars, isButton),
    };
  });

  // Try to find the homepage H1 (may be sr-only)
  const h1 = document.querySelector('h1');
  const homepageH1 = h1?.textContent?.trim() ?? null;

  return {
    route: window.location.pathname,
    page: {
      purpose: '',
      visitorQuestion: '',
      narrativePosition: 'develops',
      arrivesKnowing: '',
      leavesTo: '',
      mustNot: [],
    },
    sectionType: '', // Set later from dropdown
    homepageH1,
    pageOutline: outline,
    slotConstraints: [],
    upstream: null,
    currentScore: null,
    nodes,
  };
}

// ── Section-type heuristic ──────────────────────────────────────────────────
// Pre-select the most likely section type based on node characteristics and
// cross-reference with page-map data.

type PageMapSection = {
  type: string;
  heading: string;
  node_count: number;
};

type PageMapRoute = {
  sections: PageMapSection[];
};

export function guessSectionType(
  extraction: ExtractionPayload,
  pageMap: Record<string, PageMapRoute> | null,
  taxonomyKeys: string[],
): string {
  // First: try matching from page-map by route and heading
  if (pageMap) {
    const routeData = pageMap[extraction.route];
    if (routeData?.sections) {
      const headingNode = extraction.nodes.find(n => n.role === 'heading');
      if (headingNode) {
        const match = routeData.sections.find(
          s => s.heading && headingNode.text.includes(s.heading.slice(0, 20)),
        );
        if (match && taxonomyKeys.includes(match.type)) return match.type;
      }
      // Fallback: closest node_count match
      const byCount = routeData.sections
        .filter(s => taxonomyKeys.includes(s.type))
        .sort(
          (a, b) =>
            Math.abs(a.node_count - extraction.nodes.length) -
            Math.abs(b.node_count - extraction.nodes.length),
        );
      if (byCount.length > 0) return byCount[0].type;
    }
  }

  // Fallback: first taxonomy key
  return taxonomyKeys[0] ?? '';
}
