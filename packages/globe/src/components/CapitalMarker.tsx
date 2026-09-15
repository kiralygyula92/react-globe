/** A capital: a ringed dot on the city, its name beside it. */

const DOT = {
  background: 'var(--globe-color-accent, rgb(63 224 197))',
  boxShadow: '0 0 0 1.5px var(--globe-color-outline, rgb(255 255 255))',
} as const;

const NAME = {
  color: 'var(--globe-color-label, rgb(247 251 253))',
  textShadow: '0 1px 2px rgb(0 0 0 / 0.8), 0 0 5px rgb(0 0 0 / 0.45)',
} as const;

export function CapitalMarker({ name }: { name: string }) {
  return (
    <span className="rg:flex rg:-translate-x-[4px] rg:-translate-y-1/2 rg:items-center rg:gap-1 rg:select-none">
      <span className="rg:block rg:h-2 rg:w-2 rg:shrink-0 rg:rounded-full" style={DOT} />
      <span className="rg:whitespace-nowrap rg:text-[0.62rem] rg:leading-none rg:font-medium" style={NAME}>
        {name}
      </span>
    </span>
  );
}
