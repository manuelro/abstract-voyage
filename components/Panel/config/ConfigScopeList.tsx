'use client';

import React, { useContext, useMemo, useState } from 'react';
import { PanelDragFrostContext, SubLabel } from '../index';
import styles from '../Panel.module.css';
import { ConfigScopeRenderer } from './ConfigScopeRenderer';
import type { ConfigScopeBinding } from './types';
import {
  useConfigScopeSortPreference,
  type ConfigScopeSortPreference,
} from './useConfigScopeSortPreference';
import { useConfigScopeGlobalFilter } from './useConfigScopeGlobalFilter';
import { getRankedScopeIds, useConfigScopeUsageSnapshot } from './useConfigScopeUsage';

// At most this many pinned shortcuts — highly used, not manually curated;
// see useConfigScopeUsage.ts's own doc comments for how usage is tracked
// and ranked. Builds on PLAN-CONFIG-PANEL-SEARCH-AND-ORDERING.md's already-
// implemented search/sort work.
const FREQUENTLY_USED_LIMIT = 3;

const SORT_OPTIONS: ReadonlyArray<{ label: string; value: string }> = [
  { label: 'NAME A→Z', value: 'name-asc' },
  { label: 'NAME Z→A', value: 'name-desc' },
  { label: 'NEWEST', value: 'recency-desc' },
  { label: 'OLDEST', value: 'recency-asc' },
];

function sortStateToValue(sort: ConfigScopeSortPreference) {
  return `${sort.field}-${sort.direction}`;
}

function valueToSortState(value: string): ConfigScopeSortPreference {
  const [field, direction] = value.split('-') as [
    ConfigScopeSortPreference['field'],
    ConfigScopeSortPreference['direction'],
  ];
  return { field, direction };
}

function matchesQuery(binding: ConfigScopeBinding, query: string) {
  if (!query) return true;
  const needle = query.toLowerCase();
  const { title, summary, component } = binding.definition;
  return (
    title.toLowerCase().includes(needle)
    || Boolean(summary?.toLowerCase().includes(needle))
    || component.toLowerCase().includes(needle)
  );
}

function compareBindings(a: ConfigScopeBinding, b: ConfigScopeBinding, sort: ConfigScopeSortPreference) {
  const comparison = sort.field === 'name'
    ? a.definition.title.localeCompare(b.definition.title, undefined, { sensitivity: 'base' })
    : a.definition.createdAt.localeCompare(b.definition.createdAt);
  return sort.direction === 'asc' ? comparison : -comparison;
}

/**
 * Owns the search input, sort toggle, filter/sort logic, and the
 * `.map()` → `ConfigScopeRenderer` render for a page's/panel's full
 * `ConfigScopeBinding` array — the shared piece every host renders its
 * scope list through, so adding a scope anywhere is purely additive (append
 * to the host's own bindings array, no JSX ever touched here again). Always
 * pass the complete, unfiltered array — GradientDesignerPanel reads
 * individual bindings out of this same array by id for its own bespoke
 * sections before also rendering the full list through this component, and
 * that pre-existing double-render must keep working unchanged.
 */
