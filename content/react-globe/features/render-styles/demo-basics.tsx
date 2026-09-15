import { useState } from 'react';
import { Globe, type RenderStyle } from 'react-globe';

const STYLES: RenderStyle[] = ['standard', 'realistic', 'cartoon', 'modern'];

export default function RenderStylesBasics() {
  const [style, setStyle] = useState<RenderStyle>('realistic');

  return (
    <div style={{ height: '100%', position: 'relative' }}>
      <Globe renderStyle={style} />
      <div style={{ position: 'absolute', left: 12, top: 12, display: 'flex', gap: 6 }}>
        {STYLES.map((s) => (
          <button key={s} type="button" onClick={() => setStyle(s)} aria-pressed={s === style}>
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
