import { DEFAULT_GLOBE_MESSAGES, Globe, type GlobeMessages } from '@kiralygyula92/react-globe';

/** Italian is not built in: supply every string, and place names come from the dataset where it has them. */
const italian: GlobeMessages = {
  ...DEFAULT_GLOBE_MESSAGES.en,
  zoomIn: 'Ingrandisci',
  zoomOut: 'Riduci',
  rotateLeft: 'Ruota a sinistra',
  rotateRight: 'Ruota a destra',
  resetView: 'Ripristina la vista',
  cluster: (count) => (count === 1 ? '1 indicatore' : `${count} indicatori`),
  east: 'E',
  west: 'O',
};

export default function LocalizationCustomization() {
  return (
    <div style={{ height: '100%' }}>
      <Globe locale="it" messages={italian} showControls showGraticule showGraticuleLabels defaultCamera={{ lat: 10, lng: 12, zoom: 3.2 }} />
    </div>
  );
}
