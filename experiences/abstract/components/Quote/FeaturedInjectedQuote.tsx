import type { ComponentProps } from 'react';
import { EditorialQuote } from './EditorialQuote';

type Props = Omit<ComponentProps<typeof EditorialQuote>, 'variant' | 'minHeight'>;

/** The wall lead and closing banner share the same content-bearing quote host. */
export function FeaturedInjectedQuote({ config, children, ...props }: Props) {
  return (
    <EditorialQuote
      {...props}
      variant="featured"
      config={{ ...config, cardAspectRatioEnabled: false, geometryShape: 'auto' }}
      minHeight="auto"
    >
      {children}
    </EditorialQuote>
  );
}
