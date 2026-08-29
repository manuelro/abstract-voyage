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
