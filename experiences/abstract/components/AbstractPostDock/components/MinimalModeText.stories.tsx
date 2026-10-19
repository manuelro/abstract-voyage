import type { Meta, StoryObj } from '@storybook/react';
import { siteSans, siteSerif } from '../../../../../components/siteFonts';
import { MinimalModeText } from './MinimalModeText';

const meta = {
  title: 'Abstract/Post Dock/Minimal Mode Text',
  component: MinimalModeText,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'The text alone from each right-hand slide in the desktop About accordion. dimOpacity controls plain text; emphasisOpacity controls **marked runs** and links. Typography and tint can be set directly without the carousel surface.',
      },
    },
  },
  decorators: [Story => (
    <div
      className={`${siteSans.variable} ${siteSerif.variable} font-sans`}
      style={{ width: 'min(86vw, 680px)', minHeight: 220, padding: 32, background: '#241b69' }}
    >
      <Story />
    </div>
  )],
  args: {
    text: 'I began as a **contractor**, building software for large organizations. The **brief** usually arrived finished, and the job was to build it well.',
    dimOpacity: 0.45,
    emphasisOpacity: 0.95,
    fontSize: '1.875rem',
    tracking: 'normal',
    lineHeight: 1.2,
    tint: '#ffffff',
    highlightedWordFontWeight: 400,
    fontFamily: 'inherit',
    isActive: true,
    transitionMs: 450,
    easingCss: 'ease',
    className: 'text-3xl',
  },
  argTypes: {
    text: { control: 'text', description: 'Use **phrase** for highlighted words and [label](/path) for links.' },
    dimOpacity: { control: { type: 'range', min: 0, max: 1, step: 0.05 } },
    emphasisOpacity: { control: { type: 'range', min: 0, max: 1, step: 0.05 } },
    fontSize: { control: 'text', description: 'CSS font size; omit to use the dock typography class.' },
    tracking: { control: 'text', description: 'CSS letter spacing.' },
    lineHeight: { control: 'text', description: 'CSS line height.' },
    tint: { control: 'color', description: 'Base text color inherited by every run.' },
    highlightedWordFontWeight: { control: { type: 'select' }, options: [300, 400, 500, 600, 700, 800] },
    fontFamily: { control: 'text', description: 'CSS font family; inherit uses the surrounding editorial font.' },
    isActive: { control: 'boolean', description: 'The desktop accordion reveals text for its active slide.' },
    transitionMs: { control: { type: 'range', min: 0, max: 1600, step: 50 } },
    easingCss: { control: 'text' },
    className: { control: 'text', description: 'Responsive typography and maximum width supplied by the dock.' },
    style: { control: false },
  },
} satisfies Meta<typeof MinimalModeText>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Active: Story = {};

export const LinkedText: Story = {
  args: {
    text: 'I explored **biomimicry** and wrote [a framework for interfaces](/posts/2023-01-27_medium-biomimetics) to share what I learned.',
  },
};

export const Inactive: Story = {
  args: { isActive: false },
};
