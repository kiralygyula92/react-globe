/**
 * CSS colour strings to a three `Color` plus a separate alpha.
 *
 * three's own parser understands rgb(), hsl(), hex and named colours but drops
 * (and warns about) an alpha channel; the fills and strokes here want it as
 * `material.opacity`.
 */

import { Color, SRGBColorSpace } from 'three';

const RGBA = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)\s*(?:[,/]\s*([\d.]+%?)\s*)?\)$/i;

export function parseCssColor(value: string): { color: Color; alpha: number } {
  const match = RGBA.exec(value.trim());
  if (match) {
    const [, r, g, b, a] = match;
    const alpha = a === undefined ? 1 : a.endsWith('%') ? parseFloat(a) / 100 : parseFloat(a);
    return {
      color: new Color().setRGB(Number(r) / 255, Number(g) / 255, Number(b) / 255, SRGBColorSpace),
      alpha: Math.min(1, Math.max(0, alpha)),
    };
  }
  return { color: new Color(value), alpha: 1 };
}