export function ConfigScopeList({ bindings }: { bindings: ReadonlyArray<ConfigScopeBinding> }) {
  const dragFrostActive = useContext(PanelDragFrostContext);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useConfigScopeSortPreference();
  const [globalOnly, setGlobalOnly] = useConfigScopeGlobalFilter();
  const usage = useConfigScopeUsageSnapshot();

  // Applied ahead of both derived lists below (search results and the
  // frequently-used strip), same "global" ConfigScopeBinding.global already
  // means (types.ts: sourced from SharedDesignConfigProvider, editing it has
  // real cross-page repercussions) — so both stay consistent with each
  // other and with the toggle's own label, rather than only search results
  // respecting it.
  const scopedBindings = useMemo(() => (
    globalOnly ? bindings.filter(binding => binding.global === true) : bindings
  ), [bindings, globalOnly]);

  // Candidates are this host's own (already global-filtered) bindings only —
  // a globally-popular scope that doesn't exist on the current page can
  // never be ranked in (see getRankedScopeIds's own doc comment). Query
  // filtering happens *before* ranking, not after: ranking-then-filtering
  // would take the top 3 most-used scopes overall and only then discard any
  // that don't match the query, which can silently under-fill (or empty)
  // the strip even when a 4th- or 5th-most-used scope matches the query
  // perfectly. Filtering first means "most-used among what actually matches
  // this search" — the strip narrows down with a search instead of either
  // vanishing outright or showing stale, irrelevant candidates.
  const frequentlyUsedBindings = useMemo(() => {
    const queryMatchedCandidates = scopedBindings.filter(binding => matchesQuery(binding, query));
    const rankedIds = getRankedScopeIds(
      usage,
      queryMatchedCandidates.map(binding => binding.definition.id),
      FREQUENTLY_USED_LIMIT,
    );
    const bindingById = new Map(queryMatchedCandidates.map(binding => [binding.definition.id, binding]));
    return rankedIds.map(id => bindingById.get(id)).filter((binding): binding is ConfigScopeBinding => (
      Boolean(binding)
    ));
  }, [scopedBindings, query, usage]);

  // Excludes whatever's already shown in the Frequently Used strip above —
  // without this, a scope pinned there also rendered again here, the exact
  // duplicate-listing bug this de-dup fixes.
  const frequentlyUsedIds = useMemo(() => (
    new Set(frequentlyUsedBindings.map(binding => binding.definition.id))
  ), [frequentlyUsedBindings]);

  const visibleBindings = useMemo(() => {
    return scopedBindings
      .filter(binding => !frequentlyUsedIds.has(binding.definition.id))
      .filter(binding => matchesQuery(binding, query))
      .slice()
      .sort((a, b) => compareBindings(a, b, sort));
  }, [scopedBindings, query, sort, frequentlyUsedIds]);

  return (
    <>
      {/* First thing under the panel title/COPY/RESET row — search is the
          primary way to reach a section in a 40+-scope panel, so it no
          longer waits behind the Frequently Used strip. .scopeListToolbar's
          own position: sticky/top: 0 now pins it there from the very start
          of the scroll, not just once you've scrolled past that strip. */}
      <div
        className={styles.scopeListToolbar}
        data-drag-frost={dragFrostActive ? 'true' : undefined}
      >
        <div className={styles.scopeListSearch}>
          <input
            type="text"
            className={styles.textInput}
            placeholder="Search sections…"
            value={query}
            onChange={event => setQuery(event.target.value)}
            aria-label="Search config sections"
          />
        </div>
        {/* Sort (single-select, 4 options) and "Global only" (independent
            toggle) share one bordered group and one button visual
            (.segmentButton) instead of three separately-chromed controls —
            same aria-pressed/data-selected pattern on every button, so the
            toggle reads as "one more button in this row that happens to be
            independently pressable" rather than a structurally different
            control. Raw buttons here, not the exported SegmentedControl/
            Toggle components — those two stay unchanged for their many
            other call sites throughout the panel system; this merged row
            is specific to this toolbar. */}
        <div className={styles.scopeListControlGroup} role="group" aria-label="Sort and filter config sections">
          {SORT_OPTIONS.map(option => {
            const selected = sortStateToValue(sort) === option.value;
            return (
              <button
                key={option.value}
                type="button"
                className={styles.segmentButton}
                data-selected={selected ? 'true' : 'false'}
                aria-pressed={selected}
                onClick={() => setSort(valueToSortState(option.value))}
              >
                {option.label}
              </button>
            );
          })}
          <button
            type="button"
            className={`${styles.segmentButton} ${styles.scopeListGlobalToggle}`}
            data-selected={globalOnly ? 'true' : 'false'}
            aria-pressed={globalOnly}
            onClick={() => setGlobalOnly(!globalOnly)}
          >
            Global only
          </button>
        </div>
      </div>
      {frequentlyUsedBindings.length > 0 ? (
        <div className={styles.scopeListFrequentlyUsed}>
          <SubLabel>Frequently used</SubLabel>
          {frequentlyUsedBindings.map(binding => (
            <ConfigScopeRenderer key={`frequently-used-${binding.definition.id}`} binding={binding} />
          ))}
        </div>
      ) : null}
      {visibleBindings.length === 0 && frequentlyUsedBindings.length === 0 ? (
        <div className={styles.scopeListEmpty}>
          {query
            ? `No sections match “${query}”`
            : 'No global sections on this page'}
        </div>
      ) : null}
      {visibleBindings.length > 0 ? (
        <div className={styles.scopeListStandard}>
          {visibleBindings.map(binding => (
            <ConfigScopeRenderer key={binding.definition.id} binding={binding} />
          ))}
        </div>
      ) : null}
    </>
  );
}
