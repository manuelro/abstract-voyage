import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
  ConfigScopeRenderer,
  createConfigScopeBinding,
  serializeConfigScopeBinding,
} from '../../components/Panel/config';
import {
  DEFAULT_CONTACT_EXPERIENCE_CONFIG,
} from './ContactExperience.config';
import { CONTACT_EXPERIENCE_PANEL } from './ContactExperience.panel';
import { AgentPendingIndicator } from './ConversationPendingFeedback';

describe('ContactExperience configuration', () => {
  it('represents every public config key in the generic panel', () => {
    const fieldKeys = CONTACT_EXPERIENCE_PANEL.fields.flatMap(field => (
      field.kind === 'group' ? field.fields.map(child => child.key) : field.key
    ));

    expect([...fieldKeys].sort()).toEqual(
      Object.keys(DEFAULT_CONTACT_EXPERIENCE_CONFIG).sort(),
    );
  });

  it('renders and serializes its configuration through Panel primitives', () => {
    const binding = createConfigScopeBinding({
      definition: CONTACT_EXPERIENCE_PANEL,
      value: DEFAULT_CONTACT_EXPERIENCE_CONFIG,
      onChange: () => undefined,
    });
    const html = renderToStaticMarkup(<ConfigScopeRenderer binding={binding} />);

    expect(html).toContain('Contact experience');
    expect(html).toContain('Conversation width');
    expect(html).toContain('Loading label');
    expect(html).toContain('Loading highlight');
    expect(serializeConfigScopeBinding(binding)).toContain(
      'target_symbol: DEFAULT_CONTACT_EXPERIENCE_CONFIG',
    );
  });
});

describe('AgentPendingIndicator', () => {
  it('renders an accessible status with no visible label, positioned for the agent side', () => {
    const html = renderToStaticMarkup(
      <AgentPendingIndicator config={DEFAULT_CONTACT_EXPERIENCE_CONFIG} />,
    );

    expect(html).toContain('role="status"');
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain('contact-pending-dot');
    expect(html).toContain('Loading');
  });

  it('still exposes an accessible status when the visual effect is disabled', () => {
    const html = renderToStaticMarkup(
      <AgentPendingIndicator
        config={{ ...DEFAULT_CONTACT_EXPERIENCE_CONFIG, loadingEffectEnabled: false }}
      />,
    );

    expect(html).toContain('role="status"');
    expect(html).toContain('Loading');
    expect(html).not.toContain('contact-pending-dot');
  });
});

