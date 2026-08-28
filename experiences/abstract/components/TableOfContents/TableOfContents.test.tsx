import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { TableOfContentsDisclosure } from '../TableOfContents'
import { DEFAULT_POST_LAB_ARTICLE_TOC_CONFIG } from './config/registered'
import { resolvePostLabTocPresentation } from '../../helpers/readingPresentation'

describe('Abstract TableOfContents', () => {
  it('renders configured headings and figures through the responsive disclosure', () => {
    const presentation = resolvePostLabTocPresentation({
      config: DEFAULT_POST_LAB_ARTICLE_TOC_CONFIG,
      columnColor: '#121321',
      surfaceColor: '#d1d1d1',
    })
    const html = renderToStaticMarkup(
      <TableOfContentsDisclosure
        headings={[
          { id: 'first', text: 'First', level: 2 },
          { id: 'second', text: 'Second', level: 2 },
        ]}
        figures={[{ id: 'figure-one', alt: 'Diagram', caption: 'Figure one' }]}
        presentation={presentation}
        presentationConfig={DEFAULT_POST_LAB_ARTICLE_TOC_CONFIG}
        splitBreakpointPrefix="md"
        currentSectionLinePx={120}
      />,
    )

    expect(html).toContain('On this page')
    expect(html).toContain('href="#first"')
    expect(html).toContain('href="#figure-one"')
    expect(html).toContain('md:hidden')
    expect(html).toContain('data-toc-summary="true"')
    expect(html.match(/min-h-11/g)?.length).toBeGreaterThanOrEqual(2)
  })
})
