import React, { type CSSProperties } from 'react';
import type { ContactExperienceConfig } from './ContactExperience.config';

const MAX_VISIBLE_MESSAGE_LENGTH = 72;

export function getPendingFeedbackLabel(
  mode: ContactExperienceConfig['loadingLabelMode'],
  submittedMessage: string,
) {
  if (mode === 'thinking') return 'Thinking';

  const normalized = submittedMessage.trim().replace(/\s+/g, ' ');
  if (!normalized) return 'Thinking';
  if (normalized.length <= MAX_VISIBLE_MESSAGE_LENGTH) return normalized;
  return `${normalized.slice(0, MAX_VISIBLE_MESSAGE_LENGTH - 1).trimEnd()}…`;
}

export function ConversationPendingFeedback({
  config,
  submittedMessage,
  className = '',
}: {
  config: ContactExperienceConfig;
  submittedMessage: string;
  className?: string;
}) {
  if (!config.loadingEffectEnabled) {
    return <span className="sr-only" role="status">Thinking</span>;
  }

  const label = getPendingFeedbackLabel(config.loadingLabelMode, submittedMessage);
  const style = {
    '--contact-loading-base': config.loadingBaseColor,
    '--contact-loading-highlight': config.loadingHighlightColor,
    '--contact-loading-duration': `${config.loadingShimmerDurationMs}ms`,
  } as CSSProperties;

  return (
    <p
      className={`contact-pending-feedback min-h-6 max-w-full overflow-hidden text-ellipsis whitespace-nowrap font-sans text-sm ${className}`}
      data-effect={config.loadingEffectStyle}
      role="status"
      aria-live="polite"
      style={style}
    >
      <span className="contact-pending-feedback__text" aria-hidden="true">{label}</span>
      <span className="sr-only">Thinking</span>
    </p>
  );
}
