# PLAN-SHARED-COMPONENT-CAPABILITY-PROPAGATION

## Decision

A capability added to a shared component must become available, configurable,
and persistable for every registered page instance without page-specific
runtime wiring, copied defaults, or manually seeded source properties.

This plan replaces the current three-way manual contract:

1. the component owns rendering and config fields;
2. each page independently decides whether/when the capability runs;
3. each page config source must already contain a literal property before
   `UPDATE DIFF` can persist it.

The Timeline introduction failure exposed all three gaps. The solution is a
general capability system, not a Timeline-only repair.

## Product contract

For every shared component instance registered in a page config panel:

1. Adding a capability and its schema to the shared component makes its
   fields appear in every page's panel automatically.
2. Every page instance receives the runtime capability automatically, using
   the same shared lifecycle contract; omission by a call site is impossible.
3. A user can change any newly added field and use `UPDATE DIFF` immediately,
   even when that page has never before written that field explicitly.
4. Page-specific defaults and overrides remain possible, but they are
   optional—not prerequisite plumbing for a new shared capability.
5. Production behavior remains safe: disabled/default capabilities are
   visually inert, reduced-motion behavior is honored, and no feature is
   accidentally enabled merely by a panel schema migration.

## Root causes to remove

### Runtime orchestration is a manually threaded optional prop

`AboutTimeline` only starts its introduction when it receives both a config
flag and an optional `introStartAt` prop. `/abstract` creates and passes that
timestamp; `/about` does neither. Optional props preserve compatibility but
make feature adoption invisible to TypeScript and easy to omit.

### Config persistence patches object literals, not resolved overrides

Page defaults are commonly written as `{ ...SHARED_DEFAULT, pageOverride }`.
The panel's live value includes inherited shared fields, while the source
updater can replace only properties already written literally in the page
object. A new shared field therefore appears in the panel but fails as an
unmatched key on `UPDATE DIFF`.

### Capability registration has no declarative integration contract

The panel field list, component behavior, page lifecycle, per-page defaults,
and write target are separate structures. There is no manifest proving that a
shared capability has a runtime provider and a writable override destination
for every registered instance.

## Target architecture

### 1. Shared `ComponentCapability` descriptors

Introduce a typed descriptor owned by each shared component, alongside its
config/type module. A descriptor declares:

- stable capability id and version;
- config field definitions and normalized shared defaults;
- optional lifecycle dependency (for example `pageIntro`);
- the component-facing resolved capability value;
- a safe default behavior and reduced-motion behavior;
- migration metadata for newly introduced fields.

The Timeline intro becomes one descriptor within `AboutTimeline`; future
shared capabilities use the same form. Page panels compose descriptor fields
rather than importing a hand-maintained field array alone.

### 2. App-level page capability runtime

Create one provider/hook for lifecycle signals that every page receives from
the page shell, e.g. `PageCapabilityRuntimeProvider` and
`usePageCapabilityRuntime()`.

It owns stable signals such as:

- `introStartAt`, released only after the shared page-layout readiness rule;
- `prefersReducedMotion`;
- page mount/navigation identity for intentional replay;
- future signals such as visibility or route-transition readiness.

Shared components read declared lifecycle signals from this context. They no
longer require page-specific `introStartAt` props. Page-level layout readiness
may still be supplied by a page adapter, but the provider owns the normalized
contract and every descendant gets it automatically.

This means adding a Timeline intro capability changes `AboutTimeline` once;
all registered Timeline instances receive the same lifecycle source.

### 3. Explicit page override records

Separate two concepts currently conflated in `DEFAULT_*_PAGE_*_CONFIG`:

- **shared resolved defaults**: the canonical config supplied by the shared
  component descriptor;
- **page override record**: only properties that intentionally diverge for a
  page, typed as a partial override.

Each page resolves a component config through one shared helper:

`resolveComponentConfig(sharedDefaults, pageOverrides)`.

Panels display the resolved config. Persistence targets the page override
record, not a spread-derived resolved object. A page therefore need not repeat
new shared fields merely so they can be edited.

### 4. Schema-aware config updater

Replace the current "replace existing literal only" limitation with an
updater that operates on declared page override records.

For a field known to the shared component schema:

- if the override property exists, replace it;
- if it does not exist, insert it in the page override object with preserved
  formatting and deterministic ordering;
- if the value equals the shared default, remove the page override property
  (or preserve it only when an explicit pinning policy requires it);
- reject keys absent from the descriptor schema, target symbols that are not
  registered override records, malformed source, and ambiguous targets.

This preserves the present safety property—no arbitrary property insertion—
while making schema-approved new fields persistable without page edits.

### 5. Registration manifest and invariant tests

Make every page/component registration machine-readable. A registration must
identify the shared component descriptor, page override symbol/file, and
runtime provider requirement. Build/test checks must fail when:

