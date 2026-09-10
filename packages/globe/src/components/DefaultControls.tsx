/**
 * The built-in rotate / zoom / reset buttons: real buttons, keyboard reachable,
 * with focus-visible outlines and disabled states that report whether there is
 * anything to do.
 */

import type { ReactNode } from 'react';
import type { GlobeControlsRenderProps } from '../types';

const BUTTON =
  'wg:pointer-events-auto wg:flex wg:h-8 wg:w-8 wg:cursor-pointer wg:items-center wg:justify-center wg:rounded-md wg:border wg:transition-colors ' +
  'wg:bg-[var(--globe-surface-card,rgb(15_18_38/0.72))] wg:border-[var(--globe-border-strong,rgb(255_255_255/0.3))] wg:text-[var(--globe-paper-100,rgb(247_251_253))] ' +
  'wg:hover:bg-[var(--globe-surface-sunken,rgb(35_42_78/0.9))] wg:disabled:cursor-default wg:disabled:opacity-40 wg:disabled:hover:bg-[var(--globe-surface-card,rgb(15_18_38/0.72))] ' +
  'wg:focus-visible:outline-2 wg:focus-visible:outline-offset-2 wg:focus-visible:outline-[var(--globe-aurora-500,rgb(63_224_197))]';

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  );
}

export function DefaultControls({
  rotateLeft,
  rotateRight,
  zoomIn,
  zoomOut,
  reset,
  canZoomIn,
  canZoomOut,
  canReset,
}: GlobeControlsRenderProps) {
  return (
    <div className="wg:pointer-events-none wg:absolute wg:right-3 wg:bottom-3 wg:flex wg:flex-col wg:gap-1.5">
      <button type="button" className={BUTTON} aria-label="Zoom in" onClick={() => zoomIn()} disabled={!canZoomIn}>
        <Icon>
          <path d="M8 3.5v9M3.5 8h9" />
        </Icon>
      </button>
      <button type="button" className={BUTTON} aria-label="Zoom out" onClick={() => zoomOut()} disabled={!canZoomOut}>
        <Icon>
          <path d="M3.5 8h9" />
        </Icon>
      </button>
      <button type="button" className={BUTTON} aria-label="Rotate left" onClick={() => rotateLeft()}>
        <Icon>
          <path d="M10 3.5 5.5 8 10 12.5" />
        </Icon>
      </button>
      <button type="button" className={BUTTON} aria-label="Rotate right" onClick={() => rotateRight()}>
        <Icon>
          <path d="M6 3.5 10.5 8 6 12.5" />
        </Icon>
      </button>
      <button type="button" className={BUTTON} aria-label="Reset view" onClick={() => reset()} disabled={!canReset}>
        <Icon>
          <path d="M3 8a5 5 0 1 0 1.5-3.6" />
          <path d="M3 3v2.5h2.5" />
        </Icon>
      </button>
    </div>
  );
}
