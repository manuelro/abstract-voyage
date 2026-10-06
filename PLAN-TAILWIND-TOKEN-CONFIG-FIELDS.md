# Plan — Tailwind-referential config fields (Abstract first)

## Status

Implemented on 2026-09-24. Generator freshness, architecture enforcement, type-checking, focused tests, the full production build, and rendered verification of the Abstract footer migration pass. The two incidental enum-to-select corrections in PolymorphicLayout and TableOfContents passed schema/type checks but were not separately exercised in the browser.

Refinement recorded 2026-09-23: global utility families are the reusable contract. Component-scoped token profiles were considered and rejected because they preserve consumer-owned concrete lists. Shared exposure policies are an exception for demonstrated constraints, not the default authoring model.

## Scope

Primary migration target: `pages/abstract.config.ts` and its Abstract-page panel definition in `pages/abstract.panel.ts`.

Necessary shared infrastructure may live under `components/Panel/config/`, alongside the existing Tailwind scale modules, and in a small generation script. The first consumer and acceptance target remain Abstract's footer-related Tailwind config fields. `PLAN-SITEHEADER-CONFIG-BREAKPOINT-SEGREGATION.md` is the second planned consumer and depends on this infrastructure; a project-wide migration remains out of scope for the first implementation slice.

## 1. Problem statement

Abstract's configuration represents the same Tailwind vocabulary several times:

1. Tailwind defines the available theme tokens.
2. `components/tailwindSpacingScale.ts` and `components/tailwindTypographyScale.ts` manually reproduce tokens as `{ label, value }` options.
3. `pages/abstract.config.ts` maps those options back into local `FOOTER_*_CLASSES` arrays for normalization.
4. `pages/abstract.panel.ts` imports the option arrays again and attaches them to individual `select` or `enum` fields.

This is not a single source of truth. It raises authoring cost for every new padding, margin, gap, font-size, font-weight, or similar field; it also permits panel options, TypeScript unions, normalizers, and the resolved Tailwind theme to drift apart.

The intended authoring unit is a Tailwind utility family, not a handwritten option array. A page should declare its intent approximately as follows:

```ts
tailwindField('paddingY', {
  key: 'sectionPaddingYClassName',
  label: 'Section vertical padding',
})
```

That declaration must supply the real Tailwind values, the correct field type, normalization, and the appropriate graphical control without making the page repeat the token list.

## 2. Architecture decision

The resolved Tailwind theme is the canonical token source. Do not introduce a separately maintained semantic scale such as `XS`, `SM`, or `Large`, and do not maintain another handwritten class list that can drift from Tailwind.

A build-time generator will resolve `tailwind.config.js`, read the relevant theme scales, and emit a checked-in TypeScript registry containing complete literal Tailwind classes. A small utility-family manifest describes how a theme scale maps to classes:

```ts
const utilityFamilies = {
  padding:       { scale: 'spacing', prefix: 'p' },
  paddingX:      { scale: 'spacing', prefix: 'px' },
  paddingY:      { scale: 'spacing', prefix: 'py' },
  paddingTop:    { scale: 'spacing', prefix: 'pt' },
  paddingBottom: { scale: 'spacing', prefix: 'pb' },
  marginTop:     { scale: 'spacing', prefix: 'mt' },
  gap:           { scale: 'gap', prefix: 'gap' },
  gapX:          { scale: 'gap', prefix: 'gap-x' },
  height:        { scale: 'height', prefix: 'h' },
  width:         { scale: 'width', prefix: 'w' },
  maxWidth:      { scale: 'maxWidth', prefix: 'max-w' },
  fontSize:      { scale: 'fontSize', prefix: 'text' },
  fontWeight:    { scale: 'fontWeight', prefix: 'font' },
  borderWidth:   { scale: 'borderWidth', formatter: 'tailwind-border-width' },
  borderTopWidth:{ scale: 'borderWidth', formatter: 'tailwind-border-top-width' },
} as const;
```

Families whose default token omits a suffix, such as Tailwind's 1px `border`, use a small centralized formatter rather than pretending the class is `border-DEFAULT`.

The spacing scale is resolved once and reused by every spacing-family adapter. Breakpoint prefixes are also data, not separate lists: the same token set can generate base, `md:`, and `lg:` classes without repeating its token keys.

