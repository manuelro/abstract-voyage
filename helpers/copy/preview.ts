/**
 * DOM preview swap — store innerHTML, write textContent, revert all.
 * The mapping only needs to survive the current page session.
 */

const originals = new Map<string, string>();

export function previewNode(id: string, el: Element, text: string): void {
  if (!originals.has(id)) originals.set(id, el.innerHTML);
  el.textContent = text;
}

export function revertAll(elementMap: Map<string, Element>): void {
  originals.forEach((html, id) => {
    const el = elementMap.get(id);
    if (el) el.innerHTML = html;
  });
  originals.clear();
}

export function hasOriginals(): boolean {
  return originals.size > 0;
}
