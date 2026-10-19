import { ABSTRACT_POLYMORPHIC_LAYOUT_CONFIG } from './abstract.config';
import {
  normalizePolymorphicLayoutConfig,
  type PolymorphicLayoutConfig,
} from '../experiences/abstract/components/PolymorphicLayout.config';

// Extracted out of pages/wall.tsx (rather than exporting it from that
// 7000+ line page module directly) so a second, much lighter page --
// pages/quote-lab.tsx, which mirrors this exact gradient background --
// can import the literal same config object without pulling wall.tsx's own
// full render tree/dependency graph into its bundle. wall.tsx itself now
// imports this value from here too, so there is exactly one definition for
// both pages to stay in sync against.
//
// Mobile uses an in-flow header above the article feed. Tablet and desktop
// keep their fixed header. PolymorphicLayout resolves each tier independently.
export const WALL_POLYMORPHIC_LAYOUT_CONFIG: PolymorphicLayoutConfig = normalizePolymorphicLayoutConfig({
  ...ABSTRACT_POLYMORPHIC_LAYOUT_CONFIG,
  headerScrollBehavior: 'static',
  headerScrollBehaviorWide: 'fixed',
  headerScrollBehaviorLg: 'fixed',
  // Use the same light gradient and stable ink across breakpoints.
  scrollGradientEnabled: true,
  scrollGradientDarkenOnScrollEnabled: false,
  scrollGradientMaxDarken: 0,
});