Each global utility family exposes its complete resolved Tailwind scale by default. `paddingX` means “the project Tailwind spacing scale expressed through the `px` utility” everywhere it is referenced; it does not mean one component's preferred subset. Abstract, SiteHeader, and future panels all consume the same `paddingX` definition.

Component-scoped token profiles such as `siteHeader.paddingX.tokens = [...]` are explicitly rejected as the default architecture. They remove repeated class strings but preserve a second, consumer-owned concrete list that another panel can duplicate. Components own defaults and field metadata, not token membership.

If the complete scale creates a demonstrated usability or safety problem, define a reusable design-system exposure policy rather than a component profile. Such a policy must:

- Be named for its cross-component meaning, such as a compact layout-size range, not for its first consumer.
- Derive from a resolved Tailwind scale through a declarative rule or bounded range whenever possible.
- Be defined once in shared infrastructure and referenced by any panel needing that constraint.
- Pass the same option-count and visual-legibility rules as a full utility family.
- Never be declared inline at a page/component call site.

An exact curated membership list is permitted only when the product genuinely requires non-contiguous choices that cannot be expressed as a stable rule. That concretion cannot be eliminated, but it must exist once as a reusable design-system policy, be validated against the Tailwind theme, and carry a documented rationale. It must not be copied into `SiteHeader`, Abstract, or another consumer.

Keep global utility sets class-only. Behavior values such as semantic `auto`, `inherit`, or `match-narrow-column` belong to a separate reusable choice-set layer (for example, `maxWidthOrAuto` composing global `maxWidth` with a documented “emit no max-width utility” option). Choice sets must be global, centrally normalized, explicit about semantic behavior, and named independently of their first consumer. Consumers may reference them but may not append semantic values to a utility inline. The Abstract pilot does not require this layer; implement it when the first real consumer, expected to be SiteHeader content width, migrates.

The generated output contains literal classes such as `py-20`, `md:py-20`, `lg:py-20`, `text-sm`, and `font-semibold`; this preserves Tailwind 3 content scanning without runtime class interpolation or a second handwritten safelist.

The generated artifact is not edited manually. Add utility descriptors incrementally when a real consumer migrates rather than generating every possible Tailwind family pre-emptively. Generation must run before development, while tests/builds/releases use a read-only freshness check and fail when checked-in output is stale relative to the Tailwind configuration and utility manifest.

## 3. Who builds the final graphical control

The existing shared Panel system builds it. Neither `pages/abstract.config.ts`, the generator, nor a Tailwind-specific React component should render a `<select>` or segmented row directly.

The ownership chain is:

```text
Resolved Tailwind theme
        -> generated literal token registry
        -> tailwindField() resolves a global utility + breakpoint
           (+ an optional shared exposure policy)
        -> creates an ordinary Panel field
        -> ConfigFieldControl in components/Panel/config/controlResolver.tsx
             -> kind: "select" renders the shared native Select
             -> kind: "enum" renders the shared SegmentedControl
```

`tailwindField()` is a typed field-definition factory, not a UI component. It returns the existing `SelectConfigField` or `EnumConfigField` contract. This keeps Tailwind domain knowledge out of the generic renderer and avoids adding another render path to the Panel system.

## 4. How `select` versus `enum` is decided

Presentation policy belongs to each global utility family or optional shared exposure policy. It is decided once centrally, not independently by each page or field call site. A consumer cannot make `paddingX` an enum on one page and a select on another.

The policy has one hard constraint and several HCI criteria:

1. More than eight options MUST render as `select`. This enforces the repository rule that long option sets never become an illegible SegmentedControl row.
2. A set of eight or fewer options may use `enum` only when its labels are short, all choices benefit from simultaneous comparison, the choices represent a few distinct modes, and the row remains legible at the panel's minimum supported width.
3. Use `select` even below the ceiling when values are long or technical, form a detailed scale, are changed infrequently, or add visual noise when all are displayed at once.
4. The same utility/policy combination uses the same control across pages and breakpoints. Do not switch control types responsively; doing so changes keyboard, focus, and interaction behavior.
5. The decision is based on the complete resolved option set. For example, the complete Tailwind font-weight scale is a `select` when it exceeds eight options. A shorter reusable exposure policy may be an enum only when its choices and interaction rationale satisfy the criteria above.

