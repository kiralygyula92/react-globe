/**
 * The built-in rotate / zoom / reset buttons: real buttons, keyboard reachable,
 * with focus-visible outlines and disabled states that report whether there is
 * anything to do.
 */

import type { ReactNode } from 'react';
import type { GlobeControlsRenderProps } from '../types';

const BUTTON =
  'rg:pointer-events-auto rg:flex rg:h-8 rg:w-8 rg:cursor-pointer rg:items-center rg:justify-center rg:rounded-md rg:border rg:transition-colors ' +
  'rg:bg-[var(--globe-surface-card,rgb(15_18_38/0.72))] rg:border-[var(--globe-border-strong,rgb(255_255_255/0.3))] rg:text-[var(--globe-color-label,rgb(247_251_253))] ' +
  'rg:hover:bg-[var(--globe-surface-sunken,rgb(35_42_78/0.9))] rg:disabled:cursor-default rg:disabled:opacity-40 rg:disabled:hover:bg-[var(--globe-surface-card,rgb(15_18_38/0.72))] ' +
  'rg:focus-visible:outline-2 rg:focus-visible:outline-offset-2 rg:focus-visible:outline-[var(--globe-color-accent,rgb(63_224_197))]';

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
    <div className="rg:pointer-events-none rg:absolute rg:right-3 rg:bottom-3 rg:flex rg:flex-col rg:gap-1.5">
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
