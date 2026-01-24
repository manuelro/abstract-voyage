import { type ElementType, type ReactNode } from 'react'

type ChipProps = {
    children: ReactNode
    selected?: boolean
    faded?: boolean
    onClick?: () => void
    pressed?: boolean
    as?: 'button' | 'span'
    size?: 'sm'
    className?: string
}

const Chip = ({
    children,
    selected = false,
    faded = false,
    onClick,
    pressed,
    as,
    size = 'sm',
    className = '',
}: ChipProps) => {
    const isButton = as ? as === 'button' : Boolean(onClick)
    const Component = (isButton ? 'button' : 'span') as ElementType

    const base =
        'border-2 rounded-full px-5 py-1 text-xs whitespace-nowrap w-auto min-w-0 transition-colors'
    const sizeClass = size === 'sm' ? 'text-sm' : ''
    const selectedClass = 'bg-white text-blue-600 border-white'
    const idleClass =
        'border-white/20 text-slate-900 hover:border-white dark:border-slate-200/40 dark:text-slate-100 dark:hover:border-slate-100'
    const fadedClass = faded ? 'opacity-50 hover:opacity-100' : ''
    const focusClass = isButton
        ? 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-white/70 dark:focus-visible:ring-slate-200'
        : ''

    return (
        <Component
            type={isButton ? 'button' : undefined}
            onClick={onClick}
            aria-pressed={isButton ? pressed : undefined}
            className={[base, sizeClass, selected ? selectedClass : idleClass, fadedClass, focusClass, className]
                .filter(Boolean)
                .join(' ')}
        >
            {children}
        </Component>
    )
}

export default Chip