Expected initial policy:

| Tailwind family | Control | Rationale |
| --- | --- | --- |
| Padding and margin | `select` | Full spacing scale is much larger than eight |
| Gap | `select` | Full spacing-derived scale |
| Font size | `select` | Complete scale exceeds the ceiling |
| Full font-weight scale | `select` for the complete theme | Complete default scale exceeds the ceiling |
| Approved reusable short font-weight policy | `enum` when it stays within the ceiling | A few short, directly comparable weights |
| Border width | `enum` only if the resolved set stays small and legible | Few directly comparable values may benefit from simultaneous visibility |
| Small alignment or mode sets | `enum` | Few short, mutually exclusive, directly comparable choices |

The generator/factory must validate this policy. Requesting `enum` for more than eight generated options is a development/test error, not a condition silently accepted by the UI.

## 5. Shared APIs

### 5.1 Generated registry and derived types

The generated registry owns the literal option values and presentation metadata:

```ts
export const TAILWIND_UTILITY_SETS = {
  paddingY: {
    base: {
      control: 'select',
      options: [
        { label: 'py-0', value: 'py-0' },
        { label: 'py-0.5', value: 'py-0.5' },
        // Generated from the resolved Tailwind spacing theme.
      ],
    },
    md: {
      control: 'select',
      options: [
        { label: 'md:py-0', value: 'md:py-0' },
        { label: 'md:py-0.5', value: 'md:py-0.5' },
      ],
    },
    lg: {
      control: 'select',
      options: [
        { label: 'lg:py-0', value: 'lg:py-0' },
        { label: 'lg:py-0.5', value: 'lg:py-0.5' },
      ],
    },
  },
} as const;
```

Types derive from those literal values:

```ts
type TailwindTokenValue<
  TUtility extends TailwindUtilityName,
  TBreakpoint extends TailwindBreakpoint = 'base',
  TPolicy extends TailwindExposurePolicyName = 'all',
> = GeneratedTailwindTokenValue<TUtility, TBreakpoint, TPolicy>;

type PaddingYClass = TailwindTokenValue<'paddingY'>;
type SiteHeaderPaddingYWide = TailwindTokenValue<'paddingY', 'md'>;
```

Panel options and accepted configuration values therefore cannot disagree.

### 5.2 `tailwindField()`

The factory accepts a global utility identifier and ordinary field metadata. It obtains `options` and `kind` centrally, then returns a standard Panel field definition:

```ts
tailwindField('fontSize', {
  key: 'pageTitleFontSizeClassName',
  label: 'Page title font size',
})
```

Breakpoint-tiered consumers name the same global utility and vary only the breakpoint:

```ts
tailwindField('paddingY', {
  breakpoint: 'md',
  key: 'paddingYWide',
  label: 'Tablet vertical padding',
})
```

Call sites cannot override `options`, provide token membership, or select a different presentation. When a proven constraint requires fewer choices, a call site may reference an existing shared exposure policy; it cannot define that policy inline. Exceptions therefore remain reusable and centrally reviewable.

### 5.3 `normalizeTailwindToken()`

Normalization uses the same generated registry:

```ts
normalizeTailwindToken({
  utility: 'paddingY',
  breakpoint: 'base',
  value: base.sectionPaddingYClassName,
  fallback: D.sectionPaddingYClassName,
})
```

For a tiered utility, normalization receives the same breakpoint identity used by the field:

```ts
normalizeTailwindToken({
  utility: 'paddingY',
  breakpoint: 'md',
  value: base.paddingYWide,
  fallback: D.paddingYWide,
})
```

This removes local arrays such as `FOOTER_PADDING_Y_CLASSES`, `FOOTER_FONT_SIZE_CLASSES`, and `FOOTER_FONT_WEIGHT_CLASSES`. Persisted invalid values continue to fall back to the declared default.

## 6. Implementation contract and Abstract pilot

### 6.1 Concrete file ownership

Implement the first slice with this file map:

```text
scripts/tailwind-config-fields.manifest.js
scripts/generate-tailwind-config-fields.js
scripts/verify-tailwind-field-architecture.js
scripts/tailwind-field-legacy-allowlist.json
components/Panel/config/tailwindUtilities.generated.ts
components/Panel/config/tailwindFields.ts
components/Panel/config/tailwindFields.test.ts
```

