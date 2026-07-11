import type { CSSProperties } from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { fn } from '@storybook/test'
import MagnificationDock, {
  type MagnificationDockContentSizeStrategy,
  type MagnificationDockOrientation,
  type MagnificationDockRenderState,
} from './MagnificationDock'

type DockStoryItem = {
  eyebrow: string
  title: string
  description: string
  accent: string
  gradient: string
}

type StoryArgs = {
  orientation: MagnificationDockOrientation
  activePct: number
  excludeLeadItemWhenActive: boolean
  leadItemCollapseSizePx: number
  transitionMs: number
  transitionDelayMs: number
  transitionEasing: string
  revealFirstDelayMs: number
  revealStaggerMs: number
  revealDurationMs: number
  pointerStepPx: number
  wheelStepPx: number
  invertTouchSwipe: boolean
  preserveContentLayout: boolean
  contentSizeStrategy: MagnificationDockContentSizeStrategy
  fixedContentSizePx: number
  onActiveIndexChange: (index: number | null) => void
}

const dockItems: DockStoryItem[] = [
  {
    eyebrow: '00',
    title: 'Index',
    description: 'A compact lead item can collapse once navigation begins.',
    accent: '#d7f8a4',
    gradient:
      'radial-gradient(circle at 14% 18%, rgba(215,248,164,0.86), transparent 34%), linear-gradient(135deg, #17215f 0%, #083353 100%)',
  },
  {
    eyebrow: '01',
    title: 'Adaptive Systems',
    description: 'The active item expands while neighboring items retain enough context to keep browsing fluid.',
    accent: '#9ce7ff',
    gradient:
      'radial-gradient(circle at 72% 22%, rgba(156,231,255,0.92), transparent 33%), linear-gradient(145deg, #1c1771 0%, #0c4482 100%)',
  },
  {
    eyebrow: '02',
    title: 'Generative Interfaces',
    description: 'Use the render prop to bring any slide template into the same magnification behavior.',
    accent: '#f0a7ff',
    gradient:
      'radial-gradient(circle at 30% 32%, rgba(240,167,255,0.9), transparent 35%), linear-gradient(145deg, #230d68 0%, #713270 100%)',
  },
  {
    eyebrow: '03',
    title: 'Creative Engineering',
    description: 'Pointer hover, touch drag, and wheel navigation all update the active item through one controller.',
    accent: '#ffd589',
    gradient:
      'radial-gradient(circle at 72% 68%, rgba(255,213,137,0.92), transparent 36%), linear-gradient(145deg, #35104b 0%, #845126 100%)',
  },
  {
    eyebrow: '04',
    title: 'Motion Systems',
    description: 'Transitions use explicit easing and timing controls so the dock can be art-directed per surface.',
    accent: '#77ffbf',
    gradient:
      'radial-gradient(circle at 24% 70%, rgba(119,255,191,0.9), transparent 36%), linear-gradient(145deg, #073c38 0%, #12387d 100%)',
  },
  {
    eyebrow: '05',
    title: 'Composable Navigation',
    description: 'The navigation shell is template-agnostic: cards, media slides, article rows, or product panels can use it.',
    accent: '#ff9cac',
    gradient:
      'radial-gradient(circle at 80% 20%, rgba(255,156,172,0.86), transparent 34%), linear-gradient(145deg, #30205f 0%, #842d47 100%)',
  },
]

const Shell = ({
  children,
  orientation,
}: {
  children: React.ReactNode
  orientation: MagnificationDockOrientation
}) => (
  <div
    className="w-full bg-[#05070c] p-6 text-white"
    style={{
      height: orientation === 'horizontal' ? '560px' : '820px',
    }}
  >
    <div className="h-full w-full overflow-hidden rounded-lg border border-white/10 bg-black">
      {children}
    </div>
  </div>
)

const itemBaseClass =
  'group relative flex h-full w-full overflow-hidden text-white outline-none'

