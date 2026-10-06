'use strict'

module.exports = {
  breakpoints: {
    base: '',
    md: 'md:',
    lg: 'lg:',
  },
  utilities: {
    paddingX: { scale: 'spacing', prefix: 'px', control: 'select', sort: 'length' },
    paddingY: { scale: 'spacing', prefix: 'py', control: 'select', sort: 'length' },
    height: { scale: 'height', prefix: 'h', control: 'select', sort: 'length' },
    width: { scale: 'width', prefix: 'w', control: 'select', sort: 'length' },
    maxWidth: {
      scale: 'maxWidth', prefix: 'max-w', control: 'select',
      // A content box may intentionally use intrinsic width: emit no class.
      semanticOptions: [{ label: 'auto (intrinsic width)', value: 'auto', cssValue: 'auto' }],
    },
    paddingTop: { scale: 'spacing', prefix: 'pt', control: 'select', sort: 'length' },
    paddingBottom: { scale: 'spacing', prefix: 'pb', control: 'select', sort: 'length' },
    paddingRight: { scale: 'spacing', prefix: 'pr', control: 'select', sort: 'length' },
    paddingLeft: { scale: 'spacing', prefix: 'pl', control: 'select', sort: 'length' },
    marginTop: { scale: 'spacing', prefix: 'mt', control: 'select', sort: 'length' },
    marginBottom: { scale: 'spacing', prefix: 'mb', control: 'select', sort: 'length' },
    gap: { scale: 'gap', prefix: 'gap', control: 'select', sort: 'length' },
    gapX: { scale: 'gap', prefix: 'gap-x', control: 'select', sort: 'length' },
    fontSize: { scale: 'fontSize', prefix: 'text', control: 'select', sort: 'length', labelFormatter: 'font-size' },
    fontFamily: { scale: 'fontFamily', prefix: 'font', control: 'enum', tokens: ['sans', 'serif'], labelFormatter: 'font-family' },
    lineHeight: { scale: 'lineHeight', prefix: 'leading', control: 'select' },
    fontWeight: { scale: 'fontWeight', prefix: 'font', control: 'select' },
    borderTopWidth: {
      scale: 'borderWidth',
      formatter: 'tailwind-border-top-width',
      labelFormatter: 'css-length',
      control: 'enum',
      sort: 'length',
    },
    borderWidth: {
      scale: 'borderWidth',
      formatter: 'tailwind-border-width',
      labelFormatter: 'css-length',
      control: 'enum',
      sort: 'length',
    },
    // No `sort` — Tailwind's own theme.letterSpacing is already insertion-
    // ordered tighter -> widest (em-unit values `cssLengthToPx`'s px/rem-only
    // regex can't parse for a numeric sort anyway), and 6 tokens is within
    // the enum control's own ~8-option ceiling (AGENTS.md).
    letterSpacing: { scale: 'letterSpacing', prefix: 'tracking', control: 'enum' },
  },
}
