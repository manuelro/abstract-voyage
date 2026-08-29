import { defineConfigScope } from '../../../../components/Panel/config';
import { DEFAULT_SPACEFIELD_CONFIG, type SpacefieldConfig } from './registered';

export const SPACEFIELD_SCOPE_ID = 'SpacefieldBackground/field' as const;

export const SPACEFIELD_PANEL = defineConfigScope<SpacefieldConfig>({
  id: SPACEFIELD_SCOPE_ID,
  component: 'SpacefieldBackground',
  scope: 'field',
  title: 'Spacefield',
  createdAt: '2026-07-24',
  summary: 'Diagonal-origin starfield behind the split panels — off by default',
  defaultOpen: false,
  defaultValue: DEFAULT_SPACEFIELD_CONFIG,
  fields: [
    {
      kind: 'group',
      label: 'Enablement',
      fields: [
        { kind: 'boolean', key: 'enabled', label: 'Enabled' },
        { kind: 'boolean', key: 'respectReducedMotion', label: 'Respect reduced motion' },
        { kind: 'number', key: 'opacity', label: 'Opacity', min: 0, max: 1, step: 0.01 },
        { kind: 'color', key: 'backgroundColor', label: 'Sky color' },
      ],
    },
    {
      kind: 'group',
      label: 'Star population',
      fields: [
        { kind: 'number', key: 'seed', label: 'Seed', min: 0, max: 1, step: 0.001 },
        { kind: 'number', key: 'starCount', label: 'Star count', min: 20, max: 800, step: 10, integer: true },
        { kind: 'number', key: 'sizeMinPx', label: 'Min size', min: 0.2, max: 8, step: 0.1, unit: 'px' },
        { kind: 'number', key: 'sizeMaxPx', label: 'Max size', min: 0.5, max: 16, step: 0.1, unit: 'px' },
      ],
    },
    {
      kind: 'group',
      label: 'Color physics',
      fields: [
        {
          kind: 'number',
          key: 'temperatureMinK',
          label: 'Min temperature',
          description: 'Star color is sampled from blackbody radiation, the same relationship that gives real stars their color — cooler temperatures read red/orange, hotter ones read white/blue-white.',
          min: 1500,
          max: 8000,
          step: 100,
          unit: 'K',
          integer: true,
        },
        { kind: 'number', key: 'temperatureMaxK', label: 'Max temperature', min: 4000, max: 25000, step: 500, unit: 'K', integer: true },
        { kind: 'number', key: 'colorSaturation', label: 'Color saturation', min: 0, max: 1.5, step: 0.01, unit: 'x' },
      ],
    },
    {
      kind: 'group',
      label: 'Twinkle',
      fields: [
        { kind: 'number', key: 'twinkleSpeedMinHz', label: 'Min twinkle speed', min: 0.02, max: 3, step: 0.01, unit: 'Hz' },
        { kind: 'number', key: 'twinkleSpeedMaxHz', label: 'Max twinkle speed', min: 0.05, max: 4, step: 0.01, unit: 'Hz' },
        { kind: 'number', key: 'twinkleAmount', label: 'Twinkle amount', min: 0, max: 1, step: 0.01 },
      ],
    },
    {
      kind: 'group',
      label: 'Depth and drift',
      fields: [
        { kind: 'number', key: 'driftSpeedPxPerSec', label: 'Drift speed', min: 0, max: 80, step: 0.5, unit: 'px/s' },
        { kind: 'number', key: 'depthStrength', label: 'Depth strength', description: 'Per-star, fixed intrinsic size variance — independent of the approach-based growth below.', min: 0, max: 1, step: 0.01 },
        { kind: 'number', key: 'fieldRadiusScale', label: 'Field radius', description: 'Multiplies this instance\'s own box diagonal (self-computed every frame) — 1.0 exactly reaches its farthest corner.', min: 0.5, max: 3, step: 0.05, unit: 'x' },
      ],
    },
    {
      kind: 'group',
      label: 'Perspective',
      fields: [
        { kind: 'number', key: 'perspectiveStrength', label: 'Perspective strength', description: 'Simulates real forward motion through a 3D star field — 0 is linear (the old behavior); toward 1, radius growth accelerates sharply near the end of each star\'s journey, so stars crawl near the origin and rocket past near the edge.', min: 0, max: 0.95, step: 0.01 },
        { kind: 'number', key: 'approachSizeMin', label: 'Approach size (start)', description: 'Size multiplier when a star is freshly spawned at the origin.', min: 0.05, max: 2, step: 0.05, unit: 'x' },
        { kind: 'number', key: 'approachSizeMax', label: 'Approach size (end)', description: 'Size multiplier when a star reaches the far end of its journey.', min: 0.5, max: 5, step: 0.05, unit: 'x' },
      ],
    },
    {
      kind: 'group',
      label: 'Focal point glow',
      fields: [
        { kind: 'boolean', key: 'focalGlowEnabled', label: 'Enabled' },
        { kind: 'color', key: 'focalGlowColor', label: 'Glow color', visibleWhen: config => config.focalGlowEnabled },
        { kind: 'number', key: 'focalGlowIntensity', label: 'Glow intensity', min: 0, max: 2, step: 0.05, visibleWhen: config => config.focalGlowEnabled },
        { kind: 'number', key: 'focalGlowRadiusPercent', label: 'Glow radius', min: 5, max: 150, step: 1, unit: '%', integer: true, visibleWhen: config => config.focalGlowEnabled },
      ],
    },
    {
      kind: 'group',
      label: 'Parallax',
      fields: [
        { kind: 'number', key: 'parallaxStrengthPx', label: 'Parallax strength', min: 0, max: 100, step: 1, unit: 'px', integer: true },
        { kind: 'number', key: 'parallaxResponseMs', label: 'Parallax response', min: 0, max: 1200, step: 10, unit: 'ms', integer: true },
      ],
    },
    {
      kind: 'group',
      label: 'Performance and narrow devices',
      fields: [
        { kind: 'number', key: 'maxDevicePixelRatio', label: 'Max device pixel ratio', min: 1, max: 3, step: 0.1, unit: 'x' },
        { kind: 'number', key: 'pauseBelowOpacity', label: 'Pause threshold', min: 0, max: 0.2, step: 0.005 },
        {
          kind: 'enum',
          key: 'narrowBehavior',
          label: 'Narrow viewport behavior',
          options: [
            { label: 'Static frame', value: 'static' },
            { label: 'Reduced', value: 'reduced' },
            { label: 'Hidden', value: 'hidden' },
          ],
        },
        {
          kind: 'number',
          key: 'narrowStarCountScale',
          label: 'Narrow star count scale',
          min: 0.05,
          max: 1,
          step: 0.05,
          visibleWhen: config => config.narrowBehavior === 'reduced',
        },
      ],
    },
  ],
  copy: {
    targetFile: 'experiences/spacefield/SpacefieldBackground/config/registered.ts',
    targetSymbol: 'DEFAULT_SPACEFIELD_CONFIG',
    targetType: 'SpacefieldConfig',
    updateStrategy: 'replace_scope',
    completeScope: true,
  },
});
