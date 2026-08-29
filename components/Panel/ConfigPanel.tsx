'use client';

import React, { useMemo } from 'react';
import {
  ConfigScopeList,
  serializeConfigScopeBindings,
  serializeConfigScopeBindingsDiff,
  useConfigPanelBindings,
  type ConfigScopeBinding,
} from './config';
import {
  ConfigCopyButton,
  PanelActionGroup,
  PanelButton,
  PanelShell,
} from './index';

/**
 * Canonical host for a referential config panel. Callers supply only their
 * local bindings; universal scopes are composed here before render, copy,
 * and reset so those operations always act on the same collection.
 */
export function ConfigPanel({
  title,
  localBindings,
  isOpen,
  onToggle,
  backgroundColor,
  copyLabel = 'COPY',
  copyDiffLabel = 'COPY DIFF',
  resetLabel = 'RESET',
}: {
  title: string;
  localBindings: ReadonlyArray<ConfigScopeBinding>;
  isOpen: boolean;
  onToggle: () => void;
  /** Rightmost-column color, or the page-surface fallback on non-split pages. */
  backgroundColor?: string;
  copyLabel?: string;
  copyDiffLabel?: string;
  resetLabel?: string;
}) {
  const bindings = useConfigPanelBindings(localBindings);
  const configText = useMemo(
    () => serializeConfigScopeBindings(bindings),
    [bindings],
  );
  // COPY DIFF: only scopes/fields that differ from their own defaultValue —
  // see serializeConfigScopeBindingsDiff's own doc comment (components/
  // Panel/config/serialization.ts) for the payload shape and the apply-time
  // procedure. COPY above is untouched — this is a second, independent
  // action, not a replacement.
  const diffConfigText = useMemo(
    () => serializeConfigScopeBindingsDiff(bindings),
    [bindings],
  );

  return (
    <PanelShell
      title={title}
      isOpen={isOpen}
      onToggle={onToggle}
      backgroundColor={backgroundColor}
      headerActions={(
        <PanelActionGroup ariaLabel={`${title} panel actions`}>
          <ConfigCopyButton text={configText} label={copyLabel} />
          <ConfigCopyButton
            text={diffConfigText}
            label={copyDiffLabel}
            disabled={diffConfigText.length === 0}
          />
          <PanelButton onClick={() => bindings.forEach(binding => binding.reset())}>
            {resetLabel}
          </PanelButton>
        </PanelActionGroup>
      )}
    >
      <ConfigScopeList bindings={bindings} />
    </PanelShell>
  );
}
