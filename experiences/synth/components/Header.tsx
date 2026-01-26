import { useEffect } from 'react'
import Link from 'next/link'
import Logo from './Logo'
import { buildSynthBackgroundGradient, buildSynthLogoStops, SYNTH_LOGO_SIZE } from '../gradients/synthGradient'

const Header = () => {
    const logoGradientStops = buildSynthLogoStops()

    const headerBackgroundGradient = buildSynthBackgroundGradient({
        lightnessRange: { max: 28 },
        chromaRange: { min: 22 },
    })

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
        <div
          className='bg-slate-900 pl-5 md:pl-24 flex pt-16 pb-10 bg-transparent'
        //   style={{ backgroundImage: headerBackgroundGradient }}
        >
            <Link href="/">
                <Logo
                  ariaLabel="Abstract Voyage Logo"
                  stops={logoGradientStops}
                  className={SYNTH_LOGO_SIZE.className}
                  width={SYNTH_LOGO_SIZE.width}
                />
                {/* <Logo className="hidden dark:block" ariaLabel="Abstract Voyage Logo" /> */}
            </Link>
        </div>
    )
}

export default Header
