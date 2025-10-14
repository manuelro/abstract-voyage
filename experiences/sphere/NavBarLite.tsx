'use client'
import React from 'react'
import styles from './NavBarLite.module.css'
import Image from 'next/image'

type Link = { href: string; label: string }
type Brand = { href: string; logoSrc: string; label: string }

type Props = {
  brand: Brand
  links: Link[]
  className?: string
  style?: React.CSSProperties
}

const DecoratedImage = ({ variation, className, height = 191 , width = 44, opacity = 1 }: { variation: string, className: string, height?: number, width?: number, opacity?: number }) => (
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

const NavBarLite: React.FC<Props> = ({ brand, links, className, style }) => {
  return (
    <header className={[styles.root, className].filter(Boolean).join(' ')} role="banner" style={style}>
      <div className={styles.inner}>
        <a className={styles.logo} href={brand.href} aria-label={brand.label}>
          <DecoratedImage variation='black' className='dark:hidden' />
          <DecoratedImage variation='white' className='hidden dark:block' />
        </a>
        <nav aria-label="Primary" className={styles.nav}>
          {links.map((l) => (
            <a key={l.href} className={styles.link} href={l.href}>
              {l.label}
            </a>
          ))}
        </nav>
      </div>
    </header>
  )
}

export default NavBarLite
