'use client';

import Link from 'next/link';
import { forwardRef, useState, type ComponentProps } from 'react';

// Prefetch the destination the user approaches, not every heavy module in view.
export const IntentLink = forwardRef<HTMLAnchorElement, ComponentProps<typeof Link>>(function IntentLink(props, ref) {
  const [intent, setIntent] = useState(false);
  return <Link {...props} ref={ref} prefetch={intent}
    onMouseEnter={event => { setIntent(true); props.onMouseEnter?.(event); }}
    onFocus={event => { setIntent(true); props.onFocus?.(event); }}
    onTouchStart={event => { setIntent(true); props.onTouchStart?.(event); }} />;
});
