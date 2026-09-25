import { Globe, type CapitalRecord } from '@kiralygyula92/react-globe';

/** Your own points of interest, drawn with the capital marker and its collision-aware label. */
const sites: CapitalRecord[] = [
  { id: 'vienna-office', name: 'Vienna office', country: 'Austria', isoA2: 'AT', lat: 48.2082, lng: 16.3738, labelPriority: 0 },
  { id: 'cape-town-lab', name: 'Cape Town lab', country: 'South Africa', isoA2: 'ZA', lat: -33.9249, lng: 18.4241, labelPriority: 1 },
  { id: 'accra-hub', name: 'Accra hub', country: 'Ghana', isoA2: 'GH', lat: 5.6037, lng: -0.187, labelPriority: 2 },
];

export default function CustomAssetsCustomization() {
  return (
    <div style={{ height: '100%' }}>
      <Globe assets={{ capitalsDataset: sites }} showCapitals capitalsMinZoom={4} defaultCamera={{ lat: 10, lng: 15, zoom: 3.2 }} />
    </div>
  );
}
