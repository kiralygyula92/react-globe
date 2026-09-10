/** The built-in cluster marker: a round head carrying the member count. */

import type { ClusterRenderProps } from '../types';

export function DefaultCluster<TData>({ count, hovered, scale, onClick }: ClusterRenderProps<TData>) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="wg:pointer-events-auto wg:flex wg:h-9 wg:min-w-9 wg:cursor-pointer wg:items-center wg:justify-center wg:rounded-full wg:border-2 wg:px-2 wg:text-xs wg:font-bold wg:leading-none wg:transition-colors wg:focus-visible:outline-2 wg:focus-visible:outline-offset-2 wg:focus-visible:outline-[var(--globe-aurora-500,rgb(63_224_197))]"
      style={{
        transform: `translate(-50%, -50%) scale(${scale.toFixed(3)})`,
        background: hovered ? 'var(--globe-marigold-200, rgb(255 226 172))' : 'var(--globe-marigold-500, rgb(255 181 61))',
        borderColor: 'var(--globe-paper-000, rgb(255 255 255))',
        color: 'var(--globe-ink-900, rgb(17 37 58))',
        boxShadow: 'var(--globe-shadow-md, 0 4px 12px rgb(0 0 0 / 0.28))',
      }}
    >
      {count}
    </button>
  );
}
