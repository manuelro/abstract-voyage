'use client'
import React from 'react'

export type SlideItemProps = { q: string; desc: string; category: string; preferReducedMotion: boolean }

export default function SlideItem({ q, desc, category, preferReducedMotion }: SlideItemProps) {
  const transitionValue = preferReducedMotion
    ? 'none'
    : 'opacity var(--fade-duration, 1600ms) var(--fade-ease, ease)'

  return (
    <blockquote style={{ margin: 0, border: 0, boxShadow: 'none' }}>
      <p
        style={{
          margin: 0,
          fontSize: '1.25rem',
          lineHeight: 1.5,
          opacity: 1,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {q}
      </p>

      <div
        style={{
          marginTop: Math.round(6 * ((1 + Math.sqrt(5)) / 2)), // kept derived gaps identical
          fontSize: '1rem',
          lineHeight: 1.5,
          opacity: 'var(--l2-target, 0)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          transition: transitionValue,
          transitionDelay: 'var(--l2-delay, 0ms)',
        }}
      >
        {desc}
      </div>

      <footer
        style={{
          marginTop: Math.round(6 * Math.pow((1 + Math.sqrt(5)) / 2, 2)),
          fontSize: '0.775rem',
          textTransform: 'lowercase',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          opacity: 'var(--l3-target, 0)',
          transition: transitionValue,
          transitionDelay: 'var(--l3-delay, 0ms)',
        }}
      >
        <a href="#" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}>
          {category}
        </a>
      </footer>
    </blockquote>
  )
}
