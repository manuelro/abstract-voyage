// @ts-nocheck
import { contrastRatio } from './color';

// roles from a steps array
export function computeRoleKeys(steps) {
  const byLevel = new Map(steps.map(s => [s.level, s]));
  const pos = [...steps.filter(s => s.level > 0)].sort((a,b)=>a.level-b.level);
  const neg = [...steps.filter(s => s.level < 0)].sort((a,b)=>a.level-b.level);
  const keyFor = wanted => {
    if (byLevel.has(wanted)) return byLevel.get(wanted).key;
    if (wanted > 0) return pos.length ? pos[pos.length - 1].key : '0';
    if (wanted < 0) return neg.length ? neg[0].key : '0';
    return '0';
  };
  const kDef = keyFor(1);
  const kHover = byLevel.has(2) ? byLevel.get(2).key : (pos.length ? pos[pos.length - 1].key : kDef);
  const kDis = neg.length ? neg[0].key : '0';
  const kTint1 = neg.length ? neg[neg.length - 1].key : '0';
  const kShade1 = pos.length ? pos[0].key : '0';
  const kTint2 = neg.length ? neg[0].key : kTint1;
  const kShade2 = pos.length ? pos[pos.length - 1].key : kShade1;
  return { kDef, kHover, kDis, kTint1, kTint2, kShade1, kShade2 };
}

// Build a style object (CSS variables) for a themed scope
export function buildScopeVars(steps, baseScope = 'light') {
  const style = {};

  // Accent tokens
  steps.forEach(s => {
    style[`--accent-${s.key}`] = s.hex;
    style[`--on-accent-${s.key}`] = s.on;
  });

  const roles = computeRoleKeys(steps);

  // Aliases
  Object.assign(style, {
    '--accent-base': 'var(--accent-0)',
    '--accent-tint-1': `var(--accent-${roles.kTint1})`,
    '--accent-tint-2': `var(--accent-${roles.kTint2})`,
    '--accent-shade-1': `var(--accent-${roles.kShade1})`,
    '--accent-shade-2': `var(--accent-${roles.kShade2})`,
    '--on-accent-base': 'var(--on-accent-0)',
    '--on-accent-tint-1': `var(--on-accent-${roles.kTint1})`,
    '--on-accent-tint-2': `var(--on-accent-${roles.kTint2})`,
    '--on-accent-shade-1': `var(--on-accent-${roles.kShade1})`,
    '--on-accent-shade-2': `var(--on-accent-${roles.kShade2})`,
    // CTA
    '--cta-bg': `var(--accent-${roles.kDef})`,
    '--cta-fg': `var(--on-accent-${roles.kDef})`,
    '--cta-bg-hover': `var(--accent-${roles.kHover})`,
    '--cta-fg-hover': `var(--on-accent-${roles.kHover})`,
    '--cta-bg-disabled': `var(--accent-${roles.kDis})`,
    '--cta-fg-disabled': `var(--on-accent-${roles.kDis})`,
  });

  // Ring from default accent (need the concrete hex)
  const ringHex = steps.find(s => s.key === roles.kDef)?.hex || steps[1]?.hex || steps[0]?.hex;
  style['--ring'] = ringHex;

  // Provide surface tokens (fixed per theme, from your CSS) so consumers can read them from style as well
  if (baseScope === 'light') {
    Object.assign(style, {
      '--bg':'#F7F9FC','--surface':'#FFFFFF','--elevated':'#F3F6FA','--border':'#D6DEE6',
      '--text':'#0A0B0D','--muted':'#5B6672',
    });
  } else {
    Object.assign(style, {
      '--bg':'#0C1116','--surface':'#0F141A','--elevated':'#121920','--border':'#22303C',
      '--text':'#E7EBF0','--muted':'#9AA7B0',
    });
  }
  return style;
}