Use CommonJS for the generator and verifier scripts so the implementation needs no `tsx`, `ts-node`, or other runtime dependency. The generator uses `require('tailwindcss/resolveConfig')` to resolve the actual project configuration.

`tailwindUtilities.generated.ts` is checked in and deterministic. It must contain a do-not-edit header, literal classes, and no timestamp or machine-specific content. `--check` regenerates in memory and compares byte-for-byte with the checked-in artifact; it never writes.

The initial manifest contains only utility families with a first-slice consumer:

- `paddingX`, `paddingY`, `paddingTop`, and `paddingBottom` from `spacing`.
- `marginTop` from `spacing`.
- `gap` from `gap`.
- `fontSize` from `fontSize`.
- `fontWeight` from `fontWeight`.
- `borderTopWidth` from `borderWidth`, including Tailwind's suffix-less default class mapping.

Add another descriptor only when a real consumer migrates. The generated registry is breakpoint-indexed as shown in §5.1. Because Tailwind already scans `components/**/*.ts`, checked-in literal classes in the generated file are discoverable without a safelist.

### 6.2 Package-script lifecycle

Add these scripts:

```json
{
  "generate:tailwind-fields": "node scripts/generate-tailwind-config-fields.js",
  "verify:tailwind-fields": "node scripts/generate-tailwind-config-fields.js --check && node scripts/verify-tailwind-field-architecture.js"
}
```

Integrate them with existing lifecycle commands as follows:

- `predev` generates the artifact, then runs the existing `node scripts/kill-stale-dev-servers.js` command.
- `prebuild` and `pretest` run the read-only `verify:tailwind-fields` command.
- `verify:release` explicitly runs `verify:tailwind-fields` before its direct `npx next build` invocation; do not rely on `prebuild`, because invoking `next build` directly bypasses npm's lifecycle hook.

Development may refresh generated output. Test, build, and release commands must fail on stale output and must not modify the worktree.

### 6.3 Typed API contract

Bind the field factory to a configuration scope once:

```ts
const tailwindFooterField =
  createTailwindFieldFactory<AbstractFooterConfig>();

tailwindFooterField('paddingY', {
  key: 'sectionPaddingYClassName',
  label: 'Section vertical padding',
})
```

Use a `KeysMatching`-style generic constraint so `key` must point to a property compatible with the utility, breakpoint, and policy value type. The field factory may default `breakpoint` to `base`; it returns an ordinary existing `EnumConfigField` or `SelectConfigField`.

Use the single object-argument normalizer shown in §5.3. Do not provide positional overloads: named `utility`, `breakpoint`, `value`, and `fallback` properties keep responsive calls unambiguous and make call-site review straightforward.

### 6.4 Audited Abstract migration matrix

The resolved Tailwind configuration and existing Abstract controls produce this migration matrix:

| Family | Existing options | Generated options | Final control |
| --- | ---: | ---: | --- |
| Padding and margin | 34 | 35 | `select` |
| Gap | 34 | 35 | `select` |
| Font size | 10 | 13 | `select` |
| Font weight | 4 | 9 | `select` |
| Top-border width | 5 | 5 | `enum` |

The spacing/gap increase is Tailwind's valid `px` token. Font sizes expand from `xs`–`6xl` to the resolved `xs`–`9xl`; font weights expand from the existing four choices to the complete nine-token scale. Border widths retain five values. These expansions are intentional consequences of making the resolved Tailwind theme canonical, not accidental UI drift.

Migrate these Abstract footer properties:

```text
sectionPaddingYClassName
pageItemGapClassName
pageItemPaddingYClassName
pageItemPaddingXClassName
pageTitlePaddingBottomClassName
pageTitleFontSizeClassName
pageTitleFontWeightClassName
pageDescriptionMarginTopClassName
pageDescriptionPaddingTopClassName
pageDescriptionFontSizeClassName
pageDescriptionFontWeightClassName
pageLinkBorderWidthClassName
topBorderWidthClassName
contactSpaceBeforeClassName
contactFontSizeClassName
contactFontWeightClassName
wordmarkSpaceBeforeClassName
```

