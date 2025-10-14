'use client'

import React from 'react'
import Link from 'next/link'
import { SlideMeta } from './slidesFromPosts'
import { formatAbsolute, toISODateString } from '../../helpers/date'
import styles from './SlideContent.module.css'

type Props = {
    slide: Pick<SlideMeta, 'title' | 'description' | 'date' | 'tags' | 'slug'> & { link?: string }
    className?: string
}

export default function SlideContent({ slide, className }: Props) {
    const iso = slide.date ?? null
    const label = iso ? formatAbsolute(iso) : null
    const dateTime = iso ? toISODateString(iso) ?? undefined : undefined

    console.log({slide})

    // Construct the href as "/{slide.slug}"
    const href = `/${slide.slug}`

    return (
        <Link className={`${styles.root} ${className || ''}`} href={slide.slug ? ['posts', slide.slug].join('/') : href}>
            <blockquote className={`${styles.root} ${className || ''}`}>
                {/* Respect existing font styles; no custom font size/weight/opacity here */}
                <div style={{ margin: 0 }}>{slide.title || 'Untitled'}</div>
                {/* <div style={{ margin: 0 }}>{'—'}</div> */}
                <div style={{ margin: 0 }} className={styles.footer}>
                    {label ? (
                        <time dateTime={dateTime}>{label}</time>
                    ) : (
                        <span>—</span>
                    )}
                    {slide.tags?.length ? (
                        <>
                            {' '}•{' '}
                            {slide.tags.map((t, i) => (
                                <span key={`${t}-${i}`}>#{t}{i < slide.tags.length - 1 ? ' ' : ''}</span>
                            ))}
                        </>
                    ) : null}
                </div>
            </blockquote>
        </Link>
    )
}
