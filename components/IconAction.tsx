import type { ButtonHTMLAttributes, ReactNode } from 'react';

export type IconActionProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'aria-label' | 'children'
> & {
  'aria-label': string;
  children: ReactNode;
};

/**
 * Shared semantic shell for visually bare icon actions. The artwork remains
 * entirely consumer-owned, while the interactive box never drops below the
 * 44px coarse-pointer floor used throughout the responsive audit.
 */
export function IconAction({ children, className = '', type = 'button', ...props }: IconActionProps) {
  return (
    <button
      {...props}
      type={type}
      className={`inline-flex min-h-11 min-w-11 items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current focus-visible:ring-offset-2 ${className}`}
    >
      {children}
    </button>
  );
}
