/** A degree label on the equator or the prime meridian. */

const STYLE = {
  color: 'var(--globe-color-label, rgb(247 251 253))',
  textShadow: '0 1px 2px rgb(0 0 0 / 0.7)',
  opacity: 0.8,
} as const;

export function GraticuleLabel({ text }: { text: string }) {
  return (
    <span
      className="rg:block rg:-translate-x-1/2 rg:-translate-y-1/2 rg:whitespace-nowrap rg:font-mono rg:text-[0.58rem] rg:leading-none rg:select-none"
      style={STYLE}
    >
      {text}
    </span>
  );
}
