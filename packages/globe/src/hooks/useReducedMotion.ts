/** Tracks `prefers-reduced-motion`, which stops every animation the module runs. */

import { useEffect, useState } from 'react';

const QUERY = '(prefers-reduced-motion: reduce)';

const matches = (): boolean =>
  typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia(QUERY).matches;

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(matches);

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const list = window.matchMedia(QUERY);
    const onChange = (): void => setReduced(list.matches);
    onChange();
    list.addEventListener('change', onChange);
    return () => list.removeEventListener('change', onChange);
  }, []);

  return reduced;
}
