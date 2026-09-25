import { Globe } from '@kiralygyula92/react-globe';

export default function AutoRotateBasics() {
  return (
    <div style={{ height: '100%' }}>
      <Globe onReady={(globe) => globe.startAutoRotate()} />
    </div>
  );
}
