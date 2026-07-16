'use client';
import React from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { useEffect, useId, useRef, useState } from 'react';
import styles from './Panel.module.css';

// ── Utilities ─────────────────────────────────────────────────────────────────

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function getStepPrecision(step: number) {
  if (!Number.isFinite(step) || step <= 0) return 0;
  const text = step.toString();
  if (text.includes('e-')) return Number(text.split('e-')[1]);
  if (!text.includes('.')) return 0;
  return text.split('.')[1].length;
}

export function formatKnobValue(value: number, step: number) {
  const precision = getStepPrecision(step);
  if (precision <= 0) return Math.round(value).toString();
  return value.toFixed(precision);
}

// ── Component ownership + config copy ────────────────────────────────────────

async function writePanelConfigToClipboard(text: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textArea = document.createElement('textarea');
  textArea.value = text;
  textArea.setAttribute('readonly', '');
  textArea.style.cssText = 'position:fixed;opacity:0;top:0;left:0;pointer-events:none;';
  document.body.appendChild(textArea);
  try {
    textArea.focus();
    textArea.select();
    if (!document.execCommand('copy')) throw new Error('Clipboard copy failed');
  } finally {
    document.body.removeChild(textArea);
  }
}

export function ConfigCopyButton({
  text,
  label = 'COPY CONFIG',
  ariaLabel,
}: {
  text: string;
  label?: string;
  ariaLabel?: string;
}) {
  const [status, setStatus] = useState<'idle' | 'copied' | 'error'>('idle');
  const resetTimerRef = useRef<number | null>(null);

  useEffect(() => () => {
    if (resetTimerRef.current !== null) window.clearTimeout(resetTimerRef.current);
  }, []);

  const handleCopy = async () => {
    if (resetTimerRef.current !== null) window.clearTimeout(resetTimerRef.current);
    try {
      await writePanelConfigToClipboard(text);
      setStatus('copied');
    } catch {
      setStatus('error');
    }
    resetTimerRef.current = window.setTimeout(() => {
      setStatus('idle');
      resetTimerRef.current = null;
    }, 1800);
  };

  const visibleLabel = status === 'copied'
    ? 'COPIED'
    : status === 'error'
      ? 'ERR'
      : label;

  return (
    <button
      type="button"
      className={`${styles.panelButton} ${styles.copyButton}`}
      onClick={handleCopy}
      aria-label={status === 'idle' ? (ariaLabel ?? label) : visibleLabel}
      aria-live="polite"
      data-status={status}
    >
      {visibleLabel}
    </button>
  );
}

export function PanelButton({
  children,
  onClick,
  ariaLabel,
}: {
  children: ReactNode;
  onClick: () => void;
  ariaLabel?: string;
}) {
  return (
    <button
      type="button"
      className={styles.panelButton}
      onClick={onClick}
      aria-label={ariaLabel}
    >
      {children}
    </button>
  );
}

export function PanelActionGroup({
  children,
  ariaLabel = 'Panel actions',
}: {
  children: ReactNode;
  ariaLabel?: string;
}) {
  return (
    <div className={styles.actionGroup} role="group" aria-label={ariaLabel}>
      {children}
    </div>
  );
}

export function PanelControlGroup({ children }: { children: ReactNode }) {
  return <div className={styles.control}>{children}</div>;
}

