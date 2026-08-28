import React from 'react'
import { act } from 'react-dom/test-utils'
import { createRoot } from 'react-dom/client'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it } from 'vitest'

import MarkdownContent from '../MarkdownContent'
import Figure from './components/Figure'
import { DEFAULT_POST_LAB_ARTICLE_CONFIG } from './config/registered'
import { resolvePostLabArticlePresentation } from '../../helpers/readingPresentation'

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true

const presentation = resolvePostLabArticlePresentation({
  config: DEFAULT_POST_LAB_ARTICLE_CONFIG,
  columnColor: '#f2f3f5',
  surfaceColor: '#d1d1d1',
})

describe('Abstract MarkdownContent', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('renders stable heading IDs, safe inline markup, tables, and configured rhythm', () => {
    const html = renderToStaticMarkup(
      <MarkdownContent
        content={'## Precise heading\n\n<script>unsafe()</script>\n\n<!-- table:signals -->'}
        figures={[]}
        codeBlocks={[]}
        tables={{ signals: { headers: ['Signal'], rows: [['Ready']] } }}
        articleConfig={DEFAULT_POST_LAB_ARTICLE_CONFIG}
        articlePresentation={presentation}
      />,
    )

    expect(html).toContain('id="precise-heading"')
    expect(html).toContain('&lt;script&gt;unsafe()&lt;/script&gt;')
    expect(html).toContain('<table')
    expect(html).toContain(DEFAULT_POST_LAB_ARTICLE_CONFIG.h2FontSize)
  })

  it('renders figure metadata and closes its modal with Escape', async () => {
    const container = document.createElement('div')
    document.body.appendChild(container)
    const root = createRoot(container)

    await act(async () => root.render(
      <Figure
        id="figure-one"
        src="/figure.png"
        alt="System diagram"
        caption="A useful diagram"
        articleConfig={DEFAULT_POST_LAB_ARTICLE_CONFIG}
        articlePresentation={presentation}
      />,
    ))
    expect(container.querySelector('img')?.getAttribute('alt')).toBe('System diagram')
    expect(container.textContent).toContain('A useful diagram')

    await act(async () => container.querySelector<HTMLButtonElement>('button')?.click())
    expect(container.querySelector('[role="dialog"]')).not.toBeNull()
    await act(async () => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })))
    expect(container.querySelector('[role="dialog"]')).toBeNull()

    await act(async () => root.unmount())
  })
})