const renderDockItem = ({
  item,
  index,
  isActive,
  allRevealed,
  orientation,
}: MagnificationDockRenderState<DockStoryItem>) => {
  const isHorizontal = orientation === 'horizontal'
  const contentStyle: CSSProperties = {
    opacity: index === 0 ? (allRevealed ? 1 : 0.4) : 1,
    transform: `scale(${isActive ? 1 : 0.92})`,
    transition: 'opacity 420ms ease, transform 520ms cubic-bezier(0.22, 1, 0.36, 1)',
  }

  return (
    <article
      className={[
        itemBaseClass,
        isHorizontal ? 'items-end' : 'items-center',
        index === 0 ? 'px-6 py-5' : 'px-7 py-6',
      ].join(' ')}
      style={{
        background: item.gradient,
      }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'linear-gradient(90deg, rgba(255,255,255,0.05), transparent 42%, rgba(0,0,0,0.24))',
          opacity: isActive ? 0.7 : 0.35,
        }}
      />
      <div
        className={[
          'relative z-10 flex min-w-0 flex-col',
          isHorizontal ? 'max-w-[34rem]' : 'max-w-[48rem]',
        ].join(' ')}
        style={contentStyle}
      >
        <div
          className="mb-5 font-mono text-xs uppercase tracking-[0.35em]"
          style={{ color: item.accent }}
        >
          {item.eyebrow}
        </div>
        <h3
          className={[
            'm-0 max-w-[18ch] text-balance font-sans font-semibold leading-[0.95] tracking-normal',
            isHorizontal ? 'text-4xl md:text-6xl' : 'text-2xl md:text-5xl',
          ].join(' ')}
        >
          {item.title}
        </h3>
        <p
          className={[
            'mt-5 max-w-[42rem] text-pretty font-sans leading-relaxed text-white/68',
            isHorizontal ? 'text-sm md:text-base' : 'text-sm md:text-lg',
            isActive ? 'opacity-100' : 'opacity-55',
          ].join(' ')}
        >
          {item.description}
        </p>
      </div>
    </article>
  )
}

const meta: Meta<StoryArgs> = {
  title: 'Components/MagnificationDock',
  component: MagnificationDock,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'A reusable MacOS Dock-like magnification navigation shell. It owns active item state, hover, touch drag, wheel navigation, reveal motion, bfcache restore, and vertical or horizontal sizing while letting callers render any item template. Horizontal mode can preserve an inner content plane so narrow slots crop the template instead of compressing it.',
      },
    },
  },
  args: {
    orientation: 'vertical',
    activePct: 38,
    excludeLeadItemWhenActive: true,
    leadItemCollapseSizePx: 72,
    transitionMs: 700,
    transitionDelayMs: 0,
    transitionEasing: 'cubic-bezier(0.22, 1, 0.36, 1)',
    revealFirstDelayMs: 80,
    revealStaggerMs: 90,
    revealDurationMs: 480,
    pointerStepPx: 40,
    wheelStepPx: 60,
    invertTouchSwipe: false,
    preserveContentLayout: false,
    contentSizeStrategy: 'slot',
    fixedContentSizePx: 960,
    onActiveIndexChange: fn(),
  },
  argTypes: {
    orientation: {
      control: 'inline-radio',
      options: ['vertical', 'horizontal'],
      description: 'Primary axis used for layout, pointer dragging, and wheel navigation.',
    },
    activePct: {
      control: { type: 'range', min: 20, max: 70, step: 1 },
      description: 'Percent of the available axis assigned to the active item.',
    },
    excludeLeadItemWhenActive: {
      control: 'boolean',
      description:
        'When enabled, item 0 collapses to a fixed size once another item becomes active.',
    },
    leadItemCollapseSizePx: {
      control: { type: 'range', min: 0, max: 180, step: 4 },
      description: 'Fixed pixel size for the collapsed lead item.',
    },
    transitionMs: {
      control: { type: 'range', min: 100, max: 1600, step: 25 },
    },
    transitionDelayMs: {
      control: { type: 'range', min: 0, max: 500, step: 10 },
    },
    transitionEasing: {
      control: 'text',
    },
    revealFirstDelayMs: {
      control: { type: 'range', min: 0, max: 1000, step: 20 },
    },
    revealStaggerMs: {
      control: { type: 'range', min: 0, max: 300, step: 10 },
    },
    revealDurationMs: {
      control: { type: 'range', min: 0, max: 1200, step: 20 },
    },
    pointerStepPx: {
      control: { type: 'range', min: 8, max: 120, step: 2 },
      description: 'Touch drag distance needed to advance one item.',
    },
    wheelStepPx: {
      control: { type: 'range', min: 8, max: 160, step: 2 },
      description: 'Wheel/trackpad delta needed to advance one item.',
    },
    invertTouchSwipe: {
      control: 'boolean',
    },
    preserveContentLayout: {
      control: 'boolean',
      description:
        'Wrap each item in a stable inner plane so shrinking dock slots crop content instead of reflowing it.',
    },
    contentSizeStrategy: {
      control: 'select',
      options: ['slot', 'active', 'container', 'fixed'],
      description:
        'How the stable content plane is sized when layout preservation is enabled.',
    },
    fixedContentSizePx: {
      control: { type: 'range', min: 320, max: 1600, step: 20 },
      description: 'Pixel size used by the fixed content-size strategy and as a measurement fallback.',
    },
    onActiveIndexChange: {
      action: 'active index changed',
      table: { disable: true },
    },
  },
}

