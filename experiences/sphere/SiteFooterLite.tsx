'use client'
import React, { useState } from 'react'
import styles from './SiteFooterLite.module.css'

export type SiteFooterLiteProps = {
  line1?: React.ReactNode
  line2?: React.ReactNode
  yearPrefix?: string
  /** 'bottom' = sit at bottom; 'midgap' = use --footer-top to center in gap below sphere */
  mode?: 'bottom' | 'midgap'
  className?: string
  style?: React.CSSProperties
}

const SiteFooterLite: React.FC<SiteFooterLiteProps> = ({
  line1 = 'stay curious — about',
  line2 = "The website of Manuel C., former developer at McKinsey — product & engineering lead across front end, back end, AI/ML, UX and design; essays on physics, space, biology, and interfaces.",
  yearPrefix,
  mode = 'bottom',
  className,
  style,
}) => {
  const [isAbout, setIsAbout] = useState(false)

  const cls =
    mode === 'midgap'
      ? [styles.root, styles.footerMid, className].filter(Boolean).join(' ')
      : [styles.root, styles.footerBottom, className].filter(Boolean).join(' ')

  return (
    <footer className={`${cls}`} style={style}>
      <div className={styles.lines}>
        <div className={`${styles.line1} ${styles.line}`} onClick={() => setIsAbout(!isAbout)}>
            <a onMouseEnter={() => setIsAbout(true)} onClick={() => setIsAbout(!isAbout)}>stay curious</a>
        </div>
        <div className={`${styles.line2} ${styles.line}`} onMouseEnter={() => setIsAbout(true)} onMouseLeave={() => setIsAbout(false)}>
            {line2}
            {yearPrefix && <> <br /> {yearPrefix} Manuel Cerdas. All rights reserved.</>}
        </div>
      </div>
    </footer>
  )
}

export default SiteFooterLite
