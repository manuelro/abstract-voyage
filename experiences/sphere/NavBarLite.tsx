'use client'
import React from 'react'
import styles from './NavBarLite.module.css'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/router'

type LinkType = { href: string; label: string }
type Brand = { href: string; logoSrc: string; label: string }

type Props = {
  brand: Brand
  links: LinkType[]        // Pass the switch as the LAST item explicitly
  className?: string
  style?: React.CSSProperties
  // NEW: wire the switch button
  onSwitchMode?: () => void
  switchDisabled?: boolean
}

const DecoratedImage = ({
  variation,
  className,
  height = 191,
  width = 44,
  opacity = 1
}: {
  variation: string
  className: string
  height?: number
  width?: number
  opacity?: number
}) => (
  <Image
    className={`relative ${className}`}
    src={`/logo-${variation}.svg`}
    alt="Abstract Voyage Logo"
    width={191}
    height={44}
    priority
    quality={opacity as any}
  />
)

const isExternal = (href: string) => /^https?:\/\//i.test(href)

const NavBarLite: React.FC<Props> = ({ brand, links, className, style, onSwitchMode, switchDisabled }) => {
  const router = useRouter()

  return (
    <header
      className={[styles.root, className, 'md:p-24'].filter(Boolean).join(' ')}
      role="banner"
      style={style}
      data-nav-lite
    >
      <div className={styles.inner}>
        <Link className={styles.logo} href={brand.href} aria-label={brand.label}>
          <DecoratedImage variation="black" className="dark:hidden" />
          <DecoratedImage variation="white" className="hidden dark:block" />
        </Link>

        <nav aria-label="Primary" className={styles.nav}>
          {links.map((l, idx) => {
            const isLast = idx === links.length - 1
            const cls = isLast ? `${styles.link} ${styles.linkSwitch || ''}`.trim() : styles.link
            const isActive = router.pathname === l.href

            // NEW: last item becomes a button that triggers the mode switch
            if (isLast && typeof onSwitchMode === 'function') {
              return (
                <button
                  key={`switch-${l.label}`}
                  type="button"
                  className={cls}
                  onClick={() => { if (!switchDisabled) onSwitchMode() }}
                  aria-disabled={switchDisabled || undefined}
                  // keeps semantics while allowing the same look & feel
                  data-switch
                >
                  {l.label}
                </button>
              )
            }

            // External links
            if (isExternal(l.href)) {
              return (
                <a key={l.href} className={cls} href={l.href} target="_blank" rel="noopener noreferrer">
                  {l.label}
                </a>
              )
            }

            // Internal links (non-switch)
            return (
              <Link
                key={l.href}
                className={cls}
                href={l.href}
                aria-current={isActive ? 'page' : undefined}
              >
                {l.label}
              </Link>
            )
          })}
        </nav>
      </div>
    </header>
  )
}

export default NavBarLite
