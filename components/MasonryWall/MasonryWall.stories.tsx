import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { MasonryWall, type MasonryWallProps } from './MasonryWall';

const pastels = [
  '#e5d8f4', '#dcebe8', '#f5dfd5', '#dce5f4', '#f4e8c9', '#e8deec',
  '#dcecd5', '#f0dce4', '#d8e9f1', '#eee4d3', '#e0e2f2', '#e9ecd8',
];

function placeholders(count: number, tallIndex = -1) {
  return Array.from({ length: count }, (_, index) => {
    const height = index === tallIndex ? 720 : 88 + ((index * 73 + index * index * 19) % 260);
    return (
      <div
        key={index}
        aria-hidden="true"
        data-placeholder-index={index}
        style={{ height, backgroundColor: pastels[index % pastels.length], borderRadius: 14 }}
      />
    );
  });
}

function StoryFrame({ children }: { children: React.ReactNode }) {
  return <div style={{ minHeight: '100vh', padding: 24, background: '#fbfaf8' }}>{children}</div>;
}

const meta = {
  title: 'Layout/Masonry Wall',
  component: MasonryWall,
  parameters: { layout: 'fullscreen' },
  args: { columns: { base: 1, md: 2, lg: 4 }, columnGap: 16, rowGap: 16 },
  argTypes: { children: { control: false } },
} satisfies Meta<typeof MasonryWall>;

export default meta;
type Story = StoryObj<typeof meta>;

export const VariedHeights: Story = {
  render: args => <StoryFrame><MasonryWall {...args}>{placeholders(36)}</MasonryWall></StoryFrame>,
};

export const TallOutlier: Story = {
  render: args => <StoryFrame><MasonryWall {...args}>{placeholders(25, 8)}</MasonryWall></StoryFrame>,
};

export const AlternateBreakpointCounts: Story = {
  args: { columns: { base: 2, md: 3, lg: 5 }, columnGap: 24, rowGap: 24 },
  render: args => <StoryFrame><MasonryWall {...args}>{placeholders(45)}</MasonryWall></StoryFrame>,
};

function DenseStressDemo(props: MasonryWallProps) {
  const [count, setCount] = useState(60);
  return (
    <StoryFrame>
      <div role="group" aria-label="Wall item count" style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        {[12, 60, 120].map(value => (
          <button
            key={value}
            type="button"
            aria-pressed={count === value}
            onClick={() => setCount(value)}
            style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #c9ccd3', background: count === value ? '#e5d8f4' : '#fff' }}
          >
            {value} items
          </button>
        ))}
      </div>
      <MasonryWall {...props}>{placeholders(count)}</MasonryWall>
    </StoryFrame>
  );
}

export const DenseAndChanging: Story = {
  render: args => <DenseStressDemo {...args} />,
};
