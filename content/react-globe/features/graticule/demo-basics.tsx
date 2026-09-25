import { Globe } from '@kiralygyula92/react-globe';

export default function GraticuleBasics() {
  return (
    <div style={{ height: '100%' }}>
      <Globe showGraticule showGraticuleLabels defaultCamera={{ lat: 15, lng: 0, zoom: 3.2 }} />
    </div>
  );
}
