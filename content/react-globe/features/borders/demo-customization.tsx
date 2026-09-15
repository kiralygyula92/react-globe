import { Globe } from 'react-globe';

/** Line colour and weight come with the render style; cartoon draws the heaviest borders. */
export default function BordersCustomization() {
  return (
    <div style={{ height: '100%' }}>
      <Globe renderStyle="cartoon" showShorelines showCountryBorders defaultCamera={{ lat: 5, lng: 20, zoom: 2.6 }} />
    </div>
  );
}
