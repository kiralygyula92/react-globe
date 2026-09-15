import { useState } from 'react';
import { GLOBE_LOCALES, Globe, type GlobeLocale } from 'react-globe';

export default function LocalizationBasics() {
  const [locale, setLocale] = useState<GlobeLocale>('hu');

  return (
    <div style={{ height: '100%', position: 'relative' }}>
      <Globe locale={locale} showCountryNames showCapitals showControls defaultCamera={{ lat: 46, lng: 15, zoom: 2.5 }} />
      <label style={{ position: 'absolute', left: 12, top: 12, color: 'white', font: '13px system-ui, sans-serif' }}>
        Locale{' '}
        <select value={locale} onChange={(e) => setLocale(e.target.value as GlobeLocale)}>
          {GLOBE_LOCALES.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
