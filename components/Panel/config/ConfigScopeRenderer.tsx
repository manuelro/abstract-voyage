'use client';

import React from 'react';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { ComponentConfigSection } from '../index';
import { ConfigControlResolver } from './controlResolver';
import { serializeConfigScopeBinding } from './serialization';
import type { ConfigScopeBinding } from './types';
import { useConfigScopeOpenState } from './useConfigScopeOpenState';
import { useOptionalSharedDesignConfig } from '../../SharedDesignConfigProvider';
import { DEFAULT_PANEL_SHELL_CONFIG, normalizePanelShellConfig } from './shell';

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

  // PanelShellConfig.hoverIntentExpandEnabled/hoverIntentDelayMs — same
  // normalize-on-read defensiveness PanelShell itself uses, since
  // SharedDesignConfigProvider's own panelShellConfig state isn't
  // guaranteed pre-normalized on every write.
  const sharedDesignConfig = useOptionalSharedDesignConfig();
  const panelConfig = useMemo(
    () => normalizePanelShellConfig(sharedDesignConfig?.panelShellConfig ?? DEFAULT_PANEL_SHELL_CONFIG),
    [sharedDesignConfig?.panelShellConfig],
  );
  const hoverIntentTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearHoverIntentTimer = useCallback(() => {
    if (hoverIntentTimeoutRef.current !== null) {
      clearTimeout(hoverIntentTimeoutRef.current);
      hoverIntentTimeoutRef.current = null;
    }
  }, []);
  const onHoverIntentStart = useCallback(() => {
    if (!panelConfig.hoverIntentExpandEnabled || open) return;
    clearHoverIntentTimer();
    hoverIntentTimeoutRef.current = setTimeout(() => {
      hoverIntentTimeoutRef.current = null;
      toggle();
    }, panelConfig.hoverIntentDelayMs);
  }, [panelConfig.hoverIntentExpandEnabled, panelConfig.hoverIntentDelayMs, open, toggle, clearHoverIntentTimer]);

  // A click (or an external activeItemIndex-style driver) can open this
  // scope while a hover-intent timer is already pending — without this, the
  // pending timer's own stale `toggle` closure (captured while `open` was
  // still false) fires later and flips it back closed. Cancel on every
  // `open` transition, not just pointer-leave.
  useEffect(() => {
    if (open) clearHoverIntentTimer();
  }, [open, clearHoverIntentTimer]);

  // Timer must not outlive the section's own instance (e.g. the scope list
  // re-filtering unmounts this row while a dwell is in flight).
  useEffect(() => clearHoverIntentTimer, [clearHoverIntentTimer]);

  return (
    <ComponentConfigSection
      component={binding.definition.component}
      title={binding.definition.title}
      summary={binding.definition.summary}
      configText={configText}
      open={open}
      onToggle={toggle}
      isGlobal={binding.global}
      onHoverIntentStart={onHoverIntentStart}
      onHoverIntentCancel={clearHoverIntentTimer}
    >
      <ConfigControlResolver binding={binding} />
    </ComponentConfigSection>
  );
}
