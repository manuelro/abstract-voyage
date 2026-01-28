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
  const excerptLines = excerpt
    ? excerpt.split(/\r?\n+/).filter(Boolean)
    : []
  const resolvedExcerptLines =
    excerptLines.length > 1
      ? excerptLines
      : excerpt
        ? excerpt.split('. ').map((line, index, lines) =>
            index < lines.length - 1 ? `${line}.` : line,
          )
        : []

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
        <span className='text-sm pr-12 pt-4 block max-w-prose opacity-60'>
          {resolvedExcerptLines.map((line, index) => (
            <span key={`${line}-${index}`}>
              {line}
              {index < resolvedExcerptLines.length - 1 ? <br /> : null}
            </span>
          ))}
        </span>
      </section>
    </>
  )
}
