// Production stand-in for components/Panel/index.tsx, substituted in by
// next.config.js's webpack alias (production builds only). Every UI
// component here is only ever rendered inside a showAuthoringTools-gated
// block, which is always false in production (see
// useAuthoringToolsVisibility's own stub) — none of these ever actually
// mount, they just need to exist so the import resolves and JSX using them
// type-checks. clamp/getStepPrecision/formatKnobValue are the one
// exception: the real index.tsx re-exports them from ../mathUtils
// specifically because they're genuinely used outside authoring-gated code
// too ("real, always-shipped — not panel-UI", that file's own comment) —
// this stub re-exports the same real implementations, not no-ops. Never
// imported directly — see CONFIG-CHANGE-PROTOCOL.md.
export { clamp, getStepPrecision, formatKnobValue } from '../mathUtils'

// One independently-named function per export, not a single shared `noop`
// reference — a shared local name is exactly the collision webpack's
// scope-hoisting had to disambiguate for generate-panel-stubs.js's own
// output (see that script's own doc comment), which wove a real panel
// component's name back into the compiled bundle as part of the renamed
// identifier. This file is hand-written (components/Panel/ itself is
// excluded from that script's scan), so the same fix applies by
// construction here: nothing shared enough to ever need disambiguating.
export function PanelShell(_props: any) { return null }
export function PanelStandardHeaderActions(_props: any) { return null }
export function ConfigCopyButton(_props: any) { return null }
export function PanelButton(_props: any) { return null }
export function PanelActionGroup(_props: any) { return null }
export function PanelControlGroup(_props: any) { return null }
export function SegmentedControl(_props: any) { return null }
export function TabStrip(_props: any) { return null }
export function AreaSwitch(_props: any) { return null }
export function Select(_props: any) { return null }
export function ComponentConfigSection(_props: any) { return null }
export function Sect(_props: any) { return null }
export function SubLabel(_props: any) { return null }
export function PanelDescription(_props: any) { return null }
export function Knob(_props: any) { return null }
export function Toggle(_props: any) { return null }
export function ColorInput(_props: any) { return null }
export function PanelSummary(_props: any) { return null }
export function SummaryRow(_props: any) { return null }
export const PanelNestingContext = { Provider: PanelSummary, Consumer: PanelSummary }
