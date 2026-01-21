import { useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'

const DecoratedImage = ({ variation, className } : { variation: string, className: string }) => (
    <Image
        className={`relative ${className}`}
        src={`/logo-${variation}.svg`}
        alt="Abstract Voyage Logo"
        height={44}
        width={191}
        priority
        quality={100}
    />
)

const Header = () => {
    useEffect(() => {
        const mql = window.matchMedia('(prefers-color-scheme: dark)')

        const onMqlChange = (e: any) => {
            if (e.matches) {
                document.documentElement.classList.add('dark')
            } else {
                document.documentElement.classList.remove('dark')
            }
        }

        mql.onchange = (e: any) => {
            onMqlChange(e)
        }

        onMqlChange(mql)
    }, [])

    return (
        <div>
            <Link href="/">
                <DecoratedImage variation='black' className='dark:hidden' />
                <DecoratedImage variation='white' className='hidden dark:block' />
            </Link>
        </div>
    )
}

export default Header
