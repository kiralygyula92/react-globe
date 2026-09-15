import { Globe } from 'react-globe';

export default function CountryNamesBasics() {
  return (
    <div style={{ height: '100%' }}>
      <Globe showCountryNames defaultCamera={{ lat: 45, lng: 15, zoom: 2.2 }} />
    </div>
  );
}
