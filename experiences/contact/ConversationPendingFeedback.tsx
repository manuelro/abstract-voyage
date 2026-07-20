import React, { type CSSProperties } from 'react';
import type { ContactExperienceConfig } from './ContactExperience.config';

/**
 * Neutral pending indicator, rendered where the agent's next reply will
 * appear — never on the visitor's own message (an earlier version shimmered
 * the visitor's just-sent text, which read as evaluating what they wrote).
 * No label variance, no personality ("Thinking…"): three quiet dots, or
 * nothing at all under reduced motion, just the screen-reader status text.
 */
export function AgentPendingIndicator({
  config,
  className = '',
}: {
  config: ContactExperienceConfig;
  className?: string;
}) {
  if (!config.loadingEffectEnabled) {
    return <span className="sr-only" role="status">Loading</span>;
  }

  const style = {
    '--contact-loading-base': config.loadingBaseColor,
  } as CSSProperties;

  return (
    <span
      className={`contact-pending-indicator inline-flex items-center gap-1 py-1 ${className}`}
      role="status"
      aria-live="polite"
      style={style}
    >
      <span aria-hidden="true" className="contact-pending-dot" />
      <span aria-hidden="true" className="contact-pending-dot" />
      <span aria-hidden="true" className="contact-pending-dot" />
      <span className="sr-only">Loading</span>
    </span>
  );
}
