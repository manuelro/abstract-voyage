import type {
  AbstractPostDockGradientPerformanceConfig,
} from '../config/registered';

export type AbstractPostDockGradientActivity =
  | 'continuous'
  | 'frozen'
  | 'suspended';

export type ResolveAbstractPostDockGradientActivityOptions = {
  config: AbstractPostDockGradientPerformanceConfig;
  isActive: boolean;
  isDockVisible: boolean;
  isDocumentVisible: boolean;
};

/**
 * Resolves render-loop ownership independently of presentation mode. Desktop,
 * mobile pager/travel, and the mobile deck all use this same policy.
 */
export function resolveAbstractPostDockGradientActivity({
  config,
  isActive,
  isDockVisible,
  isDocumentVisible,
}: ResolveAbstractPostDockGradientActivityOptions): AbstractPostDockGradientActivity {
  if (!isDocumentVisible) return 'suspended';
  if (config.pauseWhenOffscreen && !isDockVisible) return 'suspended';
  if (config.activityPolicy === 'static') return 'frozen';
  if (config.activityPolicy === 'all' || isActive) return 'continuous';
  return 'frozen';
}
