/** Gesture bookkeeping: a drag must end even when its release is never delivered. */

import { afterEach, describe, expect, it, vi } from 'vitest';
import type { CameraPose } from '../../types';
import { PointerControls, type ControlHost } from './PointerControls';

/** jsdom has no PointerEvent constructor; a MouseEvent with the pointer fields is enough here. */
function pointer(type: string, init: MouseEventInit & { pointerId?: number; pointerType?: string } = {}): Event {
  const event = new MouseEvent(type, { bubbles: true, cancelable: true, ...init });
  Object.defineProperty(event, 'pointerId', { value: init.pointerId ?? 1 });
  Object.defineProperty(event, 'pointerType', { value: init.pointerType ?? 'mouse' });
  return event;
}

function setup() {
  let pose: Required<CameraPose> = { lat: 20, lng: 0, zoom: 3.2, tilt: 0 };
  const applyPose = vi.fn((next: Required<CameraPose>) => {
    pose = next;
  });
  const host: ControlHost = {
    getPose: () => pose,
    applyPose,
    swingPose: vi.fn(),
    getZoomTarget: () => pose.zoom,
    setZoomTarget: vi.fn(),
    getSize: () => ({ width: 800, height: 600 }),
    latLngToScreen: () => null,
    screenToLatLng: () => null,
    isFlying: () => false,
    onInteractionStart: vi.fn(),
  };
  const element = document.createElement('div');
  document.body.append(element);
  const controls = new PointerControls(element, host, { enableZoom: true, enableRotation: true, enableTilt: true });
  return { element, controls, applyPose, setZoomTarget: host.setZoomTarget as ReturnType<typeof vi.fn> };
}

let dispose: (() => void) | null = null;
afterEach(() => {
  dispose?.();
  dispose = null;
  document.body.innerHTML = '';
});

describe('PointerControls', () => {
  it('rotates while the button is held', () => {
    const { element, controls, applyPose } = setup();
    dispose = () => controls.dispose();
    element.dispatchEvent(pointer('pointerdown', { button: 0, buttons: 1, clientX: 100, clientY: 100 }));
    window.dispatchEvent(pointer('pointermove', { buttons: 1, clientX: 140, clientY: 100 }));
    expect(applyPose).toHaveBeenCalledTimes(1);
  });

  it('ends a drag whose release it never saw, instead of turning on plain movement', () => {
    const { element, controls, applyPose } = setup();
    dispose = () => controls.dispose();
    element.dispatchEvent(pointer('pointerdown', { button: 0, buttons: 1, clientX: 100, clientY: 100 }));
    // The release happened outside the window: the next move arrives with nothing held.
    window.dispatchEvent(pointer('pointermove', { buttons: 0, clientX: 140, clientY: 100 }));
    window.dispatchEvent(pointer('pointermove', { buttons: 0, clientX: 180, clientY: 100 }));
    expect(applyPose).not.toHaveBeenCalled();
  });

  it('ends a drag when the window loses focus mid-gesture', () => {
    const { element, controls, applyPose } = setup();
    dispose = () => controls.dispose();
    element.dispatchEvent(pointer('pointerdown', { button: 0, buttons: 1, clientX: 100, clientY: 100 }));
    window.dispatchEvent(new Event('blur'));
    // Back in the window with the button down again from elsewhere: not this drag any more.
    window.dispatchEvent(pointer('pointermove', { buttons: 1, clientX: 140, clientY: 100 }));
    expect(applyPose).not.toHaveBeenCalled();
  });

  it('zooms by whole pages when the wheel reports pages', () => {
    const { element, controls, setZoomTarget } = setup();
    dispose = () => controls.dispose();
    const wheel = new WheelEvent('wheel', { deltaY: 1, deltaMode: 2, cancelable: true });
    element.dispatchEvent(wheel);
    // One page down zooms out as far as a long scroll would, not by a hair.
    const [[target]] = setZoomTarget.mock.calls as [[number]];
    expect(target).toBeGreaterThan(3.2 * 2);
  });
});
