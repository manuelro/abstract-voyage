import { useEffect } from 'react'
import Link from 'next/link'
import Logo from './Logo'
import { generateHarmonicGradient } from 'components/helpers/harmonicGradient';
import type { GradientConfig } from 'components/helpers/harmonicGradient';
import { BASE_SYNTH_GRADIENT_CONFIG, buildSynthBackgroundGradient } from './synthGradient';

const Header = () => {
    const colorGradientConfig: GradientConfig = {
        baseHue: 40,

        hueScheme: 'dual-complementary',
        lightnessRange: { max: 40 }, // 50% darker than previous (80 -> 40)
        chromaRange: { min: 100 },
        mode: 'center-bright',
        stops: 22,
        variance: 100,
        centerStretch: 0,
        seed: 50,
        hueSpread: 100,

        // perStopLightness: [100, 100, 100, 100, 100, 100, 100]
    }

    const logoGradientStops = generateHarmonicGradient({
        ...BASE_SYNTH_GRADIENT_CONFIG,
        baseHue: 200,
        lightnessRange: { min: 70 },
        chromaRange: { min: 22 },
    }).map((stop) => ({
      color: stop.color,
      at: stop.at * 100, // convert 0–1 → 0–100 for SvgStop
    }));

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
                  className="w-[300px] md:w-[370px]"
                />
                {/* <Logo className="hidden dark:block" ariaLabel="Abstract Voyage Logo" /> */}
            </Link>
        </div>
    )
}

export default Header
