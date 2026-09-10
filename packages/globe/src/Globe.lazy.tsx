/**
 * `Globe` behind React.lazy + Suspense, with a wordless placeholder while it loads.
 *
 * Note the barrel re-exports `Globe` statically, so a module that statically
 * imports anything from the package still pulls `Globe.tsx` into its chunk. To keep
 * three.js out of a chunk entirely, make your own import dynamic.
 */

import { Suspense, lazy, type ComponentType, type ReactElement, type Ref } from 'react';
import type { GlobeHandle, GlobeProps } from './types';
import { GlobeFallback } from './components/GlobeFallback';

type AnyGlobeProps = GlobeProps<Record<string, unknown>> & { ref?: Ref<GlobeHandle> };

const LoadedGlobe = lazy(async () => {
  const module = await import('./Globe');
  return { default: module.Globe as ComponentType<AnyGlobeProps> };
});

type GlobeLazyComponent = <TData = Record<string, unknown>>(
  props: GlobeProps<TData> & { ref?: Ref<GlobeHandle> },
) => ReactElement;

export const GlobeLazy = ((props: AnyGlobeProps) => (
  <Suspense fallback={<GlobeFallback />}>
    <LoadedGlobe {...props} />
  </Suspense>
)) as GlobeLazyComponent;
