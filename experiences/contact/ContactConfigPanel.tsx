'use client';

import React from 'react';
import { ConfigPanel } from '../../components/Panel/ConfigPanel';
import type { ConfigScopeBinding } from '../../components/Panel/config';

export function ContactConfigPanel({
  bindings,
  isOpen,
  onToggle,
  backgroundColor,
}: {
  bindings: ReadonlyArray<ConfigScopeBinding>;
  isOpen: boolean;
  onToggle: () => void;
  backgroundColor?: string;
}) {
  return (
    <ConfigPanel
      title="CONTACT"
      isOpen={isOpen}
      onToggle={onToggle}
      localBindings={bindings}
      backgroundColor={backgroundColor}
    />
  );
}