Preserve every existing default and serialized value. Keep page labels, descriptions, grouping, visibility, and rendered styling unchanged. The two border-top-width fields (`pageLinkBorderWidthClassName` and `topBorderWidthClassName`) change from `select` to `enum` under the shared five-option policy; these are the only intended control-form changes in the Abstract pilot and therefore need explicit visual verification.

### 6.5 Ordered rollout

Implement in this order so enforcement never precedes the compliant path:

1. Add the manifest, generator, and initial generated artifact.
2. Add package lifecycle scripts, the freshness check, and explicit release verification.
3. Add derived types, the typed field factory, and object-argument normalizer.
4. Add focused generated-registry and API tests.
5. Add the architecture verifier with an exact baseline for existing legacy definitions.
6. Add shared enum validation and the six-entry temporary oversized-enum allowlist described in §7.3.
7. Migrate Abstract types and normalization.
8. Migrate Abstract panel field declarations.
9. Add the root `AGENTS.md` authoring rule after the APIs exist.
10. Add per-export compatibility deprecations.
11. Run automated verification.
12. Perform mandatory rendered verification.
13. Remove Abstract entries from the architecture baseline.
14. Begin SiteHeader only after the Abstract pilot satisfies this plan's acceptance criteria.

### 6.6 SiteHeader integration contract

After the Abstract slice proves the infrastructure, `PLAN-SITEHEADER-CONFIG-BREAKPOINT-SEGREGATION.md` consumes the same global utility families rather than creating SiteHeader-specific Tailwind arrays or profiles. For example, SiteHeader's `paddingX`, `paddingXWide`, and `paddingXLg` all reference global `paddingX` with `base`, `md`, and `lg` breakpoints. SiteHeader does not maintain token membership, three unions, three normalizer allowlists, or three panel option arrays for that conceptual field.

This ruling supersedes any component-specific `siteHeader.*` token-profile table in the SiteHeader plan. That document must be aligned with this global-utility contract before implementation begins; its responsive schema and verification matrix remain valid.

SiteHeader owns the default selected at each tier, the property names, labels, grouping, and responsive consumption. It does not own the option vocabulary. If a full global utility is proven unusable in a particular context, SiteHeader may reference an already-centralized reusable exposure policy after that policy has been justified and added to the shared system; it may not introduce `siteHeader.*.tokens` lists.

The SiteHeader plan remains responsible for its breakpoint schema, field renames, tabs, consumer migration, and four-page regression matrix. This plan remains responsible for token generation, utility/policy validation, field construction, normalization, control-selection policy, and adoption enforcement.

## 7. Adoption and enforcement

Documentation alone is insufficient. The compliant path must be shorter than recreating arrays, agents must receive a direct rule, and automated checks must reject architectural regressions.

### 7.1 Typed scope factory: make the correct path easiest

Provide a scope-bound helper so authors do not repeat config generics:

```ts
const tailwindFooterField =
  createTailwindFieldFactory<AbstractFooterConfig>();

tailwindFooterField('paddingY', {
  key: 'sectionPaddingYClassName',
  label: 'Section vertical padding',
})
```

The factory must statically reject a key whose config value is incompatible with the selected utility/breakpoint/policy. It returns an existing Panel field contract, so no Tailwind-specific rendering branch is introduced.

### 7.2 Root `AGENTS.md` rule

Add the rule only when `TailwindTokenValue`, `createTailwindFieldFactory`/`tailwindField`, and `normalizeTailwindToken` exist. The rule lands in the same implementation change as those APIs so it never mandates nonexistent tooling.

Place it immediately after the existing “Config panel: enum vs. select” section and require agents to:

- Use `TailwindTokenValue` for Tailwind-backed config value types.
- Use the shared field factory for panel definitions.
- Use `normalizeTailwindToken` for untrusted/partial runtime values.
- Reference global utilities and pass `base`/`md`/`lg` separately.
- Keep field keys, labels, descriptions, defaults, grouping, visibility, and breakpoint placement in the consumer.
- Leave token membership, option construction, and control presentation in shared infrastructure.

The rule must prohibit:

- Local `{ label, value }` Tailwind option arrays.
- Local unions of Tailwind utility strings.
- Local normalization allowlists such as `*_PADDING_CLASSES`.
- Separate base/`md`/`lg` token lists for one utility.
- Component/page token profiles such as `siteHeader.paddingX.tokens`.
- Inline exposure-policy definitions.
- Runtime-generated Tailwind class strings.
- Manual edits to generated registry files.
- Consumer overrides of generated `options` or `kind`.

