/**
 * What a connection looks like and where it runs — decided in one place, so the
 * WebGL renderer and a consumer's `connectionComponent` can never disagree.
 */

import type { Vector3 } from 'three';
import type { ConnectionLineStyle, ConnectionType, LatLng, PinConnection } from '../../types';
import { greatCircleFraction, greatCirclePath } from '../../utils/coordinates';

export const SEGMENTS = 96;
/** Just proud of the surface, so the globe still hides the far half. */
export const SURFACE_LIFT = 1.0026;
/** Every arch starts with this much lift. */
export const ARCH_BASE = 0.06;
export const FLOW_SPEED = 0.35;
export const ANIMATED_FALLBACK: ConnectionLineStyle = 'dashed';

export const DASH: Record<ConnectionLineStyle, { dashSize: number; gapSize: number } | null> = {
  solid: null,
  dashed: { dashSize: 0.07, gapSize: 0.045 },
  // Round caps turn a very short dash into a dot.
  dotted: { dashSize: 0.004, gapSize: 0.028 },
};

export type ConnectionDefaults = {
  type: ConnectionType;
  archHeight: number;
  lineStyle: ConnectionLineStyle;
  width: number;
  color: string;
};

export type ResolvedConnection = ConnectionDefaults & { animated: boolean };

export type ConnectionEnds = { from: LatLng; to: LatLng };

export function resolveConnection(connection: PinConnection, defaults: ConnectionDefaults): ResolvedConnection {
  const animated = connection.animated === true;
  const lineStyle = connection.lineStyle ?? defaults.lineStyle;
  return {
    type: connection.type ?? defaults.type,
    archHeight: connection.archHeight ?? defaults.archHeight,
    // A solid stroke has nothing to animate, so an animated one grows a pattern.
    lineStyle: animated && lineStyle === 'solid' ? ANIMATED_FALLBACK : lineStyle,
    width: connection.width ?? defaults.width,
    color: connection.color ?? defaults.color,
    animated,
  };
}

/** Both shapes follow the great circle, so neither ever cuts through the globe. */
export function connectionPath(ends: ConnectionEnds, type: ConnectionType, archHeight: number, segments = SEGMENTS): Vector3[] {
  const { from, to } = ends;
  if (type === 'line') return greatCirclePath(from, to, segments, () => SURFACE_LIFT);
  // Short hops stay low, long hauls climb.
  const height = ARCH_BASE + archHeight * greatCircleFraction(from, to);
  return greatCirclePath(from, to, segments, (t) => SURFACE_LIFT + height * Math.sin(Math.PI * t));
}
