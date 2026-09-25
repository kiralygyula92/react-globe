import { useState, type CSSProperties } from 'react';
import { Globe, localizedName, type CountryFeature } from '@kiralygyula92/react-globe';

const theme = { height: '100%', position: 'relative', '--globe-color-tooltip': 'rgb(88 28 135)' } as CSSProperties;

export default function CountryInteractionCustomization() {
  const [country, setCountry] = useState<CountryFeature | null>(null);

  return (
    <div style={theme}>
      <Globe
        locale="es"
        highlightCountryOnHover
        showCountryNameOnHover
        countryHighlightColor={{ standard: 'rgb(168 85 247 / 0.5)' }}
        onCountryHover={setCountry}
      />
      <output style={{ position: 'absolute', left: 12, bottom: 12, color: 'white', font: '13px system-ui, sans-serif' }}>
        {country ? `${localizedName(country.properties, 'es')} · ${country.properties.isoA3 ?? '—'}` : ''}
      </output>
    </div>
  );
}
