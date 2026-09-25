import { Globe } from '@kiralygyula92/react-globe';

export default function RenderStylesCustomization() {
  return (
    <div style={{ height: '100%' }}>
      <Globe
        renderStyle="cartoon"
        colorScheme="grayscale"
        highlightCountryOnHover
        countryHighlightColor={{ cartoon: 'rgb(255 99 71 / 0.55)' }}
        backgroundColor="rgb(245 240 230)"
      />
    </div>
  );
}
