/**
 * Picker helpers — ancestor heuristic and text-node collection for the
 * copy tool's section selection. All pure functions, no React dependency.
 */

// ── Ancestor heuristic ─────────────────────────────────────────────────────
// Walk up from the hover target until reaching a section-like ancestor.
// The operator will tune this — keep it in one clearly named function.

const SECTION_TAGS = new Set(['SECTION', 'HEADER', 'FOOTER', 'ARTICLE', 'MAIN']);
const MIN_WIDTH_RATIO = 0.6;
const MIN_TEXT_CHILDREN = 2;

function hasMultipleTextDescendants(el: Element): boolean {
  let count = 0;
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      return node.textContent && node.textContent.trim().length > 0
        ? NodeFilter.FILTER_ACCEPT
        : NodeFilter.FILTER_REJECT;
    },
  });
  while (walker.nextNode()) {
    count++;
    if (count >= MIN_TEXT_CHILDREN) return true;
  }
  return false;
}

export function findSectionAncestor(target: Element): Element {
  let current: Element | null = target;
  while (current && current !== document.body) {
    if (SECTION_TAGS.has(current.tagName)) return current;
    const rect = current.getBoundingClientRect();
    if (
      rect.width >= window.innerWidth * MIN_WIDTH_RATIO &&
      hasMultipleTextDescendants(current)
    ) {
      return current;
    }
    current = current.parentElement;
  }
  return target;
}

/**
 * Widen: go one level up from the current ancestor (if possible).
 * Narrow: find the first qualifying child (section tag or wide+text).
 */
export function widenAncestor(current: Element): Element {
  const parent = current.parentElement;
  if (!parent || parent === document.body) return current;
  return parent;
}

export function narrowAncestor(current: Element): Element {
  for (const child of Array.from(current.children)) {
    if (SECTION_TAGS.has(child.tagName)) return child;
    const rect = child.getBoundingClientRect();
    if (
      rect.width >= window.innerWidth * MIN_WIDTH_RATIO &&
      hasMultipleTextDescendants(child)
    ) {
      return child;
    }
  }
  return current;
}

// ── Text-bearing node collection ────────────────────────────────────────────
// Innermost text-bearing elements: non-empty textContent, no qualifying
// element child. This gives us the leaf text nodes the model will rewrite.

function isTextBearing(el: Element): boolean {
  const text = el.textContent?.trim();
  if (!text) return false;
  // Check if any child element is itself text-bearing (if so, this one is not innermost)
  for (const child of Array.from(el.children)) {
    if (isTextBearing(child)) return false;
  }
  return true;
}

export function collectTextNodes(root: Element): Element[] {
  const result: Element[] = [];
  const walk = (el: Element) => {
    if (isTextBearing(el)) {
      result.push(el);
      return; // Don't recurse further — this is innermost
    }
    for (const child of Array.from(el.children)) {
      walk(child);
    }
  };
  walk(root);
  return result;
}

// ── Page outline ────────────────────────────────────────────────────────────
// Build orientation context from sibling sections on the page.

export type OutlineEntry = {
  index: number;
  heading: string;
  excerpt: string;
  isTarget: boolean;
};

export function buildPageOutline(target: Element): OutlineEntry[] {
  // Find all section-like siblings at the target's level
  const parent = target.parentElement ?? document.body;
  const siblings: Element[] = [];
  for (const child of Array.from(parent.children)) {
    if (
      SECTION_TAGS.has(child.tagName) ||
      (child.getBoundingClientRect().width >= window.innerWidth * MIN_WIDTH_RATIO &&
        hasMultipleTextDescendants(child))
    ) {
      siblings.push(child);
    }
  }
  // If target itself wasn't found among siblings, just include it
  if (!siblings.includes(target)) {
    siblings.push(target);
    siblings.sort((a, b) => {
      const posA = a.compareDocumentPosition(b);
      return posA & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
    });
  }

  return siblings.map((el, index) => {
    const heading =
      el.querySelector('h1, h2, h3')?.textContent?.trim() ?? '';
    const fullText = el.textContent?.trim() ?? '';
    const words = fullText.split(/\s+/).slice(0, 12);
    return {
      index,
      heading,
      excerpt: words.join(' '),
      isTarget: el === target,
    };
  });
}

// ── Sibling group detection ─────────────────────────────────────────────────
// Assign matching siblingGroup keys to repeated structures (cards, bios, etc.)

export function detectSiblingGroups(nodes: Element[]): Map<Element, string> {
  const groups = new Map<Element, string>();
  // Group elements by parent + tag + similar structure
  const byParent = new Map<Element, Element[]>();
  for (const node of nodes) {
    const parent = node.parentElement;
    if (!parent) continue;
    if (!byParent.has(parent)) byParent.set(parent, []);
    byParent.get(parent)!.push(node);
  }
  let groupIndex = 0;
  byParent.forEach((children) => {
    if (children.length < 2) return;
    // Check if children share the same tag
    const tags = new Set(children.map((c: Element) => c.tagName));
    if (tags.size !== 1) return;
    const groupKey = `sg${groupIndex++}`;
    children.forEach((child: Element) => {
      groups.set(child, groupKey);
    });
  });
  return groups;
}
