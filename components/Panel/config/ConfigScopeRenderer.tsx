'use client';

import React from 'react';
import { useMemo, useState } from 'react';
import { ComponentConfigSection } from '../index';
import { ConfigControlResolver } from './controlResolver';
import { serializeConfigScopeBinding } from './serialization';
import type { ConfigScopeBinding } from './types';

export function ConfigScopeRenderer({ binding }: { binding: ConfigScopeBinding }) {
  const [open, setOpen] = useState(Boolean(binding.definition.defaultOpen));
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
      onToggle={() => setOpen(current => !current)}
    >
      <ConfigControlResolver binding={binding} />
    </ComponentConfigSection>
  );
}
