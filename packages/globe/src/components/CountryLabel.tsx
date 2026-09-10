/** A country name, as crisp DOM text centred on its label point. */

const STYLE = {
  color: 'var(--globe-paper-100, rgb(247 251 253))',
  textShadow: '0 1px 2px rgb(0 0 0 / 0.8), 0 0 6px rgb(0 0 0 / 0.45)',
} as const;

export function CountryLabel({ name }: { name: string }) {
  return (
    <span
      className="wg:block wg:-translate-x-1/2 wg:-translate-y-1/2 wg:whitespace-nowrap wg:text-[0.68rem] wg:leading-none wg:font-semibold wg:tracking-wide wg:select-none"
      style={STYLE}
    >
      {name}
    </span>
  );
}
