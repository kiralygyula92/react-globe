/** A capital: a ringed dot on the city, its name beside it. */

const DOT = {
  background: 'var(--globe-aurora-500, rgb(63 224 197))',
  boxShadow: '0 0 0 1.5px var(--globe-paper-000, rgb(255 255 255))',
} as const;

const NAME = {
  color: 'var(--globe-paper-100, rgb(247 251 253))',
  textShadow: '0 1px 2px rgb(0 0 0 / 0.8), 0 0 5px rgb(0 0 0 / 0.45)',
} as const;

export function CapitalMarker({ name }: { name: string }) {
  return (
    <span className="wg:flex wg:-translate-x-[4px] wg:-translate-y-1/2 wg:items-center wg:gap-1 wg:select-none">
      <span className="wg:block wg:h-2 wg:w-2 wg:shrink-0 wg:rounded-full" style={DOT} />
      <span className="wg:whitespace-nowrap wg:text-[0.62rem] wg:leading-none wg:font-medium" style={NAME}>
        {name}
      </span>
    </span>
  );
}
