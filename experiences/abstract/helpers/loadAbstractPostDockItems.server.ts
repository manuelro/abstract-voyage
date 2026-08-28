import {
  getPostSummaries,
  toSliderSlides,
} from '../../../helpers/postContent';
import type { AbstractPostDockItem } from './abstractPostDockItems';

export function loadAbstractPostDockItems(): AbstractPostDockItem[] {
  return toSliderSlides(getPostSummaries());
}