export default meta

type Story = StoryObj<StoryArgs>

export const VerticalArticleDock: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'The Synth homepage use case: a vertical full-height list where the active row expands and neighboring rows retain context.',
      },
    },
  },
  render: (args) => (
    <Shell orientation={args.orientation}>
      <MagnificationDock<DockStoryItem>
        {...args}
        items={dockItems}
        getItemKey={(item) => item.title}
        renderItem={renderDockItem}
      />
    </Shell>
  ),
}

export const HorizontalSlideDock: Story = {
  args: {
    orientation: 'horizontal',
    activePct: 46,
    excludeLeadItemWhenActive: false,
    leadItemCollapseSizePx: 0,
    wheelStepPx: 54,
    preserveContentLayout: true,
    contentSizeStrategy: 'active',
    fixedContentSizePx: 960,
  },
  parameters: {
    docs: {
      description: {
        story:
          'The same controller can run horizontally for slide-like navigation. The inner content plane keeps the slide shape intact, so inactive slots crop content instead of compressing typography.',
      },
    },
  },
  render: (args) => (
    <Shell orientation={args.orientation}>
      <MagnificationDock<DockStoryItem>
        {...args}
        items={dockItems.slice(1)}
        getItemKey={(item) => item.title}
        renderItem={renderDockItem}
      />
    </Shell>
  ),
}

export const MinimalTemplateSwap: Story = {
  args: {
    activePct: 34,
    excludeLeadItemWhenActive: false,
    leadItemCollapseSizePx: 0,
    transitionMs: 520,
  },
  parameters: {
    docs: {
      description: {
        story:
          'A deliberately different item renderer to document that the dock behavior is decoupled from the Synth PostCard.',
      },
    },
  },
  render: (args) => (
    <Shell orientation={args.orientation}>
      <MagnificationDock<DockStoryItem>
        {...args}
        items={dockItems}
        getItemKey={(item) => item.title}
        renderItem={({ item, index, isActive }) => (
          <div
            className="flex h-full w-full items-center justify-between gap-6 border-b border-white/10 bg-[#080b12] px-8 text-white"
            style={{
              backgroundColor: isActive ? '#111827' : '#070a11',
            }}
          >
            <div className="font-mono text-xs tracking-[0.3em] text-white/40">
              {String(index + 1).padStart(2, '0')}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="m-0 truncate text-xl font-semibold tracking-normal">
                {item.title}
              </h3>
              <p className="m-0 mt-2 truncate text-sm text-white/55">
                {item.description}
              </p>
            </div>
            <div
              className="h-3 w-16 rounded-full"
              style={{ backgroundColor: item.accent, opacity: isActive ? 1 : 0.35 }}
            />
          </div>
        )}
      />
    </Shell>
  ),
}
