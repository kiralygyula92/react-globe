/** A country name, as crisp DOM text centred on its label point. */

const STYLE = {
  color: 'var(--globe-color-label, rgb(247 251 253))',
  textShadow: '0 1px 2px rgb(0 0 0 / 0.8), 0 0 6px rgb(0 0 0 / 0.45)',
} as const;

export function CountryLabel({ name }: { name: string }) {
  return (
    <span
      className="rg:block rg:-translate-x-1/2 rg:-translate-y-1/2 rg:whitespace-nowrap rg:text-[0.68rem] rg:leading-none rg:font-semibold rg:tracking-wide rg:select-none"
      style={STYLE}
    >
      {name}
    </span>
  );
}