It must also state the boundary: new Tailwind-backed fields and materially modified existing Tailwind-backed fields use the new system, but an unrelated task does not expand into a repository-wide migration. Continuous numbers, measurements, timing, colors, booleans, alignments, and other non-Tailwind values retain their appropriate existing controls.

### 7.3 Automated architecture guards

Implement `scripts/verify-tailwind-field-architecture.js` with the TypeScript compiler API already installed by the project; do not add a parsing dependency. Store the temporary baseline and exceptions in `scripts/tailwind-field-legacy-allowlist.json` using stable, granular identities such as file, declaration kind, exported/local symbol, scope ID, and field key. Do not key exceptions by line number, and do not allow an entire file or config scope.

The verifier must fail on newly introduced:

- Tailwind-looking local option arrays in panel/config files.
- Tailwind-class string unions outside generated/shared infrastructure.
- Normalizer-only Tailwind allowlists.
- Imports of deprecated raw option arrays from migrated scopes.
- Component-scoped token-membership declarations.
- Dynamic utility construction such as `` `px-${value}` ``.
- Direct edits or stale output in the generated registry.

Avoid a broad regular expression that treats every string enum as Tailwind. The syntax-aware checks should identify known utility prefixes and relevant declaration shapes while excluding generated files, ordinary mode/alignment enums, shared global choice sets, and exact legacy entries. Remove each Abstract baseline entry as its declaration migrates; the baseline may not grow without explicit architectural review.

Add the enum ceiling to shared `defineConfigScope` validation as a general invariant: an `enum` with more than eight options fails in development/tests and instructs the author to use `select`. The Tailwind factory still chooses the correct kind automatically, but the schema-level guard protects handwritten non-Tailwind fields too.

The repository currently contains exactly six known oversized handwritten enums. Temporarily allowlist only these scope-and-field identities:

```text
FiberHeading / appearance / containerHeight
FiberHeading / appearance / containerHeightDesktop
FiberHeading / appearance / fontSize
FiberHeading / appearance / fontSizeDesktop
SiteHeader / colors / height
SiteHeader / colors / desktopHeight
```

The first pair has 10 options, the second pair has 9, and the SiteHeader pair has 10. Validation behavior is therefore explicit:

- An enum with eight or fewer options is valid.
- An enum above eight is temporarily valid only when it exactly matches an allowlisted scope ID and field key.
- Every other oversized enum is an error.
- Any attempt to broaden or add to the allowlist fails review unless accompanied by an explicit migration rationale.

Remove the two SiteHeader exceptions during the SiteHeader migration and the four FiberHeading exceptions in a dedicated migration. Delete the allowlist mechanism once it is empty.

Implementation audit correction: enabling the runtime invariant exposed two additional oversized enums whose options were supplied through shared constants and therefore escaped the earlier inline-only audit. They were corrected immediately rather than allowlisted: `PolymorphicLayout/centeredContentMaxWidth` (9 options) and `TableOfContents/coarsePointerMinHeight` (11 options) now use `select`. The six-entry exception list above remains exact and did not grow. These two control-form corrections join the Abstract border-width controls in mandatory rendered verification.

### 7.4 Deprecation and removal

Compatibility exports from `components/tailwindSpacingScale.ts`, `components/tailwindTypographyScale.ts`, and similar modules remain temporarily so the pilot does not force an unrelated repository-wide rewrite. Do not deprecate an entire module: `tailwindSpacingScale.ts` also contains `tailwindSpacingTokenToPx`, a runtime helper with legitimate non-panel consumers. Instead, compatibility option/type exports re-export generated values where their contracts match and receive individual JSDoc `@deprecated` guidance.

Once a scope migrates:

- It may no longer import those raw arrays.
- Individual legacy option/type exports receive `@deprecated` guidance pointing to the global utility API.
- The architecture guard prevents new consumers.
- An export is removed only when `rg` confirms zero consumers, its legacy allowlist entries are gone, and affected scopes have passed their required rendered verification.

### 7.5 Review checklist

Every migrated/new Tailwind-backed field must answer yes to:

1. Does the value come from the resolved Tailwind theme?
2. Is the consumer referencing a global utility rather than declaring membership?
3. Are breakpoint variants generated from the same utility/policy?
4. Are type, options, normalization, and control kind derived from the same registry entry?
5. Is any reduced exposure policy shared, evidence-based, and centrally defined?
6. Is the final utility class and computed result verified at the rendered consumer?

## 8. SOLID boundaries

- **Single Responsibility:** Tailwind defines tokens; the generator translates resolved theme data; the registry stores generated literals and policy; the field factory creates Panel definitions; the normalizer validates values; Abstract declares page-specific intent.
- **Open/Closed:** supporting a new utility family adds a manifest entry and generated data without modifying the generic Panel renderer.
- **Liskov Substitution:** generated fields remain ordinary `SelectConfigField` or `EnumConfigField` values and work wherever those existing contracts work.
- **Interface Segregation:** Abstract imports the small field/normalization APIs and derived types, not raw option-array implementation details.
- **Dependency Inversion:** page configuration depends on stable utility-family identifiers rather than concrete handwritten token arrays.

## 9. Automated verification

Add tests for:

1. `generate-tailwind-config-fields.js --check` proves generated output is byte-for-byte current with `tailwind.config.js` and the utility manifest without modifying the worktree.
2. Every generated option has a unique value and a complete literal Tailwind class.
3. Every utility derives from its declared resolved Tailwind scale without a consumer-owned token list.
4. Every shared exposure policy resolves against its declared Tailwind scale and is referenced by meaning rather than by consumer identity.
5. Every semantic option has documented non-CSS behavior and does not masquerade as a Tailwind token.
6. Base/`md`/`lg` variants generated from a utility/policy combination contain identical token membership and differ only by their responsive prefix.
7. Every generated config type corresponds to its registry values.
8. Every default used by a migrated field appears in its selected utility/policy and breakpoint variant.
9. Invalid persisted values fall back to the field's default.
10. No utility/policy combination with more than eight options resolves to `enum`.
11. `tailwindField()` returns `kind: 'select'` or `kind: 'enum'` according to centralized policy.
12. Existing Panel schema validation, Storybook control mapping, and copy/update behavior continue to accept the produced standard field definitions.
13. The architecture guard rejects representative local Tailwind arrays, unions, allowlists, component profiles, and dynamic class construction while allowing ordinary non-Tailwind enums.
14. Shared scope validation rejects an enum with more than eight options.
15. Migrated scopes cannot import deprecated raw option arrays.
16. Generated files are current and protected from manual edits by regeneration/diff checks.
17. The Abstract migration resolves to 35 spacing/gap, 13 font-size, 9 font-weight, and 5 border-top-width options with the control kinds recorded in §6.4.
18. The object-argument normalizer accepts valid base/`md`/`lg` values and falls back for a value from the wrong utility or breakpoint.
19. The typed scope factory accepts compatible keys and has compile-time rejection fixtures for incompatible config properties.
20. The six exact legacy oversized enums remain temporarily accepted, while a seventh/unlisted oversized enum fails; an attempted wildcard or file-wide exception also fails.
21. The architecture verifier's baseline is symbol-based and deterministic, ignores generated files and approved global choice sets, and rejects baseline growth that lacks explicit review metadata.
22. `pretest`, `prebuild`, and `verify:release` exercise the read-only verification path; none regenerates stale output.

Run the project type-check and the relevant Panel/config tests after migration.

## 10. Mandatory rendered verification

Because this changes config-panel controls, completion requires live visual verification under the repository's resource-safety rules:

1. Inspect existing Next, Chrome/Chromium, and Playwright processes before starting verification.
2. Start at most one agent-owned Next server on a non-3000 port with a private build directory.
3. Use at most one browser instance and close it after the bounded check.
4. Open Abstract at every breakpoint affected by the migrated fields.
5. Capture and inspect the default footer state.
6. Change each migrated token family through its real config-panel control, testing relevant minimum and maximum values.
7. Confirm long token sets render as native selects and no generated set over eight options renders as a segmented enum row.
8. Inspect the final DOM class and computed style at the actual footer consumer. Confirm spacing and typography move in the expected direction; checking only upstream state is insufficient.
9. Exercise every responsive/alternate footer render path affected by the fields.
10. Record viewport, selected token, screenshot path, final DOM/computed result, and observed behavior in the implementation handoff.
11. Stop the agent-owned browser and development server and report that no verification process remains running.