export function exportCssVars(lightStyleEl, darkStyleEl, deltaScale, stepsLight, stepsDark) {
  const val = (obj, name) => obj[name];
  const lines = (styleObj, steps) =>
    steps.map(s => [
      `--accent-${s.key}: ${val(styleObj, `--accent-${s.key}`)};`,
      `--on-accent-${s.key}: ${val(styleObj, `--on-accent-${s.key}`)};`,
    ].join('\n')).join('\n');

  const rolesL = computeRoleKeys(stepsLight);
  const rolesD = computeRoleKeys(stepsDark);

  const lightBlock = `
:root{
  --bg:#F7F9FC; --surface:#FFFFFF; --elevated:#F3F6FA; --border:#D6DEE6;
  --text:#0A0B0D; --muted:#5B6672; --ring:${val(lightStyleEl, `--accent-${rolesL.kDef}`)};
  ${lines(lightStyleEl, stepsLight)}

  /* Convenience aliases */
  --accent-base: var(--accent-0);
  --accent-tint-1: var(--accent-${rolesL.kTint1});
  --accent-tint-2: var(--accent-${rolesL.kTint2});
  --accent-shade-1: var(--accent-${rolesL.kShade1});
  --accent-shade-2: var(--accent-${rolesL.kShade2});
  --on-accent-base: var(--on-accent-0);
  --on-accent-tint-1: var(--on-accent-${rolesL.kTint1});
  --on-accent-tint-2: var(--on-accent-${rolesL.kTint2});
  --on-accent-shade-1: var(--on-accent-${rolesL.kShade1});
  --on-accent-shade-2: var(--on-accent-${rolesL.kShade2});

  /* CTA */
  --cta-bg: var(--accent-${rolesL.kDef});
  --cta-fg: var(--on-accent-${rolesL.kDef});
  --cta-bg-hover: var(--accent-${rolesL.kHover});
  --cta-fg-hover: var(--on-accent-${rolesL.kHover});
  --cta-bg-disabled: var(--accent-${rolesL.kDis});
  --cta-fg-disabled: var(--on-accent-${rolesL.kDis});
}`.trim();

  const darkBlock = `
[data-theme="dark"]{
  --bg:#0C1116; --surface:#0F141A; --elevated:#121920; --border:#22303C;
  --text:#E7EBF0; --muted:#9AA7B0; --ring:#86E3E5;
  ${lines(darkStyleEl, stepsDark)}

  /* Convenience aliases */
  --accent-base: var(--accent-0);
  --accent-tint-1: var(--accent-${rolesD.kTint1});
  --accent-tint-2: var(--accent-${rolesD.kTint2});
  --accent-shade-1: var(--accent-${rolesD.kShade1});
  --accent-shade-2: var(--accent-${rolesD.kShade2});
  --on-accent-base: var(--on-accent-0);
  --on-accent-tint-1: var(--on-accent-${rolesD.kTint1});
  --on-accent-tint-2: var(--on-accent-${rolesD.kTint2});
  --on-accent-shade-1: var(--on-accent-${rolesD.kShade1});
  --on-accent-shade-2: var(--on-accent-${rolesD.kShade2});

  /* CTA */
  --cta-bg: var(--accent-${rolesD.kDef});
  --cta-fg: var(--on-accent-${rolesD.kDef});
  --cta-bg-hover: var(--accent-${rolesD.kHover});
  --cta-fg-hover: var(--on-accent-${rolesD.kHover});
  --cta-bg-disabled: var(--accent-${rolesD.kDis});
  --cta-fg-disabled: var(--on-accent-${rolesD.kDis});
}`.trim();

  return `/* delta scale (φ-based): ${deltaScale} • levels: ${stepsLight.length} */\n${lightBlock}\n\n${darkBlock}`;
}

