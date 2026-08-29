'use client';

import React from 'react';
import { Fragment, useContext, useState } from 'react';
import {
  AreaSwitch,
  ColorInput,
  Knob,
  PanelButton,
  PanelControlGroup,
  PanelDescription,
  PanelNestingContext,
  Sect,
  SegmentedControl,
  Select,
  SubLabel,
  TabStrip,
  Toggle,
} from '../index';
import { deriveSurfaceColor } from '../../../helpers/surfaceColorDerivation';
import { useLayoutDebugHighlight } from '../../LayoutDebugHighlight';
import { useBreakpointTier, type BreakpointTier } from '../../useBreakpointTier';
import type {
  ConfigScopeBinding,
  RuntimeConfigFieldAction,
  RuntimeConfigFieldAreas,
  RuntimeConfigFieldDefinition,
  RuntimeConfigFieldGroup,
  RuntimeConfigFieldSubgroup,
  RuntimeConfigFieldTabs,
} from './types';

const NO_HIGHLIGHT_IDS: ReadonlyArray<string> = [];

function isVisible(
  entry: (
    | RuntimeConfigFieldDefinition
    | RuntimeConfigFieldGroup
    | RuntimeConfigFieldSubgroup
    | RuntimeConfigFieldTabs
    | RuntimeConfigFieldAreas
    | RuntimeConfigFieldAction
  ),
  binding: ConfigScopeBinding,
) {
  return entry.visibleWhen ? entry.visibleWhen(binding.value) : true;
}

function ConfigFieldControl({
  field,
  binding,
}: {
  field: RuntimeConfigFieldDefinition | RuntimeConfigFieldAction;
  binding: ConfigScopeBinding;
}) {
  // Called unconditionally regardless of whether this field carries
  // debugHighlightIds, so this never violates the Rules of Hooks — most
  // fields simply never read `highlight` below.
  const highlight = useLayoutDebugHighlight();

  if (!isVisible(field, binding)) return null;

  // 'action' has no real config value to read/highlight-wrap the same way
  // every other kind does (its own `key` is a DOM identity only, never a
  // property of the bound config — see ConfigFieldAction's own doc
  // comment) — handled as its own early return rather than falling through
  // the `value = binding.value[field.key]` line below, which would read
  // `undefined` for a key that was never meant to exist in the config.
  if (field.kind === 'action') {
    return (
      <div data-config-field-key={field.key}>
        <PanelButton onClick={() => binding.updateFields(field.onClick(binding.value))}>
          {field.label}
        </PanelButton>
        {field.description ? <PanelDescription>{field.description}</PanelDescription> : null}
      </div>
    );
  }

  const value = binding.value[field.key];

  const control = ((): JSX.Element => {
    if (field.kind === 'boolean') {
      return (
        <Toggle
          label={field.label}
          checked={Boolean(value)}
          description={field.description}
          onChange={nextValue => binding.updateField(field.key, nextValue)}
        />
      );
    }

    if (field.kind === 'number') {
      return (
        <Knob
          label={field.label}
          value={typeof value === 'number' ? value : field.min ?? 0}
          min={field.min ?? 0}
          max={field.max ?? 1}
          step={field.step ?? 0.01}
          steps={field.steps}
          unit={field.unit}
          description={field.description}
          onChange={nextValue => binding.updateField(
            field.key,
            field.integer ? Math.round(nextValue) : nextValue,
          )}
        />
      );
    }

    if (field.kind === 'color') {
      return (
        <ColorInput
          label={field.label}
          value={typeof value === 'string' ? value : ''}
          onChange={nextValue => binding.updateField(field.key, nextValue)}
        />
      );
    }

    const options = field.options ?? [];
    const stringValue = typeof value === 'string' ? value : '';
    const onOptionChange = (nextValue: string) => binding.updateField(field.key, nextValue);

    return (
      <PanelControlGroup>
        <SubLabel>{field.label}</SubLabel>
        {field.kind === 'select' ? (
          <Select
            value={stringValue}
            options={options}
            onChange={onOptionChange}
            ariaLabel={field.label}
          />
        ) : (
          <SegmentedControl
            value={stringValue}
            options={options}
            onChange={onOptionChange}
            ariaLabel={field.label}
          />
        )}
        {field.description ? <PanelDescription>{field.description}</PanelDescription> : null}
      </PanelControlGroup>
    );
  })();

  // Every field's own stable runtime identity in the DOM — labels alone are
  // not unique (e.g. "Padding top" is shared verbatim by the Wide and
  // Narrow column subgroups in PolymorphicLayoutConfig), so nothing outside
  // this component could previously target one specific field's control
  // without depending on DOM order or heading-relative traversal. Added
  // generically here (the shared resolver every field kind passes through),
  // not as a per-field/per-scope special case — every registered scope's
  // control gets this automatically, boolean/number/color/select/enum
  // alike, with zero behavior change to rendering, styling, or existing
  // selectors/tests that don't reference it.
  //
  // Orientation-only highlight wiring: hovering a field that names
  // debugHighlightIds dims every other LayoutDebugOverlay on the page while
  // the pointer stays over this control (see LayoutDebugHighlight.tsx). No
  // provider mounted, or no debugHighlightIds on this field: mouse handlers
  // are omitted, but the field-key wrapper still renders unconditionally.
  const ids = field.debugHighlightIds;
  const highlightHandlers = ids && highlight ? {
    onMouseEnter: () => highlight.setHoveredIds(ids),
    onMouseLeave: () => highlight.setHoveredIds(NO_HIGHLIGHT_IDS),
  } : undefined;

  return (
    <div data-config-field-key={field.key} {...highlightHandlers}>
      {control}
    </div>
  );
}

