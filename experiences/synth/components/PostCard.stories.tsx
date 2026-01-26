import { useMemo } from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { fn } from '@storybook/test'
import PostCard from './PostCard'
import { BASE_SYNTH_GRADIENT_CONFIG } from '../gradients/synthGradient'
import PostCardDock from '../dock/PostCardDock'
import { items } from '../data/postCardFixtures'
import { generateHarmonicGradient } from '../../../helpers/harmonicGradient'
import type { SvgStop } from '../../../helpers/gradientMath'
import Home from './Home'

const DOCK_CONFIG = {
  activePct: 38.19530284,
  minInactivePct: 4,
  transitionMs: 180,
  transitionDelayMs: 0,
  transitionEasing: 'ease-in-out',

  // Proximity weight for heights:
  sigmaHeight: 1.6,

  // Proximity opacity for titles:
  closestTitleOpacity: 0.5,
  farTitleOpacity: 0.2,
  sigmaTitleOpacity: 1.2,
  titleOpacityGamma: 1.4,
  influenceRadius: null as number | null,
  closestTitleScale: 0.95,
  farTitleScale: 0.88,
  sigmaTitleScale: 1.2,
  titleScaleGamma: 1.4,
  titleScaleInfluenceRadius: null as number | null,
  titleScaleTransitionMs: 350,
  titleScaleTransitionDelayMs: 50,
  titleScaleEasing: 'ease-in-out',

  // Gradient arc shaping:
  peakX: 40, // if Storybook control doesn't provide anchorXPercent, we use this
  yArcAmplitude: 20,
  hueAmplitude: 40,
  angleAmplitude: 40,
} as const

type StoryArgs = {
  baseHue?: number
  hueScheme?: 'mono' | 'dual-complementary'
  lightnessRange?: number
  chromaRange?: number
  mode?: 'center-bright' | 'side-bright'
  stops?: number
  variance?: number
  centerStretch?: number
  seed?: number
  gradientType?: 'linear' | 'radial' | 'conic'
  angleDeg?: number
  peakTravel?: number
  arcLift?: number
  radialShape?: 'circle' | 'ellipse'
  radialExtent?:
    | 'closest-side'
    | 'farthest-side'
    | 'closest-corner'
    | 'farthest-corner'
  scale?: number
  scaleX?: number
  scaleY?: number
  backgroundTransitionMs?: number
  backgroundTransitionDelayMs?: number
  backgroundTransitionEasing?: string
  minHeight?: string
  onExpandedChange?: (expanded: boolean) => void
  onCollapseComplete?: () => void
}

const meta: Meta<StoryArgs> = {
  title: 'Synth/PostCard',
  component: PostCard,
  args: {
    minHeight: '0px',
    onExpandedChange: fn(),
    onCollapseComplete: fn(),
    gradientType: 'radial',
    angleDeg: 9,
    baseHue: 545,
    hueScheme: 'dual-complementary',
    lightnessRange: 22,
    chromaRange: 80,
    radialShape: 'circle',
    radialExtent: 'farthest-corner',
    mode: 'center-bright',
    stops: 22,
    centerStretch: 1,
    backgroundTransitionMs: 700,
    backgroundTransitionDelayMs: 0,
    backgroundTransitionEasing: DOCK_CONFIG.transitionEasing,
    peakTravel: 100,
    arcLift: 100,
    scaleX: 100,
    scaleY: 10,
  },
  argTypes: {
    gradientType: {
      control: 'select',
      options: ['linear', 'radial', 'conic'],
    },
    mode: {
      control: 'select',
      options: ['center-bright', 'side-bright'],
    },
    hueScheme: {
      control: 'select',
      options: ['mono', 'dual-complementary'],
    },
    lightnessRange: {
      control: { type: 'number', min: 0, max: 100, step: 1 },
      name: 'Lightness min',
    },
    chromaRange: {
      control: { type: 'number', min: 0, max: 200, step: 1 },
      name: 'Chroma min',
    },
    radialShape: {
      control: { type: 'select' },
      options: ['circle', 'ellipse'],
      name: 'Radial shape',
    },
    radialExtent: {
      control: { type: 'select' },
      options: [
        'closest-side',
        'farthest-side',
        'closest-corner',
        'farthest-corner',
      ],
      name: 'Radial extent',
    },
    scale: {
      control: { type: 'range', min: 0.2, max: 3, step: 0.05 },
      name: 'Scale',
    },
    scaleX: {
      control: { type: 'range', min: -3, max: 3, step: 0.05 },
      name: 'Scale X',
    },
    scaleY: {
      control: { type: 'range', min: -3, max: 3, step: 0.05 },
      name: 'Scale Y',
    },
    peakTravel: {
      control: { type: 'range', min: 10, max: 100, step: 1 },
      name: 'Peak travel',
    },
    arcLift: {
      control: { type: 'range', min: 0, max: 100, step: 1 },
      name: 'Arc lift',
    },
    backgroundTransitionMs: {
      control: { type: 'range', min: 120, max: 1400, step: 25 },
      name: 'Background ms',
    },
    backgroundTransitionDelayMs: {
      control: { type: 'range', min: 0, max: 400, step: 10 },
      name: 'Background delay ms',
    },
    backgroundTransitionEasing: {
      control: { type: 'text' },
      name: 'Background easing',
    },
  },
}

export default meta

type Story = StoryObj<StoryArgs>

export const Default: Story = {
  render: (args) => {
    const logoStops = useMemo<SvgStop[]>(() => {
      const stops = generateHarmonicGradient({
        baseHue: (args.baseHue ?? 0) + 40,
        hueScheme: 'dual-complementary',
        chromaRange: { min: 100 },
        lightnessRange: { min: 40 },
        mode: 'center-bright',
      })

      return stops.map((stop) => ({
        color: stop.color,
        at: stop.at * 200,
      }))
    }, [
      args.baseHue,
      args.hueScheme,
      args.chromaRange,
      args.mode,
      args.stops,
      args.variance,
      args.centerStretch,
      args.seed,
    ])

    return (
      <PostCardDock
        items={items}
        {...args}
        firstItemChildren={
          <Home
            logoStops={logoStops}
            title={items[0]?.title ?? 'Home'}
            excerpt={items[0]?.excerpt}
          />
        }
      />
    )
  },
}
