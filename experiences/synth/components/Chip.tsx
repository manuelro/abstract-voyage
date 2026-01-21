import { ReactNode } from 'react'

const Chip = ({ className, children } : { className?: string, children?: ReactNode }) => (
    <div
        className={'border px-2 py-1 mr-1 mt-1 rounded uppercase font-sans not-italic text-slate-400 text-xs border-slate-300 dark:border-slate-700 ' + className}
    >
        {children}
    </div>
)

export default Chip
