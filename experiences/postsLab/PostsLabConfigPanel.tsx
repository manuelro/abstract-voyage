'use client';

import React from 'react';
import { ConfigPanel } from '../../components/Panel/ConfigPanel';
import type { ConfigScopeBinding } from '../../components/Panel/config';

// Same generic shell/list composition as experiences/contact/
// ContactConfigPanel.tsx — never hand-written per-scope JSX here (see
// AGENTS.md's referential config-panel system), only the title differs.
export function PostsLabConfigPanel({
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
      title="POSTS LAB"
      isOpen={isOpen}
      onToggle={onToggle}
      localBindings={bindings}
      backgroundColor={backgroundColor}
    />
  );
}