// Collapsible property zone *within* a group (PLAN-POSTS-LAB-PANEL-TABS.md
// §11) — reuses Sect (components/Panel/index.tsx), the same generic
// controlled-disclosure primitive already used across the labs experiences
// and other config panels, rather than a new bespoke component. Starts
// collapsed unless a scope author explicitly opts a subgroup out via
// `defaultCollapsed: false`.
function ConfigFieldSubgroupControl({
  subgroup,
  binding,
}: {
  subgroup: RuntimeConfigFieldSubgroup;
  binding: ConfigScopeBinding;
}) {
  const [open, setOpen] = useState(subgroup.defaultCollapsed === false);
  // The one nesting level that actually shades (PLAN-POSTS-LAB-PANEL-
  // TABS.md §13, revised) — always darker than the panel's own root color,
  // regardless of whether that root is itself light or dark; the scope
  // level (ComponentConfigSection) deliberately never shades, so a
  // subgroup's own darken is computed straight from the root, not from an
  // intermediate scope-level shade. Sect itself stays untouched for every
  // other caller (FontConfigPanel, GridConfigPanel, …); only this one call
  // site opts a subgroup into the shaded background via Sect's optional
  // prop.
  const nesting = useContext(PanelNestingContext);
  const shadedColor = nesting && nesting.step > 0
    ? deriveSurfaceColor(nesting.color, -nesting.step)
    : undefined;
  if (!isVisible(subgroup, binding)) return null;

  return (
    <Sect
      title={subgroup.label}
      open={open}
      onToggle={() => setOpen(current => !current)}
      backgroundColor={shadedColor}
    >
      {subgroup.fields.map(field => (
        <ConfigFieldControl key={field.key} field={field} binding={binding} />
      ))}
    </Sect>
  );
}

// Shared by ConfigControlResolver's own top-level loop and
// ConfigFieldTabsControl below, so a field/group renders identically
// whether it sits at a scope's top level or inside a tab's own fields —
// tabs are purely a visibility concern, never a second rendering path.
function renderScopeEntry(
  entry: RuntimeConfigFieldDefinition | RuntimeConfigFieldGroup | RuntimeConfigFieldAction,
  binding: ConfigScopeBinding,
  entryIndex: number,
) {
  if (!isVisible(entry, binding)) return null;

  if (entry.kind === 'group') {
    return (
      <Fragment key={`group-${entry.label}-${entryIndex}`}>
        <SubLabel>{entry.label}</SubLabel>
        {entry.fields.map((field, fieldIndex) => (
          field.kind === 'subgroup' ? (
            <ConfigFieldSubgroupControl
              key={`subgroup-${field.label}-${fieldIndex}`}
              subgroup={field}
              binding={binding}
            />
          ) : (
            <ConfigFieldControl
              key={field.key}
              field={field}
              binding={binding}
            />
          )
        ))}
      </Fragment>
    );
  }

  return (
    <ConfigFieldControl
      key={entry.key}
      field={entry}
      binding={binding}
    />
  );
}

// Every kind: 'tabs' entry in this codebase (grep-confirmed, components/
// PolymorphicLayout.panel.ts's own device-size tab groups — the only
// current author of this field kind) uses exactly this id convention: real
// device-size windows for 'mobile'/'tablet'/'desktop', plus a fourth,
// window-less 'all-sizes' catch-all tab that intentionally has no entry
// here (see currentDeviceTabId's own doc comment below for why). A future
// tabs field using different ids just never gets an entry highlighted —
// TabStrip's own currentDeviceTabId prop degrades gracefully to "matches
// nothing," not an error.
const DEVICE_TIER_TAB_ID: Record<BreakpointTier, string> = {
  mobile: 'mobile',
  md: 'tablet',
  lg: 'desktop',
};