- a page registers fields that are absent from the descriptor;
- a descriptor lifecycle requirement has no active page runtime provider;
- a registered page's override target cannot accept insertion;
- `UPDATE DIFF` cannot add, update, then remove a newly introduced field;
- an alternate component render path bypasses the shared runtime context.

## Implementation phases

### Phase 0 — inventory and compatibility baseline

1. Inventory all `defineConfigScope`/`definePageConfigScope` registrations
   whose defaults use shared-object spreads.
2. Inventory shared components receiving optional page lifecycle props.
3. Classify each shared component as presentation-only, lifecycle-aware, or
   requiring a page adapter.
4. Record existing serialized config payloads and verify no production panel
   code is shipped.

Deliverable: an explicit migration matrix of component, page instances,
current target symbol, render paths, and lifecycle dependencies.

### Phase 1 — capability and runtime foundations

1. Define descriptor and registration types with compile-time generic links
   between config keys, panel fields, and override records.
2. Implement the app/page runtime provider and its reduced-motion semantics.
3. Add a minimal page-shell adapter API for readiness without exposing raw
   timestamp plumbing to components.
4. Unit-test lifecycle delivery, replay identity, SSR-safe initial state, and
   reduced-motion behavior.

Deliverable: a shared component can consume a declared lifecycle capability
without a page passing a bespoke prop.

### Phase 2 — override resolution and safe source mutations

1. Introduce page override records and the shared resolution helper.
2. Migrate the config serializer to emit schema-aware override payloads.
3. Extend the AST updater to insert/remove only schema-approved override
   keys, preserving comments and stable source formatting.
4. Make no-op updates write nothing; retain local-only endpoint protections
   and route-readiness handling.
5. Test insertion, replacement, removal, invalid-key rejection, spread-based
   page defaults, comments, typed objects, and multi-scope atomicity.

Deliverable: a newly added shared field can be saved from any registered page
without pre-seeding that page's source object.

### Phase 3 — Timeline as the reference migration

1. Move Timeline introduction configuration into an `AboutTimeline`
   capability descriptor.
2. Replace `introStartAt` call-site wiring with the shared runtime hook.
3. Convert `/about` and `/abstract` Timeline defaults to page override
   records; preserve their intentional visual differences only.
4. Confirm all Timeline render paths: `/about` desktop, `/abstract` desktop,
   `/abstract` mobile pinned list, and every other `AboutTimeline` consumer.
5. Exercise panel changes through the real controls: enable, delay, duration,
   easing, stagger/gap, overlap, reset to inherited default, and `UPDATE
   DIFF` on each page.

Deliverable: Timeline capability added once works and persists everywhere.

### Phase 4 — systemic migration

1. Migrate the remaining shared components incrementally, starting with
   components already using optional page intro/reveal props.
2. Replace duplicated panel-field imports with descriptor-derived fields.
3. Remove obsolete page-local lifecycle state and pass-through props only
   after all alternate render paths use the provider.
4. Add a codemod/lint rule that rejects newly introduced optional lifecycle
   props on registered shared components unless explicitly justified by the
   descriptor model.

Deliverable: no supported shared capability depends on undocumented per-page
integration.

### Phase 5 — release gates

Required automated coverage:

- Type-level tests for descriptor/config/override key alignment.
- Unit tests for every updater operation and rejection path.
- Integration tests that create a new descriptor field and prove it appears,
  applies, saves, reloads, and resets on at least two page instances without
  source edits to either page.
- Regression tests for alternate render paths and reduced motion.

Required visual coverage, performed under the repository resource-safety
protocol:

- One controlled browser instance and private Next build directory only.
- Desktop and mobile page instances; default, enabled, and extreme timing
  values changed through the actual panel.
- Screenshots plus final DOM/computed opacity and transition-delay checks at
  the real component consumer.
- Record viewport, config values, screenshot paths, and result.

## Acceptance criteria

The work is complete only when adding a test-only shared Timeline field
requires changes in the shared descriptor/component alone and all of the
following succeed on both `/about` and `/abstract`:

1. The field is visible in the component panel.
2. Changing it changes the live rendered component.
3. `UPDATE DIFF` writes a page override even when the property was absent.
4. Reload preserves the change without a 404 or compilation failure.
5. Reset removes the override and restores the shared default.
6. No page-specific component call-site lifecycle prop or literal config
   seeding was needed for that new capability.

## Non-goals

- Do not globally force every capability on; descriptor defaults remain
  deliberate and safe.
- Do not permit arbitrary config-panel keys to be inserted into source.
- Do not conflate page editorial/content configuration with shared component
  behavior; only component capability overrides enter this system.
- Do not migrate every existing component in one unreviewable change.
