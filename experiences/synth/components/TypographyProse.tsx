import { ReactNode } from 'react'

type TypographyProseProps = {
  children: ReactNode
}

export default function TypographyProse({ children }: TypographyProseProps) {
  return (
    <div className="article-content">
      {children}
    </div>
  )
}
