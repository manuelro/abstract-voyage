import { describe, expect, it } from 'vitest';
import {
  loadAboutPageContent,
  loadAbstractPageContent,
  loadContactPageContent,
  loadSiteContent,
} from './pageContent.build';

describe('static page content', () => {
  it('loads each migrated page with its expected structured body', () => {
    expect(loadSiteContent().siteName).toBe('Abstract Voyage');
    expect(loadAbstractPageContent().hero.body).toHaveLength(1);

    const about = loadAboutPageContent();
    expect(about.timeline).toHaveLength(5);
    expect(about.timeline.every(item => item.body.length > 0)).toBe(true);

    expect(loadContactPageContent().conversation.starterStems).toHaveLength(4);
  });
});
