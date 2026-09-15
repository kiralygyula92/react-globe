import { useState, type CSSProperties } from 'react';
import { Globe } from 'react-globe';

/**
 * The background can name a design token defined on an ancestor. The token is read when the
 * prop changes, so switch between tokens rather than changing a token's value in place.
 */
const theme = {
  height: '100%',
  position: 'relative',
  '--surface-light': 'rgb(241 245 249)',
  '--surface-dark': 'rgb(17 24 39)',
} as CSSProperties;

export default function BackgroundCustomization() {
  const [dark, setDark] = useState(false);

  return (
    <div style={theme}>
      <Globe backgroundColor={dark ? 'var(--surface-dark)' : 'var(--surface-light)'} renderStyle="cartoon" />
      <button type="button" onClick={() => setDark((d) => !d)} style={{ position: 'absolute', left: 12, top: 12 }}>
        {dark ? 'Light surface' : 'Dark surface'}
      </button>
    </div>
  );
}