Implementation handoff (2026-09-24): one private Next dev server ran on port 3001 and one Playwright Chromium instance checked Abstract at 390×844, 768×900, and 1280×900. At every viewport the real panel rendered spacing as a native select with 35 options, font size with 13, font weight with 9, and top-border thickness as a five-button enum. The config controls were changed through the panel to their minimum and maximum values. At minimum, the footer consumer had `py-0`, `px-0`, `gap-0`, and `border-t-0`, with computed padding, gap, and border width all 0px. At maximum it had `py-96`, `px-96`, `gap-96`, and `border-t-8`, with computed padding, gap, and border width all 384px, 384px, 384px, and 8px respectively; generated `pb-96`, `pt-96`, `mt-96`, `text-9xl`, and `font-black` classes were present on final descendants. The title descendant selector used for computed font-size/font-weight sampling did not resolve an element, so those two computed values were not recorded. Screenshots (default, minimum, and maximum for each viewport) are in `/tmp/abstract-voyage-tailwind-verification/`. The maximum screenshots apply maximum values to all fields at once and are useful for checking control behavior/classes, not for judging a plausible page composition. The browser and private server were closed; no verification process remains running.

Follow-up verification (2026-09-24): reopened the page on the same private port and visually inspected the rendered 1280×900 screenshot at `/tmp/abstract-voyage-tailwind-verification/final-1280.png`. DOM inspection confirmed the footer-navigation “About” label computes to 14px / 400 (its class list includes the authored `text-sm font-normal`; the 14px result reflects the page's final consumer styling). The 390×844 screenshot was also captured at `/tmp/abstract-voyage-tailwind-verification/final-390.png`. This follow-up did not complete a reliable real-control interaction for the two newly corrected oversized fields: `centeredContentMaxWidth` is conditional on centered layout and remained hidden while the page was in split layout, and the Abstract page does not expose the Table of Contents scope containing `coarsePointerMinHeight`. Therefore their native-select presentation and value-to-rendered-output behavior still require verification on the appropriate scope/page; do not treat the prior type/schema checks as rendered verification for those two fields. A typography-change interaction was attempted but did not complete within the bounded browser run, so only the default final-consumer computed sample above is confirmed. The browser was closed and the private server was stopped; no verification process remains running.

## 11. Acceptance criteria

The first slice is complete when:

- A new Abstract Tailwind-backed field can be authored by naming a utility family and field metadata without writing or importing an options array.
- SiteHeader or another consumer can reference the same global utility at base/`md`/`lg` without defining token membership.
- Any constrained subset is a reusable shared exposure policy with documented evidence, never a component-scoped token list.
- The resolved Tailwind theme is the token source, and generated literal classes remain visible to Tailwind's compiler.
- The checked-in generated registry is deterministic, current, and organized by utility and breakpoint; test/build/release checks do not mutate it.
- `pages/abstract.config.ts` no longer creates local `FOOTER_*_CLASSES` arrays for migrated Tailwind values.
- `pages/abstract.panel.ts` no longer manually chooses or supplies options for migrated Tailwind fields.
- The shared Panel resolver remains the sole builder of the final Select or SegmentedControl.
- Control choice is centralized, stable, and rejects enums above the eight-option ceiling.
- The root `AGENTS.md` contains the Tailwind-backed-field authoring rule after the shared APIs exist.
- The typed scope factory makes the compliant field definition shorter than manual option wiring.
- Architecture guards prevent new duplicated Tailwind arrays, unions, allowlists, component profiles, and dynamic class construction outside explicit legacy allowances.
- The only temporarily accepted oversized enums are the six exact identities in §7.3, and the exception set cannot silently broaden.
- Migrated scopes cannot add new dependencies on deprecated option exports, and removal criteria are documented.
- Existing mixed-purpose scale modules remain usable for legitimate runtime helpers; only replaceable option/type exports are individually deprecated.
- Existing defaults, normalization fallback behavior, config copy/update behavior, and rendered output remain correct.
- Automated and rendered verification requirements in this document are satisfied and recorded.
