/** A degree label on the equator or the prime meridian. */

const STYLE = {
  color: 'var(--globe-paper-100, rgb(247 251 253))',
  textShadow: '0 1px 2px rgb(0 0 0 / 0.7)',
  opacity: 0.8,
} as const;

export function GraticuleLabel({ text }: { text: string }) {
  return (
    <span
      className="wg:block wg:-translate-x-1/2 wg:-translate-y-1/2 wg:whitespace-nowrap wg:font-mono wg:text-[0.58rem] wg:leading-none wg:select-none"
      style={STYLE}
    >
      {text}
    </span>
  );
}
