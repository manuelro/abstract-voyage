'use client';

import React from 'react';
import { Fragment } from 'react';
import {
  ColorInput,
  Knob,
  PanelControlGroup,
  PanelDescription,
  SegmentedControl,
  SubLabel,
  Toggle,
} from '../index';
import type {
  ConfigScopeBinding,
  RuntimeConfigFieldDefinition,
  RuntimeConfigFieldGroup,
} from './types';

function isVisible(
  entry: RuntimeConfigFieldDefinition | RuntimeConfigFieldGroup,
  binding: ConfigScopeBinding,
) {
  return entry.visibleWhen ? entry.visibleWhen(binding.value) : true;
}

function ConfigFieldControl({
  field,
  binding,
}: {
  field: RuntimeConfigFieldDefinition;
  binding: ConfigScopeBinding;
}) {
  if (!isVisible(field, binding)) return null;
  const value = binding.value[field.key];

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
  return (
    <PanelControlGroup>
      <SubLabel>{field.label}</SubLabel>
      <SegmentedControl
        value={typeof value === 'string' ? value : ''}
        options={options}
        onChange={nextValue => binding.updateField(field.key, nextValue)}
        ariaLabel={field.label}
      />
      {field.description ? <PanelDescription>{field.description}</PanelDescription> : null}
    </PanelControlGroup>
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

        if (entry.kind === 'group') {
          return (
            <Fragment key={`group-${entry.label}-${entryIndex}`}>
              <SubLabel>{entry.label}</SubLabel>
              {entry.fields.map(field => (
                <ConfigFieldControl
                  key={field.key}
                  field={field}
                  binding={binding}
                />
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
      })}
    </>
  );
}
