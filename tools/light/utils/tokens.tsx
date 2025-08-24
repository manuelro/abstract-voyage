// @ts-nocheck
import { contrastRatio, hexToOklch } from './color';

/* =========================
   Role helpers (unchanged)
   ========================= */
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

/* =========================
   Theme style vars (as before)
   ========================= */
export function buildScopeVars(steps, baseScope = 'light') {
  const style = {};
  steps.forEach(s => {
    style[`--accent-${s.key}`] = s.hex;
    style[`--on-accent-${s.key}`] = s.on;
  });

  const roles = computeRoleKeys(steps);

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

  const ringHex = steps.find(s => s.key === roles.kDef)?.hex || steps[1]?.hex || steps[0]?.hex;
  style['--ring'] = ringHex;

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

/* =========================
   Formatting helpers
   ========================= */
function round(n: number, d = 2) {
  const p = Math.pow(10, d);
  return Math.round(n * p) / p;
}
function oklchStringFromHex(hex: string, decimals = 2) {
  const ok = hexToOklch(hex);
  if (!ok) return hex;
  const L = round(ok.L, decimals);
  const C = round(ok.C, decimals);
  const H = round(ok.H, Math.max(0, decimals - 1)); // hue can be coarse
  return `oklch(${L} ${C} ${H})`;
}
function fmtColor(hex: string, mode: 'hex' | 'oklch', decimals = 2) {
  if (!hex || typeof hex !== 'string') return hex;
  return mode === 'oklch' ? oklchStringFromHex(hex, decimals) : hex.toUpperCase();
}

function outVar(ns: string, key: string) { return `--${ns}-${key}`; }
function outOnVar(ns: string, key: string) { return `--on-${ns}-${key}`; }

function linesFor(styleObj, steps, ns = 'accent', fmtMode = 'oklch', decimals = 2) {
  const val = (o, k) => o[k];
  return steps.map(s => [
    `${outVar(ns, s.key)}: ${fmtColor(val(styleObj, `--accent-${s.key}`), fmtMode, decimals)};`,
    `${outOnVar(ns, s.key)}: ${fmtColor(val(styleObj, `--on-accent-${s.key}`), fmtMode, decimals)};`,
  ].join('\n')).join('\n');
}
function linesForSecondary(styleObj, steps, ns2 = 'accent2', fmtMode = 'oklch', decimals = 2) {
  const val = (o, k) => o[k];
  return steps.map(s => [
    `${outVar(ns2, s.key)}: ${fmtColor(val(styleObj, `--accent-${s.key}`), fmtMode, decimals)};`,
    `${outOnVar(ns2, s.key)}: ${fmtColor(val(styleObj, `--on-accent-${s.key}`), fmtMode, decimals)};`,
  ].join('\n')).join('\n');
}

function aliasBlock(ns: string, roles: any) {
  return `
  /* Convenience aliases (primary as default) */
  --${ns}-base: var(--${ns}-0);
  --${ns}-tint-1: var(--${ns}-${roles.kTint1});
  --${ns}-tint-2: var(--${ns}-${roles.kTint2});
  --${ns}-shade-1: var(--${ns}-${roles.kShade1});
  --${ns}-shade-2: var(--${ns}-${roles.kShade2});
  --on-${ns}-base: var(--on-${ns}-0);
  --on-${ns}-tint-1: var(--on-${ns}-${roles.kTint1});
  --on-${ns}-tint-2: var(--on-${ns}-${roles.kTint2});
  --on-${ns}-shade-1: var(--on-${ns}-${roles.kShade1});
  --on-${ns}-shade-2: var(--on-${ns}-${roles.kShade2});

  /* CTA (primary) */
  --cta-bg: var(--${ns}-${roles.kDef});
  --cta-fg: var(--on-${ns}-${roles.kDef});
  --cta-bg-hover: var(--${ns}-${roles.kHover});
  --cta-fg-hover: var(--on-${ns}-${roles.kHover});
  --cta-bg-disabled: var(--${ns}-${roles.kDis});
  --cta-fg-disabled: var(--on-${ns}-${roles.kDis});`.trim();
}

function aliasBlockSecondary(ns2: string, roles: any) {
  return `
  /* Secondary namespace (present only if enabled) */
  --cta2-bg: var(--${ns2}-${roles.kDef});
  --cta2-fg: var(--on-${ns2}-${roles.kDef});
  --cta2-bg-hover: var(--${ns2}-${roles.kHover});
  --cta2-fg-hover: var(--on-${ns2}-${roles.kHover});
  --cta2-bg-disabled: var(--${ns2}-${roles.kDis});
  --cta2-fg-disabled: var(--on-${ns2}-${roles.kDis});`.trim();
}

/* =========================
   Export helpers (multi-accent) with options
   ========================= */
/**
 * @param options {
 *   namespace: 'accent', namespace2: 'accent2',
 *   darkMode: 'data' | 'class' | 'media',
 *   outFormat: 'oklch' | 'hex',
 *   decimals: number,
 *   includeFallbacks: boolean
 * }
 */
export function exportCssVarsMulti(
  lightStyle, darkStyle, deltaScale, stepsLight, stepsDark,
  lightStyle2 = null, darkStyle2 = null, stepsLight2 = null, stepsDark2 = null,
  options: any = {}
) {
  const {
    namespace = 'accent',
    namespace2 = 'accent2',
    darkMode = 'data',        // 'data' | 'class' | 'media'
    outFormat = 'oklch',      // 'oklch' | 'hex'
    decimals = 2,
    includeFallbacks = false,
  } = options || {};

  const rolesL = computeRoleKeys(stepsLight);
  const rolesD = computeRoleKeys(stepsDark);

  const hasSecondary = !!(lightStyle2 && darkStyle2 && stepsLight2 && stepsDark2);
  const rolesL2 = hasSecondary ? computeRoleKeys(stepsLight2) : null;
  const rolesD2 = hasSecondary ? computeRoleKeys(stepsDark2)  : null;

  const lightBody = `
  --bg:#F7F9FC; --surface:#FFFFFF; --elevated:#F3F6FA; --border:#D6DEE6;
  --text:#0A0B0D; --muted:#5B6672; --ring:${fmtColor(lightStyle[`--accent-${rolesL.kDef}`], outFormat, decimals)};
${linesFor(lightStyle, stepsLight, namespace, outFormat, decimals)}
${hasSecondary ? linesForSecondary(lightStyle2, stepsLight2, namespace2, outFormat, decimals) : ''}

${aliasBlock(namespace, rolesL)}
${hasSecondary ? '\n' + aliasBlockSecondary(namespace2, rolesL2) : ''}
`.trim();

  const darkBody = `
  --bg:#0C1116; --surface:#0F141A; --elevated:#121920; --border:#22303C;
  --text:#E7EBF0; --muted:#9AA7B0; --ring:${fmtColor(darkStyle[`--accent-${rolesD.kDef}`], outFormat, decimals)};
${linesFor(darkStyle, stepsDark, namespace, outFormat, decimals)}
${hasSecondary ? linesForSecondary(darkStyle2, stepsDark2, namespace2, outFormat, decimals) : ''}

${aliasBlock(namespace, rolesD)}
${hasSecondary ? '\n' + aliasBlockSecondary(namespace2, rolesD2) : ''}
`.trim();

  const lightBlock = `:root{\n${lightBody}\n}`;
  const darkSelector =
    darkMode === 'class' ? '.dark'
    : darkMode === 'media' ? '@media (prefers-color-scheme: dark)'
    : `[data-theme="dark"]`;

  let darkBlock = '';
  if (darkMode === 'media') {
    darkBlock = `\n\n@media (prefers-color-scheme: dark){\n  :root{\n${darkBody}\n  }\n}`;
  } else {
    darkBlock = `\n\n${darkSelector}{\n${darkBody}\n}`;
  }

  const css = `${lightBlock}${darkBlock}`;

  // Fallback flow: when asking for OKLCH plus fallbacks, emit plain HEX version, then @supports override
  if (outFormat === 'oklch' && includeFallbacks) {
    const hexOpts = { ...options, outFormat: 'hex', includeFallbacks: false };
    const hexCss = exportCssVarsMulti(
      lightStyle, darkStyle, deltaScale, stepsLight, stepsDark,
      lightStyle2, darkStyle2, stepsLight2, stepsDark2, hexOpts
    );
    return `${hexCss}\n\n@supports (color: oklch(0 0 0)){\n${css}\n}`;
  }

  return css;
}

/** JSON design tokens (with optional secondary) */
export function buildDesignTokensMulti(
  lightStyle, darkStyle, deltaScale, stepsLight, stepsDark,
  lightStyle2 = null, darkStyle2 = null, stepsLight2 = null, stepsDark2 = null
) {
  const val = (o, k) => o[k];
  const color = {};
  stepsLight.forEach(s => {
    color[`accent-${s.key}`]    = { value: val(lightStyle, `--accent-${s.key}`) };
    color[`on-accent-${s.key}`] = { value: val(lightStyle, `--on-accent-${s.key}`) };
  });
  const rolesL = computeRoleKeys(stepsLight);
  Object.assign(color, {
    'accent-base':       { $alias: '{color.accent-0}' },
    'accent-tint-1':     { $alias: `{color.accent-${rolesL.kTint1}}` },
    'accent-tint-2':     { $alias: `{color.accent-${rolesL.kTint2}}` },
    'accent-shade-1':    { $alias: `{color.accent-${rolesL.kShade1}}` },
    'accent-shade-2':    { $alias: `{color.accent-${rolesL.kShade2}}` },
    'on-accent-base':    { $alias: '{color.on-accent-0}' },
    'on-accent-tint-1':  { $alias: `{color.on-accent-${rolesL.kTint1}}` },
    'on-accent-tint-2':  { $alias: `{color.on-accent-${rolesL.kTint2}}` },
    'on-accent-shade-1': { $alias: `{color.on-accent-${rolesL.kShade1}}` },
    'on-accent-shade-2': { $alias: `{color.on-accent-${rolesL.kShade2}}` },
    bg:       { value: '#F7F9FC' },
    surface:  { value: '#FFFFFF' },
    elevated: { value: '#F3F6FA' },
    border:   { value: '#D6DEE6' },
    text:     { value: '#0A0B0D' },
    muted:    { value: '#5B6672' },
    ring:     { value: val(lightStyle, `--accent-${rolesL.kDef}`) },
  });

  const colorDark = {};
  stepsDark.forEach(s => {
    colorDark[`accent-${s.key}`]    = { value: val(darkStyle, `--accent-${s.key}`) };
    colorDark[`on-accent-${s.key}`] = { value: val(darkStyle, `--on-accent-${s.key}`) };
  });
  Object.assign(colorDark, {
    bg:       { value: '#0C1116' },
    surface:  { value: '#0F141A' },
    elevated: { value: '#121920' },
    border:   { value: '#22303C' },
    text:     { value: '#E7EBF0' },
    muted:    { value: '#9AA7B0' },
    ring:     { value: val(darkStyle, `--accent-${computeRoleKeys(stepsDark).kDef}`) },
  });

  // Secondary (if provided)
  if (lightStyle2 && darkStyle2 && stepsLight2 && stepsDark2) {
    stepsLight2.forEach(s => {
      color[`accent2-${s.key}`]    = { value: val(lightStyle2, `--accent-${s.key}`) };
      color[`on-accent2-${s.key}`] = { value: val(lightStyle2, `--on-accent-${s.key}`) };
    });
    stepsDark2.forEach(s => {
      colorDark[`accent2-${s.key}`]    = { value: val(darkStyle2, `--accent-${s.key}`) };
      colorDark[`on-accent2-${s.key}`] = { value: val(darkStyle2, `--on-accent-${s.key}`) };
    });
  }

  // Scale levels (from light steps)
  const scaleLevels = {};
  stepsLight.forEach(s => { scaleLevels[s.key] = { value: s.level }; });

  // Roles
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

  const tokens = {
    $schema: 'https://json.schemastore.org/design-tokens.json',
    meta: { delta_scale_phi: deltaScale, levels: stepsLight.length, notes: 'Delta s multiplies dL; chroma scales around 1: m\' = 1 + (m−1)*s' },
    color,
    role: { cta: rolesToken },
    scale: { 'accent-level': scaleLevels },
    modes: { dark: { color: colorDark } }
  };

  // Secondary CTA role
  if (lightStyle2 && stepsLight2) {
    const r2 = computeRoleKeys(stepsLight2);
    tokens.role['cta-secondary'] = {
      bg:           { $alias: `{color.accent2-${r2.kDef}}` },
      fg:           { $alias: `{color.on-accent2-${r2.kDef}}` },
      'bg-hover':   { $alias: `{color.accent2-${r2.kHover}}` },
      'fg-hover':   { $alias: `{color.on-accent2-${r2.kHover}}` },
      'bg-disabled':{ $alias: `{color.accent2-${r2.kDis}}` },
      'fg-disabled':{ $alias: `{color.on-accent2-${r2.kDis}}` },
    };
  }
  return tokens;
}

/* Convenience wrappers for copy buttons */
export function buildFigmaTokens(
  lightStyle, darkStyle, deltaScale, stepsLight, stepsDark,
  lightStyle2 = null, darkStyle2 = null, stepsLight2 = null, stepsDark2 = null
) {
  return JSON.stringify(
    buildDesignTokensMulti(lightStyle, darkStyle, deltaScale, stepsLight, stepsDark, lightStyle2, darkStyle2, stepsLight2, stepsDark2),
    null, 2
  );
}

/** Tailwind extend config (colors only; light values; use [data-theme='dark'] or .dark to switch in app) */
export function buildTailwindConfig(
  lightStyle, darkStyle, stepsLight, stepsDark,
  lightStyle2 = null, darkStyle2 = null, stepsLight2 = null, stepsDark2 = null,
  options: any = {}
) {
  const { namespace = 'accent', namespace2 = 'accent2' } = options || {};
  const val = (o, k) => o[k];
  const colorGroup = {};
  stepsLight.forEach(s => { colorGroup[s.key] = val(lightStyle, `--accent-${s.key}`); });
  const onGroup = {};
  stepsLight.forEach(s => { onGroup[s.key] = val(lightStyle, `--on-accent-${s.key}`); });

  const color2 = {};
  const on2 = {};
  if (lightStyle2 && stepsLight2) {
    stepsLight2.forEach(s => { color2[s.key] = val(lightStyle2, `--accent-${s.key}`); });
    stepsLight2.forEach(s => { on2[s.key]    = val(lightStyle2, `--on-accent-${s.key}`); });
  }

  return `/** Minimal Tailwind extend config (light values; set darkMode: 'class' or 'media' to match your app) */
module.exports = {
  "theme": {
    "extend": {
      "colors": {
        "${namespace}": ${JSON.stringify(colorGroup, null, 2)},
        "on-${namespace}": ${JSON.stringify(onGroup, null, 2)}${lightStyle2 ? `,
        "${namespace2}": ${JSON.stringify(color2, null, 2)},
        "on-${namespace2}": ${JSON.stringify(on2, null, 2)}` : ''}
      }
    }
  }
};`;
}

/** Bootstrap mapping (keeps Bootstrap API, maps to your tokens) */
export function buildBootstrapCss(
  lightStyle, darkStyle, lightStyle2 = null, darkStyle2 = null, options: any = {}
) {
  const { namespace = 'accent', namespace2 = 'accent2' } = options || {};
  const hasSecondary = !!(lightStyle2 && darkStyle2);
  return `:root{
  --bs-primary: var(--${namespace}-1);
  ${hasSecondary ? `--bs-secondary: var(--${namespace2}-1);` : `--bs-secondary: var(--${namespace}-n1);`}
}
[data-theme="dark"]{
  --bs-primary: var(--${namespace}-1);
  ${hasSecondary ? `--bs-secondary: var(--${namespace2}-1);` : `--bs-secondary: var(--${namespace}-n1);`}
}`.trim();
}

/* Badges for a11y table (unchanged) */
export function badgeForTextCR(cr) {
  if (cr >= 7) return { label: 'AAA', cls: 'aaa' };
  if (cr >= 4.5) return { label: 'AA', cls: 'aa' };
  if (cr >= 3) return { label: 'AA (large)', cls: 'large' };
  return { label: 'Fail', cls: 'fail' };
}
export function badgeForUiCR(cr) {
  return cr >= 3 ? { label: 'Pass (3:1)', cls: 'ui' } : { label: 'Fail', cls: 'fail' };
}
