import { Globe } from 'react-globe';

export default function GraticuleBasics() {
  return (
    <div style={{ height: '100%' }}>
      <Globe showGraticule showGraticuleLabels defaultCamera={{ lat: 15, lng: 0, zoom: 2.4 }} />
    </div>
  );
}
