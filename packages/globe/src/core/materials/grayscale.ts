/**
 * Grayscale as a shader edit, never a CSS filter: pins, labels and popups sit in
 * the DOM above the canvas and are the consumer's content, so they keep their colour.
 */

import type { Material } from 'three';

/** Collapses a material's output to Rec. 709 luminance. */
export function applyGrayscale<T extends Material>(material: T): T {
  const previous = material.onBeforeCompile;
  material.onBeforeCompile = (shader, renderer) => {
    previous?.call(material, shader, renderer);
    // `colorspace_fragment` is the last thing that touches gl_FragColor, so
    // desaturating just before it catches lighting, maps and fog alike.
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <colorspace_fragment>',
      'gl_FragColor.rgb = vec3(dot(gl_FragColor.rgb, vec3(0.2126, 0.7152, 0.0722)));\n\t#include <colorspace_fragment>',
    );
  };

  // Materials are keyed by their program cache key; without this, a grey globe
  // and a colour one in the same page would share one compiled program.
  const baseKey = material.customProgramCacheKey.bind(material);
  material.customProgramCacheKey = () => `${baseKey()}|grayscale`;
  material.needsUpdate = true;
  return material;
}

/** Rec. 709 luma of an sRGB triple, for colours that never reach a shader edit. */
export function lumaOf([r, g, b]: readonly [number, number, number]): number {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
