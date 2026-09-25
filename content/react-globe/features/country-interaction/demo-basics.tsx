import { useState } from 'react';
import { Globe } from '@kiralygyula92/react-globe';

export default function CountryInteractionBasics() {
  const [clicked, setClicked] = useState<string>();

  return (
    <div style={{ height: '100%', position: 'relative' }}>
      <Globe highlightCountryOnHover showCountryNameOnHover onCountryClick={(country) => setClicked(country.properties.name)} />
      <output style={{ position: 'absolute', left: 12, top: 12, color: 'white', font: '13px system-ui, sans-serif' }}>
        {clicked ? `Clicked ${clicked}` : 'Hover or click a country'}
      </output>
    </div>
  );
}
