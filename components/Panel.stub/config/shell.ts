// Production stand-in for components/Panel/config/shell.ts. Consumed
// unconditionally by SharedDesignConfigProvider.tsx (mounted in _app.tsx
// for every page), so this stub exists purely to keep that shared
// provider's own state shape intact in production — panelShellConfig is
// never read by anything except the (also-stubbed) panel UI itself. Never
// imported directly — see CONFIG-CHANGE-PROTOCOL.md.
export type PanelShellConfig = Record<string, unknown>
export const DEFAULT_PANEL_SHELL_CONFIG: PanelShellConfig = {}
