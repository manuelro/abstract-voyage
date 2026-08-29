'use client';

import React from 'react';
import { useMemo } from 'react';
import { ComponentConfigSection } from '../index';
import { ConfigControlResolver } from './controlResolver';
import { serializeConfigScopeBinding } from './serialization';
import type { ConfigScopeBinding } from './types';
import { useConfigScopeOpenState } from './useConfigScopeOpenState';

export function ConfigScopeRenderer({ binding }: { binding: ConfigScopeBinding }) {
  // Shared, persisted disclosure state (see useConfigScopeOpenState's own
  // doc comment) — not local useState. This is what lets the section stay
  // expanded across the whole settings panel closing and reopening, and
  // keeps two mounted instances of the same scope id (e.g. a "Frequently
  // used" pinned copy alongside its full-list copy) always agree.
  const [open, toggle] = useConfigScopeOpenState(
    binding.definition.id,
    Boolean(binding.definition.defaultOpen),
  );
  const configText = useMemo(
    () => serializeConfigScopeBinding(binding),
    [binding],
  );

  return (
    <ComponentConfigSection
      component={binding.definition.component}
      title={binding.definition.title}
      summary={binding.definition.summary}
      configText={configText}
      open={open}
      onToggle={toggle}
      isGlobal={binding.global}
    >
      <ConfigControlResolver binding={binding} />
    </ComponentConfigSection>
  );
}
