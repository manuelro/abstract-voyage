import React from 'react'
import { act } from 'react-dom/test-utils'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it } from 'vitest'
import CodeBlock from './CodeBlock'

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true

describe('CodeBlock responsive affordance', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('announces real overflow and removes the end cue after scrolling to the end', async () => {
    const container = document.createElement('div')
    document.body.appendChild(container)
    const root = createRoot(container)

    await act(async () => root.render(
      <CodeBlock code="a very long command">
        <pre><code>a very long command</code></pre>
      </CodeBlock>,
    ))

    const region = container.querySelector<HTMLDivElement>('.codeblock-content')!
    Object.defineProperty(region, 'clientWidth', { configurable: true, value: 100 })
    Object.defineProperty(region, 'scrollWidth', { configurable: true, value: 280 })
    Object.defineProperty(region, 'scrollLeft', { configurable: true, writable: true, value: 0 })

    await act(async () => window.dispatchEvent(new Event('resize')))
    expect(region.tabIndex).toBe(0)
    expect(region.dataset.codeOverflow).toBe('true')
    expect(region.getAttribute('aria-label')).toBe('Scrollable code sample')
    expect(container.querySelector('[data-code-overflow-cue="true"]')).not.toBeNull()

    region.scrollLeft = 180
    await act(async () => region.dispatchEvent(new Event('scroll', { bubbles: true })))
    expect(container.querySelector('[data-code-overflow-cue="true"]')).toBeNull()

    await act(async () => root.unmount())
  })

  it('keeps fitting code out of the tab order and gives Copy a 44px target', async () => {
    const container = document.createElement('div')
    document.body.appendChild(container)
    const root = createRoot(container)

    await act(async () => root.render(
      <CodeBlock code="short">
        <pre><code>short</code></pre>
      </CodeBlock>,
    ))

    const region = container.querySelector<HTMLDivElement>('[data-code-scroll-region="true"]')!
    Object.defineProperty(region, 'clientWidth', { configurable: true, value: 240 })
    Object.defineProperty(region, 'scrollWidth', { configurable: true, value: 240 })
    await act(async () => window.dispatchEvent(new Event('resize')))

    expect(region.tabIndex).toBe(-1)
    expect(region.hasAttribute('aria-label')).toBe(false)
    expect(region.dataset.codeOverflow).toBe('false')
    expect(container.querySelector('[data-code-overflow-cue="true"]')).toBeNull()
    expect(container.querySelector('[data-code-copy="true"]')?.className).toContain('min-h-11')

    await act(async () => root.unmount())
  })
})
