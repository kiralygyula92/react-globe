import { Globe, type CountryCollection } from '@kiralygyula92/react-globe';

/** A tiny hand-drawn dataset: two rectangles standing in for regions. */
const regions: CountryCollection = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: { id: 'NRT', name: 'Northern region', isoA2: null, isoA3: null, labelLat: null, labelLng: null, labelPriority: 1 },
      geometry: { type: 'Polygon', coordinates: [[[-20, 30], [20, 30], [20, 60], [-20, 60], [-20, 30]]] },
    },
    {
      type: 'Feature',
      properties: { id: 'STH', name: 'Southern region', isoA2: null, isoA3: null, labelLat: null, labelLng: null, labelPriority: 2 },
      geometry: { type: 'Polygon', coordinates: [[[-10, -40], [30, -40], [30, -5], [-10, -5], [-10, -40]]] },
    },
  ],
};

export default function CustomAssetsBasics() {
  return (
    <div style={{ height: '100%' }}>
      <Globe assets={{ countriesGeoJson: regions }} renderStyle="cartoon" showCountryNames highlightCountryOnHover showCountryBorders={false} />
    </div>
  );
}
