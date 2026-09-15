import { Globe } from 'react-globe';

export default function GlobeCustomization() {
  return (
    <div
      style={{
        height: '100%',
        display: 'grid',
        placeItems: 'center',
        background: 'linear-gradient(160deg, rgb(15 23 42), rgb(30 41 59))',
      }}
    >
      <Globe width={320} height={320} renderStyle="modern" showShorelines={false} />
    </div>
  );
}
