/**
 * One-shot cross-page handoff for the abstract.tsx hero composer's typed
 * draft: written right before a client-side `router.push('/contact')`, read
 * (and cleared) exactly once by contact.tsx's GuidedIntake on mount.
 *
 * A plain module-scoped singleton, not a React Context: this value is
 * write-once/read-once and nothing ever subscribes to it or re-renders
 * because of it, so there's nothing a Context buys here — and wrapping it in
 * one would mean `setState` firing (and re-rendering every consumer) in the
 * same synchronous handler that's about to unmount the writing page, for no
 * benefit. A plain module variable survives Next's Pages-Router client-side
 * transition exactly as well as anything mounted in pages/_app.tsx would
 * (same JS module scope, no reload) — no provider needed.
 *
 * Both the write and the read only ever happen client-side (a click handler,
 * a mount effect) — never during getStaticProps or any SSR pass — so there's
 * no risk of leaking one visitor's draft into another's server-rendered
 * response.
 */
let pendingComposerDraft: string | null = null;

export function setPendingComposerDraft(text: string): void {
  pendingComposerDraft = text;
}

/** Non-destructive read — safe to call from a lazy useState initializer,
 * which React (and specifically StrictMode in dev) may invoke more than
 * once without committing. Pair with clearPendingComposerDraft in a mount
 * effect, never inline here, or a double-invoke silently drops the draft. */
export function peekPendingComposerDraft(): string | null {
  return pendingComposerDraft;
}

export function clearPendingComposerDraft(): void {
  pendingComposerDraft = null;
}
