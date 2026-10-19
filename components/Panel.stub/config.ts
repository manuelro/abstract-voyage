// Production stand-in for components/Panel/config (the config-scope
// engine). Never imported directly — see CONFIG-CHANGE-PROTOCOL.md.

// createConfigScopeBinding/resolveConfigPanelSurfaceColor/ConfigScopeList's
// results are only ever read inside a showAuthoringTools-gated render,
// which never executes in production — no-ops are safe, their return
// values are never dereferenced.
export function createConfigScopeBinding(_args: any) {
  return null
}

export function resolveConfigPanelSurfaceColor(_args: any) {
  return undefined
}

export function ConfigScopeList(_props: any) {
  return null
}

// useConfigPanelBindings is different: it's a hook, called unconditionally
// at component top-level regardless of showAuthoringTools (about.tsx/
// abstract.tsx both call it outside any gate) — a no-op returning null
// would break any downstream code expecting an array. Real (if trivial)
// passthrough: the production-real behavior of "no global bindings exist"
// is simply "the local bindings are the whole list," which is what this
// returns without needing the real global-bindings merge/dedupe logic.
export function useConfigPanelBindings(localBindings: any) {
  return localBindings
}

// defineConfigScope: every OTHER page defines its config scope in a sibling
// *.panel.ts file (pages/about.panel.ts, pages/contact.panel.ts, ...),
// which scripts/generate-panel-stubs.js wholesale-replaces in production —
// so their own real defineConfigScope call never actually runs there.
// pages/wall.tsx is the one page that calls defineConfigScope directly at
// its own module scope (WALL_PANEL, pages/wall.tsx), which can't be
// wholesale-stubbed the way a *.panel.ts recipe file can (the page itself
// still has to render) — so this is the one call site where a stubbed
// defineConfigScope genuinely executes in production. Confirmed the hard
// way: PLAN-PRODUCTION-ROUTE-ALLOWLIST.md's first real `next build` of the
// wall route crashed here (defineConfigScope undefined, called at module
// scope with no gate). Its result (WALL_PANEL) only ever flows into the
// already-safely-stubbed createConfigScopeBinding above as a `definition`
// argument that function never reads — but matching the same safe-Proxy
// shape generate-panel-stubs.js's own generated stubs already use (see any
// pages/*.panel.stub.ts) costs nothing and stays correct if a future call
// site reads a property off the result before any authoring-tools gate.
export function defineConfigScope(_recipe: any): any {
  const p: any = new Proxy(() => undefined, {
    get(t, prop) { return prop in t ? (t as any)[prop] : p },
    apply() { return undefined },
  })
  return p
}
