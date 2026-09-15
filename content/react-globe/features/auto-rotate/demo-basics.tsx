import { Globe } from 'react-globe';

export default function AutoRotateBasics() {
  return (
    <div style={{ height: '100%' }}>
      <Globe onReady={(globe) => globe.startAutoRotate()} />
    </div>
  );
}
