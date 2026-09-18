'use client';

import React from 'react';
import {
  ConfigScopeList,
  useConfigPanelBindings,
  type ConfigScopeBinding,
} from './config';
import {
  PanelActionGroup,
  PanelShell,
  PanelStandardHeaderActions,
} from './index';

/**
 * Canonical host for a referential config panel. Callers supply only their
 * local bindings; universal scopes are composed here before render, copy,
 * and reset so those operations always act on the same collection.
 *
 * Header action row is `PanelStandardHeaderActions` — the exact same
 * component `pages/abstract.tsx`/`pages/about.tsx` compose into their own
 * top-level `<PanelShell>` directly. This host used to hand-assemble its
 * own COPY/COPY DIFF/RESET row from the same lower-level primitives
 * (`ConfigCopyButton`/`PanelButton`/`serializeConfigScopeBindings`/-`Diff`)
 * independently of that component — the exact drift `PanelStandardHeaderActions`'s
 * own doc comment already documents happening once between abstract.tsx and
 * about.tsx (abstract.tsx had COPY DIFF, about.tsx didn't), which is why
 * that component exists in the first place. This host had silently
 * regressed to that same pre-centralization shape (missing UPDATE DIFF
 * entirely, operator-reported: /posts's own "POSTS LAB" panel — and, by the
 * same route, /contact's own "CONTACT" panel, both `<ConfigPanel>` callers —
 * never got it even after PanelStandardHeaderActions started fixing it
 * everywhere else). Routing through the shared component here means every
 * `<ConfigPanel>` caller gets any future header-action enhancement
 * automatically, the same guarantee PanelShell callers already have — no
 * third independent copy to keep in sync by hand again.
 *
 * copyLabel/copyDiffLabel/resetLabel customization props were removed along
 * with the hand-rolled row — PanelStandardHeaderActions' own labels (COPY
 * ALL/COPY DIFF/RESET) are fixed for the same reason its own doc comment
 * gives for computing its text server-side rather than accepting it as
 * props: a caller can't independently drift a label away from every other
 * page's own panel again. No existing caller passed a custom value for any
 * of the three.
 */
export function ConfigPanel({
  title,
  localBindings,
  isOpen,
  onToggle,
  backgroundColor,
}: {
  title: string;
  localBindings: ReadonlyArray<ConfigScopeBinding>;
  isOpen: boolean;
  onToggle: () => void;
  /** Rightmost-column color, or the page-surface fallback on non-split pages. */
  backgroundColor?: string;
}) {
  const bindings = useConfigPanelBindings(localBindings);

  return (
    <PanelShell
      title={title}
      isOpen={isOpen}
      onToggle={onToggle}
      backgroundColor={backgroundColor}
      headerActions={(
        <PanelActionGroup ariaLabel={`${title} panel actions`}>
          <PanelStandardHeaderActions
            bindings={bindings}
            onReset={() => bindings.forEach(binding => binding.reset())}
          />
        </PanelActionGroup>
      )}
    >
      <ConfigScopeList bindings={bindings} />
    </PanelShell>
  );
}