function ConfigFieldTabsControl({
  entry,
  binding,
}: {
  entry: RuntimeConfigFieldTabs;
  binding: ConfigScopeBinding;
}) {
  // Ephemeral UI state — which tab is showing, never persisted to config
  // and never resets a field's own value on switch (PLAN-POSTS-LAB-PANEL-
  // TABS.md recommendation 2.5). Defaults to the first tab.
  const [activeId, setActiveId] = useState(entry.tabs[0]?.id ?? '');
  const activeTab = entry.tabs.find(tab => tab.id === activeId) ?? entry.tabs[0];
  // Live, resize-driven — not the field's own editing focus (activeId
  // above). 'all-sizes' deliberately never matches: it isn't a device-size
  // window of its own, it's "no tier restriction," so highlighting it as
  // "your current device" would misstate what the tab actually means.
  const { tier } = useBreakpointTier();
  const currentDeviceTabId = DEVICE_TIER_TAB_ID[tier];
  if (!activeTab) return null;

  return (
    <div>
      <TabStrip
        tabs={entry.tabs.map(tab => ({ id: tab.id, label: tab.label }))}
        activeId={activeTab.id}
        onSelect={setActiveId}
        ariaLabel="Device size"
        currentDeviceTabId={currentDeviceTabId}
      />
      <div role="tabpanel" id={`panel-tabpanel-${activeTab.id}`} aria-labelledby={`panel-tab-${activeTab.id}`}>
        {activeTab.fields.map((field, fieldIndex) => renderScopeEntry(field, binding, fieldIndex))}
      </div>
    </div>
  );
}

// Shared by ConfigFieldAreasControl below and ConfigControlResolver's own
// top-level loop, so a tabs-or-plain entry renders identically whether it
// sits directly at a scope's top level or inside an area's own fields —
// areas are purely a visibility concern, never a second rendering path.
function renderTabsOrScopeEntry(
  entry: RuntimeConfigFieldDefinition | RuntimeConfigFieldGroup | RuntimeConfigFieldTabs | RuntimeConfigFieldAction,
  binding: ConfigScopeBinding,
  entryIndex: number,
) {
  if (!isVisible(entry, binding)) return null;

  if (entry.kind === 'tabs') {
    return <ConfigFieldTabsControl key={`tabs-${entryIndex}`} entry={entry} binding={binding} />;
  }

  return renderScopeEntry(entry, binding, entryIndex);
}

// Macro-area switch above a scope's own device tabs (PLAN-POSTS-LAB-PANEL-
// TABS.md §12) — reuses AreaSwitch's boxed-pill-button styling, kept
// deliberately distinct from ConfigFieldTabsControl's underline TabStrip
// immediately above it. Areas cannot contain another 'areas' entry (the
// same bounded-depth discipline as tabs/subgroup), so an area's own fields
// are only ever a plain field, a group, or a single tabs switch.
function ConfigFieldAreasControl({
  entry,
  binding,
}: {
  entry: RuntimeConfigFieldAreas;
  binding: ConfigScopeBinding;
}) {
  const [activeAreaId, setActiveAreaId] = useState(entry.areas[0]?.id ?? '');
  const activeArea = entry.areas.find(area => area.id === activeAreaId) ?? entry.areas[0];
  if (!activeArea) return null;

  return (
    <div>
      <AreaSwitch
        areas={entry.areas.map(area => ({ id: area.id, label: area.label }))}
        activeId={activeArea.id}
        onSelect={setActiveAreaId}
        ariaLabel="Layout area"
      />
      <div role="region" aria-label={activeArea.label}>
        {activeArea.fields.map((field, fieldIndex) => renderTabsOrScopeEntry(field, binding, fieldIndex))}
      </div>
    </div>
  );
}

export function ConfigControlResolver({
  binding,
}: {
  binding: ConfigScopeBinding;
}) {
  return (
    <>
      {binding.definition.fields.map((entry, entryIndex) => {
        if (!isVisible(entry, binding)) return null;

        if (entry.kind === 'areas') {
          return (
            <ConfigFieldAreasControl
              key={`areas-${entryIndex}`}
              entry={entry}
              binding={binding}
            />
          );
        }

        return renderTabsOrScopeEntry(entry, binding, entryIndex);
      })}
    </>
  );
}
