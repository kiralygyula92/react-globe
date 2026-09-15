/** The built-in cluster marker: a round head carrying the member count. */

import type { ClusterRenderProps } from '../types';

export function DefaultCluster<TData>({ count, hovered, scale, onClick }: ClusterRenderProps<TData>) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rg:pointer-events-auto rg:flex rg:h-9 rg:min-w-9 rg:cursor-pointer rg:items-center rg:justify-center rg:rounded-full rg:border-2 rg:px-2 rg:text-xs rg:font-bold rg:leading-none rg:transition-colors rg:focus-visible:outline-2 rg:focus-visible:outline-offset-2 rg:focus-visible:outline-[var(--globe-color-accent,rgb(63_224_197))]"
      style={{
        transform: `translate(-50%, -50%) scale(${scale.toFixed(3)})`,
        background: hovered ? 'var(--globe-color-cluster-hover, rgb(255 226 172))' : 'var(--globe-color-cluster, rgb(255 181 61))',
        borderColor: 'var(--globe-color-outline, rgb(255 255 255))',
        color: 'var(--globe-color-cluster-text, rgb(17 37 58))',
        boxShadow: 'var(--globe-shadow-md, 0 4px 12px rgb(0 0 0 / 0.28))',
      }}
    >
      {count}
    </button>
  );
}