export function buildDesignTokens(lightStyle, darkStyle, deltaScale, stepsLight, stepsDark) {
  const get = (o, k) => o[k];

  const color = {};
  stepsLight.forEach(s => {
    color[`accent-${s.key}`]    = { value: get(lightStyle, `--accent-${s.key}`) };
    color[`on-accent-${s.key}`] = { value: get(lightStyle, `--on-accent-${s.key}`) };
  });
  const roles = computeRoleKeys(stepsLight);
  Object.assign(color, {
    'accent-base':       { $alias: '{color.accent-0}' },
    'accent-tint-1':     { $alias: `{color.accent-${roles.kTint1}}` },
    'accent-tint-2':     { $alias: `{color.accent-${roles.kTint2}}` },
    'accent-shade-1':    { $alias: `{color.accent-${roles.kShade1}}` },
    'accent-shade-2':    { $alias: `{color.accent-${roles.kShade2}}` },
    'on-accent-base':    { $alias: '{color.on-accent-0}' },
    'on-accent-tint-1':  { $alias: `{color.on-accent-${roles.kTint1}}` },
    'on-accent-tint-2':  { $alias: `{color.on-accent-${roles.kTint2}}` },
    'on-accent-shade-1': { $alias: `{color.on-accent-${roles.kShade1}}` },
    'on-accent-shade-2': { $alias: `{color.on-accent-${roles.kShade2}}` },
    bg:       { value: '#F7F9FC' },
    surface:  { value: '#FFFFFF' },
    elevated: { value: '#F3F6FA' },
    border:   { value: '#D6DEE6' },
    text:     { value: '#0A0B0D' },
    muted:    { value: '#5B6672' },
    ring:     { value: get(lightStyle, '--ring') },
  });

  const darkColors = {};
  stepsDark.forEach(s => {
    darkColors[`accent-${s.key}`]    = { value: get(darkStyle, `--accent-${s.key}`) };
    darkColors[`on-accent-${s.key}`] = { value: get(darkStyle, `--on-accent-${s.key}`) };
  });
  Object.assign(darkColors, {
    bg:       { value: '#0C1116' },
    surface:  { value: '#0F141A' },
    elevated: { value: '#121920' },
    border:   { value: '#22303C' },
    text:     { value: '#E7EBF0' },
    muted:    { value: '#9AA7B0' },
    ring:     { value: '#86E3E5' },
  });

  const scaleLevels = {};
  stepsLight.forEach(s => { scaleLevels[s.key] = { value: s.level }; });

  const rolesToken = (() => {
    const r = computeRoleKeys(stepsLight);
    return {
      bg:           { $alias: `{color.accent-${r.kDef}}` },
      fg:           { $alias: `{color.on-accent-${r.kDef}}` },
      'bg-hover':   { $alias: `{color.accent-${r.kHover}}` },
      'fg-hover':   { $alias: `{color.on-accent-${r.kHover}}` },
      'bg-disabled':{ $alias: `{color.accent-${r.kDis}}` },
      'fg-disabled':{ $alias: `{color.on-accent-${r.kDis}}` },
    };
  })();

  return {
    $schema: 'https://json.schemastore.org/design-tokens.json',
    meta: { delta_scale_phi: deltaScale, levels: stepsLight.length, notes: 'Delta s multiplies dL; chroma scales around 1: m\' = 1 + (m−1)*s' },
    color,
    role: { cta: rolesToken },
    scale: { 'accent-level': scaleLevels },
    modes: { dark: { color: darkColors } }
  };
}

// A11y helpers for the table
export function badgeForTextCR(cr) {
  if (cr >= 7) return { label: 'AAA', cls: 'aaa' };
  if (cr >= 4.5) return { label: 'AA', cls: 'aa' };
  if (cr >= 3) return { label: 'AA (large)', cls: 'large' };
  return { label: 'Fail', cls: 'fail' };
}
export function badgeForUiCR(cr) {
  return cr >= 3 ? { label: 'Pass (3:1)', cls: 'ui' } : { label: 'Fail', cls: 'fail' };
}
