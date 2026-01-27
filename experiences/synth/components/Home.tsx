import Logo from './Logo'
import type { SvgStop } from '../../../helpers/gradientMath'
import { SYNTH_LOGO_SIZE } from '../gradients/synthGradient'

type HomeProps = {
  logoStops: SvgStop[]
  title: string
  excerpt?: string
  contentStyle?: React.CSSProperties
  logoStyle?: React.CSSProperties
}

export default function Home({ logoStops, title, excerpt, contentStyle, logoStyle }: HomeProps) {
  return (
    <>
      <div className="flex flex-col h-[72px] items-start justify-center pl-6" style={logoStyle}>
        <Logo
          stops={logoStops}
          gradientType="linear"
          className={SYNTH_LOGO_SIZE.className}
          ariaLabel="Synth logotype"
          width={SYNTH_LOGO_SIZE.width}
        />
      </div>

      <section className='pl-5 pt-5' style={contentStyle}>
        <span className='text-3xl'>{title}</span>
        <span className='text-sm pr-12 pt-4 block max-w-prose opacity-60'>{excerpt}</span>
      </section>
    </>
  )
}
