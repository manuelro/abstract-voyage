# PLAN — fix the recurring About/Abstract config-update cross-write bug

Scope: `experiences/abstract/components/PolymorphicLayout.pageConfigs.ts`, the manual/LLM-driven `component-config-update/v1` apply procedure, and (new) a symbol-scoped apply tool plus a verification backstop wired into the existing release pipeline.

**Revision history:**
- v1 proposed splitting the three configs into separate files. Dropped — reverses a deliberate architectural ruling (`PLAN-CONFIG-SCOPE-PAGE-OWNERSHIP.md`'s Round 1).
- v2 proposed a **verify-only** gate (catch the mistake after the fact, before promotion). Correctly flagged by the user as insufficient: "no leaking must happen" means the leak shouldn't be *possible*, not just *caught before shipping*. A post-hoc gate is a cleanup safety net, not segregation.
- **v3 (this version):** a symbol-scoped **apply** tool that makes the leak structurally impossible at edit time, without reversing the file consolidation. See §4 for why this resolves both the leak risk and the shape-drift risk simultaneously, and §4.3 for how it covers every breakpoint tier uniformly.

## 1. Assessment — confirmed root cause, not a guess

**What happened, verified directly against source:**

```
$ grep -n "splitBandRightCustomColor" PolymorphicLayout.pageConfigs.ts
85:   splitBandRightCustomColor: '#1c1c40',   <- inside ABSTRACT_POLYMORPHIC_LAYOUT_CONFIG (starts line 60)
363:  splitBandRightCustomColor: '#cbcbe1',   <- inside ABOUT_POLYMORPHIC_LAYOUT_CONFIG (starts line 329) — UNCHANGED
```

The payload's header said `target_symbol: ABOUT_POLYMORPHIC_LAYOUT_CONFIG`. The value was written into `ABSTRACT_POLYMORPHIC_LAYOUT_CONFIG` instead, and `ABOUT_POLYMORPHIC_LAYOUT_CONFIG`'s own field was never touched.

**Why this happens, structurally:**

1. **All three page-scoped `PolymorphicLayoutConfig` instances live in one file**, each an `export const NAME: PolymorphicLayoutConfig = { ... }` — a plain type annotation, not `satisfies` (confirmed directly: line 60 and line 329 both read `: PolymorphicLayoutConfig = {`).
2. **The file consolidation itself is deliberate** — cites `PLAN-CONFIG-SCOPE-PAGE-OWNERSHIP.md`'s Round 1 ruling: co-locating every page's instance of one shared type exists to catch the case where a page silently gets left behind when the shared type's shape changes.
3. **But that specific risk is already caught by the compiler, independent of file location.** `: PolymorphicLayoutConfig` (a type annotation, not a loose object) forces every field to be present on every one of these consts wherever they live — TypeScript will not compile if a required field is missing from any of them, full stop. The real thing "one place to see everything" protects against is subtler: a human adding a new field, satisfying the compiler by pasting the *same* default value into all three configs without actually considering whether the pages should diverge on it — a judgment risk, not a compiler-checkable one. **This distinction is the key correction in this revision** — file location was never protecting against the failure that actually happened (wrong-symbol writes), and splitting is no longer off the table for that reason, but the judgment-risk it protects against still needs an answer if we split. See §4.2.
4. **Every field name is identical across all three blocks** (same type) — so a field-name search matches every block, at every breakpoint tier the field has (base/Wide/Lg suffixes included), which is why "verify after the fact" and "add a louder comment" both stay reactive rather than preventive: neither changes *how* the edit gets located, only what happens after.
5. **No tooling applies these payloads today** — `components/Panel/componentConfigPayload.ts` only formats the payload text for the COPY button. Applying it is a fully manual, textual, unscoped edit (human or LLM), every time.
6. **The only mitigation on record is a code comment, already proven insufficient twice before this incident** (the file's own `STOP` warning cites two prior dated occurrences; this report is confirmed #3).

## 2. Requirement, restated precisely

Config *infrastructure* (the `PolymorphicLayoutConfig` type, `PolymorphicLayout.tsx`, the panel field definitions) is correctly shared across pages — that's the point of it. What must be strictly segregated is the *values* — each page's own instance — with **zero leakage in either direction, at every breakpoint tier** (base/Wide/Lg, i.e. every `*Wide`/`*Lg`-suffixed field alongside its base sibling), not just for the specific field that leaked this time.

"Zero leakage" means: it must be **impossible for an edit targeting one page's symbol to land in another page's symbol** — not merely detected afterward. A post-hoc gate does not satisfy this; it satisfies "leaks get caught," which was correctly rejected.

## 3. Why a comment or a verify-only gate don't satisfy §2

- **Comment:** advisory, already failed 3 times. Doesn't change how an edit is located.
- **Verify-only gate (v2 of this plan):** the edit already happened and already landed in the wrong symbol by the time the gate runs. The gate reports it; it doesn't prevent it. There is a real window — edit made, diff produced, possibly even glanced at and believed correct — before any check runs. That window is exactly where "no leaking" is violated. Rejected as insufficient, per the user's own framing.

## 4. The real fix — a symbol-scoped apply tool (primary), verify gate (backstop)

### 4.1 Primary defense: make the write itself incapable of targeting the wrong symbol

Add a script (e.g. `scripts/apply-config-payload.ts`) built on `ts-morph` (an ergonomic wrapper over the TypeScript compiler API purpose-built for exactly this "load source, find a node, mutate it, save with formatting preserved" workflow — `typescript` itself is already a devDependency; `ts-morph` would be a new, narrowly-scoped addition). The tool:

1. Takes a `component-config-update/v1` payload (parsed with the same shape `ComponentConfigPayload` in `componentConfigPayload.ts` already defines — one parser, not two).
2. Opens `target_file` as a `ts-morph` `SourceFile`.
3. Finds the top-level `VariableDeclaration` whose name is **exactly** `target_symbol` — an AST lookup by declared identifier, not a text/regex search across the file. If no such declaration exists, or more than one does (shouldn't happen with valid TS, but check), **hard-fail with no file changes written.**
4. Gets that declaration's initializer, asserts it's an `ObjectLiteralExpression` (fails otherwise — wrong shape, don't guess).
5. For each `key: value` in the payload's `config:` block:
   - `update_strategy: merge` — find the existing `PropertyAssignment` named `key` **inside this specific object literal's own property list** and replace its value; if `key` doesn't exist yet on this object, insert it (merge means "add/update these fields," not "these fields must already exist" — matches the payload's own stated semantics).
   - `update_strategy: replace_scope` / `complete_scope: true` — replace the entire object literal's property list with the payload's complete `config:` block.
6. Writes the file. Prints exactly which lines changed, for the applier's final check to confirm against — a diff scoped to one object, not a full-file eyeball.

**Why this actually satisfies "no leaking," not just "leaking is caught":** the tool locates the target by the AST's own declared symbol name, the same mechanism the TypeScript compiler itself uses to disambiguate identically-named-field objects — it is not running a field-name search that can match two blocks. A payload with `target_symbol: ABOUT_POLYMORPHIC_LAYOUT_CONFIG` can only ever resolve to the one declaration with that exact name; there is no code path in this tool that could instead touch `ABSTRACT_POLYMORPHIC_LAYOUT_CONFIG`. This holds identically for every field and every breakpoint-tiered variant (`splitBandRightCustomColor`, `splitBandRightCustomColorWide`, `splitBandRightCustomColorLg`, and every other field in the type) — the tool never inspects field names to decide *which object* to edit, only *which property on the already-identified object*, so tier suffixes are irrelevant to the safety guarantee.

This becomes the **required, sole method** for applying a `component-config-update/v1` payload — replacing manual hand-editing outright, not supplementing it as an optional convenience. Document this explicitly in `CONFIG-CHANGE-PROTOCOL.md` §2 ("Apply" stage) and in wherever AGENTS.md's own 4-step manual procedure is defined — that manual procedure is retired, not kept as an alternative.

### 4.2 Preserving the legitimate part of Round 1's concern

Since file consolidation is no longer load-bearing for preventing wrong-symbol writes (the tool now does that), the "silently identical defaults across pages" judgment risk (§1.3) still deserves an answer, independent of file layout:

Add a small companion script/test (e.g. `PolymorphicLayout.pageConfigs.divergence.test.ts`) that imports all page-scoped instances of a shared config type and, for any field where **all instances currently hold the exact same value**, prints/asserts it as an informational list — "these N fields are identical across all pages: [...]." Not a hard failure (many fields *should* legitimately be identical), but a standing, always-available report that gives back the "see everything side by side" property Round 1 wanted, generated on demand rather than depending on physical file adjacency. This means file layout (co-located vs. split) stops being the thing carrying that responsibility either way — freeing §4.1's tool to be the single source of truth for correctness regardless of whether the configs stay in one file or move to separate ones later.

### 4.3 Backstop: keep a verify check too, for edits that bypass the tool

Even with 4.1 as the mandatory path, keep a lightweight version of the v2 verify check (diff-based: does a change touch more than one exported config symbol in a shared-type file) wired into `npm run verify:release`, as a safety net for the case someone hand-edits anyway — a human without the tool available, or a future LLM session that doesn't know to use it. Not the primary defense anymore (4.1 is), but cheap insurance and consistent with `CONFIG-CHANGE-PROTOCOL.md` §4 already requiring this gate.

## 5. Regression fix for this specific incident

1. Confirm `ABSTRACT_POLYMORPHIC_LAYOUT_CONFIG`'s own correct pre-incident `splitBandRightCustomColor` value via git history before touching anything.
2. Restore that value to `ABSTRACT_POLYMORPHIC_LAYOUT_CONFIG`.
3. Apply `splitBandRightCustomColor: '#1c1c40'` to `ABOUT_POLYMORPHIC_LAYOUT_CONFIG`, where the original payload always intended it — via the new tool (§4.1) once built, as its first real validation.
4. Visually verify both `/about` (band now shows `#1c1c40`) and `/abstract` (band reverts to its own prior, correct color) at every breakpoint tier the field has (base/Wide/Lg), per `CONFIG-CHANGE-PROTOCOL.md` §5's visual gate.

## 6. Order of operations

1. Build the apply tool (§4.1) — this is the actual fix; everything else is either backstop or nice-to-have.
2. Use it to perform the regression fix (§5) — first real usage doubles as validation.
3. Add the divergence report (§4.2) and the verify backstop (§4.3).
4. Update `CONFIG-CHANGE-PROTOCOL.md` §2 to name the tool as the required, sole Apply method, and retire the manual 4-step procedure it currently describes.
