/**
 * The package's own SVG connection renderer — itself a valid `connectionComponent`.
 * Draws the projected, occlusion-tested path as one subpath per visible run.
 */

import type { ConnectionRenderProps } from '../types';

/** Dash periods run a whole number of times per flow cycle, so the loop is seamless. */
const FLOW_PERIODS = 4;

/**
 * The package's SVG connection renderer. Pass it as `connectionComponent` to draw
 * connections as SVG instead of WebGL, or wrap it in your own component.
 */
export function DefaultConnection<TData>({ connection, path, progress, lineStyle, width, color }: ConnectionRenderProps<TData>) {
  let d = '';
  let pen = false;
  for (const point of path) {
    if (!point.visible) {
      pen = false;
      continue;
    }
    d += `${pen ? 'L' : 'M'}${point.x.toFixed(1)},${point.y.toFixed(1)}`;
    pen = true;
  }
  if (d === '') return null;

  // Round caps turn a near-zero dash into a dot.
  const dash = lineStyle === 'dashed' ? [7, 5] : lineStyle === 'dotted' ? [0.01, Math.max(4, width * 3)] : null;
  const period = dash ? dash[0] + dash[1] : 0;
  const offset = dash && connection.animated ? -progress * period * FLOW_PERIODS : 0;

  return (
    <g
      stroke={color}
      strokeWidth={width}
      strokeOpacity={0.95}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeDasharray={dash ? dash.join(' ') : undefined}
      strokeDashoffset={dash ? offset.toFixed(2) : undefined}
      fill="none"
    >
      <path d={d} />
    </g>
  );
}
