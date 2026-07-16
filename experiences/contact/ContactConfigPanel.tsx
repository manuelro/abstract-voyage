'use client';

import React, { useMemo } from 'react';
import {
  ConfigCopyButton,
  PanelActionGroup,
  PanelButton,
  PanelShell,
} from '../../components/Panel';
import {
  ConfigScopeRenderer,
  serializeConfigScopeBinding,
  type ConfigScopeBinding,
} from '../../components/Panel/config';

export function ContactConfigPanel({
  binding,
  isOpen,
  onToggle,
}: {
  binding: ConfigScopeBinding;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const configText = useMemo(() => serializeConfigScopeBinding(binding), [binding]);

  return (
    <PanelShell
      title="CONTACT"
      isOpen={isOpen}
      onToggle={onToggle}
      headerActions={(
        <PanelActionGroup ariaLabel="Contact panel actions">
          <ConfigCopyButton text={configText} label="COPY" />
          <PanelButton onClick={binding.reset}>RESET</PanelButton>
        </PanelActionGroup>
      )}
    >
      <ConfigScopeRenderer binding={binding} />
    </PanelShell>
  );
}