export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
}: {
  value: T;
  options: ReadonlyArray<{ label: string; value: T }>;
  onChange: (value: T) => void;
  ariaLabel: string;
}) {
  return (
    <div
      className={styles.segmented}
      role="group"
      aria-label={ariaLabel}
      style={{ '--panel-option-count': options.length } as CSSProperties}
    >
      {options.map(option => (
        <button
          key={option.value}
          type="button"
          className={styles.segmentButton}
          data-selected={option.value === value ? 'true' : 'false'}
          aria-pressed={option.value === value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function ComponentConfigSection({
  component,
  title,
  summary,
  configText,
  open,
  onToggle,
  children,
}: {
  component: string;
  title: string;
  summary?: string;
  configText: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  const contentId = useId();

  return (
    <section className={styles.componentSection} data-open={open ? 'true' : 'false'}>
      <button
        type="button"
        className={styles.componentSectionToggle}
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={contentId}
        aria-label={`${title}, ${component} configuration`}
      >
        <span className={styles.componentSectionTitleWrap}>
          <span className={styles.componentSectionTitle}>{title}</span>
          <span className={styles.componentOwnerIndicator} aria-hidden="true">
            <span className={styles.componentOwnerName}>{component}</span>
          </span>
        </span>
        <span className={styles.sectionChevron} aria-hidden="true" />
      </button>
      <div
        id={contentId}
        className={styles.sectionDisclosure}
        aria-hidden={!open}
      >
        <div className={styles.sectionDisclosureInner}>
          <div className={styles.componentSectionBody}>
            <div className={styles.componentSectionUtility}>
              {summary ? <div className={styles.componentSectionSummary}>{summary}</div> : null}
              <div className={styles.componentSectionActions}>
                <ConfigCopyButton
                  text={configText}
                  label="COPY"
                  ariaLabel={`Copy ${component} ${title} configuration`}
                />
              </div>
            </div>
            {children}
          </div>
        </div>
      </div>
    </section>
  );
}

// ── PanelShell ────────────────────────────────────────────────────────────────

function SettingsTuneIcon() {
  return (
    <svg
      className={styles.launcherIcon}
      viewBox="0 0 18 18"
      aria-hidden="true"
    >
      <path d="M2.25 4.25h13.5M2.25 9h13.5M2.25 13.75h13.5" />
      <circle cx="6" cy="4.25" r="1.4" />
      <circle cx="11.75" cy="9" r="1.4" />
      <circle cx="7.75" cy="13.75" r="1.4" />
    </svg>
  );
}

export function PanelShell({
  title,
  isOpen,
  onToggle,
  headerActions,
  appearance = 'dark',
  children,
}: {
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  headerActions?: ReactNode;
  appearance?: 'dark' | 'light';
  children?: ReactNode;
}) {
  const contentId = useId();

  if (!isOpen) {
    return (
      <button
        type="button"
        className={styles.panelLauncher}
        data-appearance={appearance}
        onClick={onToggle}
        aria-label={`Open ${title} settings`}
        aria-expanded={false}
        aria-controls={contentId}
      >
        <span className={styles.launcherLabel}>SETTINGS</span>
        <SettingsTuneIcon />
      </button>
    );
  }

  return (
    <section
      className={styles.panel}
      data-open="true"
      data-appearance={appearance}
      aria-label={`${title} settings`}
    >
      {/* Blur layer isolated from scroll — backdrop-filter on a scroll ancestor causes repaint every scroll tick */}
      <div className={styles.backdrop} />
      <div className={styles.panelHeader}>
        <button
          type="button"
          className={styles.panelTitle}
          onClick={onToggle}
          aria-label={`Close ${title} settings`}
          aria-expanded={true}
          aria-controls={contentId}
        >
          {title}
        </button>
        {headerActions && (
          <div className={styles.headerActions}>{headerActions}</div>
        )}
      </div>
      <div id={contentId} className={styles.scrollArea}>
        {children}
      </div>
    </section>
  );
}

// ── Sect ──────────────────────────────────────────────────────────────────────

export function Sect({
  title,
  open,
  onToggle,
  children,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  const contentId = useId();

  return (
    <div className={styles.section} data-open={open ? 'true' : 'false'}>
      <button
        type="button"
        className={styles.sectionToggle}
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={contentId}
      >
        <span>{title}</span>
        <span className={styles.sectionChevron} aria-hidden="true" />
      </button>
      <div
        id={contentId}
        className={styles.sectionDisclosure}
        aria-hidden={!open}
      >
        <div className={styles.sectionDisclosureInner}>
          <div className={styles.sectionContent}>{children}</div>
        </div>
      </div>
    </div>
  );
}

// ── SubLabel ──────────────────────────────────────────────────────────────────

export function SubLabel({ children }: { children: ReactNode }) {
  return <div className={styles.subLabel}>{children}</div>;
}

export function PanelDescription({ children }: { children: ReactNode }) {
  return <div className={styles.description}>{children}</div>;
}

// ── Knob ──────────────────────────────────────────────────────────────────────

export function Knob({
  label,
  value,
  min,
  max,
  step,
  onChange,
  unit = '',
  accent = '',
  description = '',
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  unit?: string;
  accent?: string;
  description?: string;
}) {
  const safe = Number.isFinite(value) ? clamp(value, min, max) : min;
  const pct = max > min ? clamp((safe - min) / (max - min), 0, 1) : 0;
  const formatted = formatKnobValue(safe, step);
  const [draft, setDraft] = useState(formatted);
  const valueRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (document.activeElement === valueRef.current) return;
    setDraft(formatted);
  }, [formatted]);

  const sanitizeDraft = (next: string) => {
    const allowsNegative = min < 0;
    let cleaned = next.replace(allowsNegative ? /[^0-9.-]/g : /[^0-9.]/g, '');
    const firstDot = cleaned.indexOf('.');
    if (firstDot !== -1) {
      cleaned = `${cleaned.slice(0, firstDot + 1)}${cleaned.slice(firstDot + 1).replace(/\./g, '')}`;
    }
    if (allowsNegative) cleaned = cleaned.replace(/(?!^)-/g, '');
    return cleaned;
  };

  const commitDraft = (next: string) => {
    const parsed = Number(next);
    if (!Number.isFinite(parsed)) {
      setDraft(formatted);
      return;
    }
    const committed = clamp(Number(parsed.toFixed(6)), min, max);
    const committedText = formatKnobValue(committed, step);
    setDraft(committedText);
    onChange(committed);
  };

  const controlStyle = {
    '--panel-range-progress': `${pct * 100}%`,
    ...(accent ? { '--panel-control-accent': accent } : {}),
  } as CSSProperties;

  return (
    <div className={styles.control} style={controlStyle}>
      <div className={styles.controlHeader}>
        <div className={styles.controlLabelWrap}>
          {accent && <span className={styles.controlAccent} />}
          <span className={styles.controlLabel}>{label}</span>
        </div>
        <div className={styles.controlValue}>
          <input
            ref={valueRef}
            type="text"
            className={styles.valueInput}
            value={draft}
            inputMode="decimal"
            role="spinbutton"
            aria-label={`${label} value`}
            aria-valuemin={min}
            aria-valuemax={max}
            aria-valuenow={safe}
            title="Numbers only. Press Enter or click away to apply."
            onChange={event => setDraft(sanitizeDraft(event.target.value))}
            onBlur={event => commitDraft(event.currentTarget.value)}
            onFocus={event => event.currentTarget.select()}
            onKeyDown={event => {
              if (event.key === 'Enter') {
                event.preventDefault();
                commitDraft(event.currentTarget.value);
                event.currentTarget.blur();
                return;
              }
              if (event.key === 'Escape') {
                event.preventDefault();
                setDraft(formatted);
                event.currentTarget.blur();
              }
            }}
          />
          {unit && <span>{unit}</span>}
        </div>
      </div>
      <div className={styles.rangeHitArea}>
        <div className={styles.rangeTrack} />
        <div className={styles.rangeProgress} />
        <div className={styles.rangeThumb} />
        <input
          type="range"
          className={styles.rangeInput}
          value={safe}
          min={min}
          max={max}
          step={step}
          onChange={event => onChange(Number(event.target.value))}
          aria-label={label}
        />
      </div>
      {description && <div className={styles.description}>{description}</div>}
    </div>
  );
}

// ── Toggle ────────────────────────────────────────────────────────────────────

export function Toggle({ label, checked, onChange, description = '' }: { label: string; checked: boolean; onChange: (value: boolean) => void; description?: string }) {
  return (
    <div className={styles.toggle}>
      <label className={styles.toggleLabel}>
        <span className={styles.controlLabel}>{label}</span>
        <span className={styles.toggleTrack} data-checked={checked ? 'true' : 'false'}>
          <span className={styles.toggleThumb} />
        </span>
        <input className={styles.toggleInput} type="checkbox" checked={checked} onChange={event => onChange(event.target.checked)} />
      </label>
      {description && <div className={styles.description}>{description}</div>}
    </div>
  );
}

// ── ColorInput ────────────────────────────────────────────────────────────────

export function ColorInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const [draft, setDraft] = useState(value);
  const pickerValue = /^#[0-9a-fA-F]{6}$/.test(value) ? value : '#ffffff';

  useEffect(() => {
    setDraft(value);
  }, [value]);

  const commitDraft = (nextValue: string) => {
    setDraft(nextValue);
    if (/^#[0-9a-fA-F]{6}$/.test(nextValue)) onChange(nextValue);
  };

  return (
    <label className={styles.colorControl}>
      <span className={styles.controlLabel}>{label}</span>
      <div className={styles.colorInputs}>
        <input
          className={styles.colorPicker}
          type="color"
          value={pickerValue}
          onChange={event => commitDraft(event.target.value)}
          aria-label={`${label} picker`}
        />
        <input
          className={styles.textInput}
          type="text"
          value={draft}
          onChange={event => commitDraft(event.target.value)}
          onBlur={() => {
            if (!/^#[0-9a-fA-F]{6}$/.test(draft)) setDraft(value);
          }}
          onKeyDown={event => {
            if (event.key === 'Enter') {
              event.preventDefault();
              if (/^#[0-9a-fA-F]{6}$/.test(event.currentTarget.value)) {
                onChange(event.currentTarget.value);
              } else {
                setDraft(value);
              }
              event.currentTarget.blur();
              return;
            }
            if (event.key === 'Escape') {
              event.preventDefault();
              setDraft(value);
              event.currentTarget.blur();
            }
          }}
          aria-label={`${label} hex value`}
        />
      </div>
    </label>
  );
}

// ── SummaryRow ────────────────────────────────────────────────────────────────

export function PanelSummary({ children }: { children: ReactNode }) {
  return <div className={styles.summary}>{children}</div>;
}

export function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.summaryRow}>
      <span className={styles.summaryLabel}>{label}</span>
      <span className={styles.summaryValue}>{value}</span>
    </div>
  );
}
