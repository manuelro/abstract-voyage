// Production stand-in for components/Panel/ConfigPanel.tsx. Only ever
// rendered inside a `showAuthoringTools`-gated block, which is always
// false in production (see useAuthoringToolsVisibility stub) — this
// component never actually mounts, it just needs to exist so the import
// resolves. Never imported directly — see CONFIG-CHANGE-PROTOCOL.md.
export function ConfigPanel(_props: any) {
  return null
}
