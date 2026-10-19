import type { MouseEvent } from 'react';
import type { FeaturedWallQuoteContent } from '../../../../pages/wallQuoteModel';
import { PracticeCard } from '../PracticeCard';
import type { PracticesSectionLayoutConfig } from '../PracticesSection.config';

type Props = Pick<FeaturedWallQuoteContent, 'introTitle' | 'introText' | 'cta'> & {
  inkColor: string;
  practiceLayout?: PracticesSectionLayoutConfig;
};

export function FeaturedCard({ introTitle, introText, cta, inkColor, practiceLayout }: Props) {
  const navigateToPractice = (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const target = document.querySelector<HTMLElement>(cta.target);
    if (!target) return;
    event.preventDefault();
    window.history.pushState(null, '', cta.target);
    target.focus({ preventScroll: true });
    target.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      block: 'start',
    });
  };

  return (
    <div data-featured-card="" className="flex w-full min-w-0 flex-col items-stretch gap-6 text-left md:gap-8" style={{ color: inkColor }}>
      <PracticeCard title={introTitle} text={introText} inkColor={inkColor} layout={practiceLayout} placement="featured-intro" />
      <a
        href={cta.target}
        onClick={navigateToPractice}
        className="inline-flex min-h-[48px] w-full items-center justify-center rounded-md border border-current px-6 py-3 text-sm font-medium leading-snug transition-opacity hover:opacity-70 focus-visible:opacity-70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4"
      >
        {cta.label}
      </a>
    </div>
  );
}
