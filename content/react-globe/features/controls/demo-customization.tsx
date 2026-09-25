import { Globe, type GlobeControlsRenderProps } from '@kiralygyula92/react-globe';

const button = {
  pointerEvents: 'auto',
  padding: '4px 10px',
  border: '1px solid rgb(255 255 255 / 0.4)',
  borderRadius: 999,
  background: 'rgb(0 0 0 / 0.55)',
  color: 'white',
  cursor: 'pointer',
} as const;

/** A horizontal toolbar along the top; the container is the positioning context. */
function Toolbar({ rotateLeft, rotateRight, zoomIn, zoomOut, reset, canZoomIn, canZoomOut, canReset, camera, messages }: GlobeControlsRenderProps) {
  return (
    <div style={{ pointerEvents: 'none', position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 6 }}>
      <button type="button" style={button} onClick={rotateLeft} aria-label={messages.rotateLeft}>
        ←
      </button>
      <button type="button" style={button} onClick={zoomIn} disabled={!canZoomIn} aria-label={messages.zoomIn}>
        +
      </button>
      <span style={{ ...button, cursor: 'default', font: '12px ui-monospace, monospace' }}>{camera.zoom.toFixed(2)}</span>
      <button type="button" style={button} onClick={zoomOut} disabled={!canZoomOut} aria-label={messages.zoomOut}>
        −
      </button>
      <button type="button" style={button} onClick={rotateRight} aria-label={messages.rotateRight}>
        →
      </button>
      <button type="button" style={button} onClick={reset} disabled={!canReset}>
        {messages.resetView}
      </button>
    </div>
  );
}

export default function ControlsCustomization() {
  return (
    <div style={{ height: '100%' }}>
      <Globe showControls controlsComponent={Toolbar} />
    </div>
  );
}
