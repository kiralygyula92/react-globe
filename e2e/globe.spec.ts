/**
 * End-to-end suite for the globe, driving the docs site's playground page
 * (content/react-globe/demos/playground) through its controls and the
 * `window.__globe` handle.
 */

import { expect, test, type Page } from '@playwright/test';

type Pose = { lat: number; lng: number; zoom: number; tilt: number };
type LatLng = { lat: number; lng: number };

const PLAYGROUND = '/react-globe/demos/playground/';
const LONDON = { lat: 51.5074, lng: -0.1278 };
const SYDNEY = { lat: -33.8688, lng: 151.2093 };
const HOME = { lat: 25, lng: 8, zoom: 2.8, tilt: 0 };

/* ------------------------------------------------------------------ harness */

/** Waits for the engine to report itself ready and the first frames to land. */
async function openPlayground(page: Page): Promise<string[]> {
  const errors: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  page.on('pageerror', (e) => errors.push(e.message));

  await page.goto(PLAYGROUND);
  // The demo mounts as it scrolls into view; bring it fully into the viewport, below the sticky header.
  await page.locator('figure[data-demo]').evaluate((el) => el.scrollIntoView({ block: 'start' }));
  await page.waitForFunction(() => '__globe' in window, undefined, { timeout: 60000 });
  await page.waitForTimeout(1200);
  return errors;
}

const setToggle = (page: Page, label: string, on: boolean) =>
  page.locator('label', { hasText: label }).first().locator('input[type=checkbox]').setChecked(on);

const select = (page: Page, label: string, value: string) =>
  page.selectOption(`label:has-text("${label}") select`, value);

const canvas = (page: Page) => page.locator('[data-globe-root] canvas');

async function setCamera(page: Page, pose: Partial<Pose>): Promise<void> {
  await page.evaluate((p) => window.__globe.setCamera(p, { animate: false }), pose);
}

const getCamera = (page: Page): Promise<Pose> => page.evaluate(() => window.__globe.getCamera());

const toScreen = (page: Page, point: LatLng) => page.evaluate((p) => window.__globe.latLngToScreen(p), point);

const toLatLng = (page: Page, x: number, y: number) =>
  page.evaluate(([px, py]) => window.__globe.screenToLatLng(px, py), [x, y] as const);

async function canvasBox(page: Page) {
  const box = await canvas(page).boundingBox();
  if (!box) throw new Error('canvas has no box');
  return box;
}

/** A page screenshot with a clip — an element screenshot never settles on a canvas that redraws. */
async function snapshot(page: Page): Promise<string> {
  const box = await canvasBox(page);
  const png = await page.screenshot({ clip: box });
  return png.toString('base64');
}

/** Playwright hands back a PNG and there is no decoder here — but the browser under test is one. */
async function pixelAt(page: Page, x: number, y: number): Promise<number[]> {
  const png = await page.screenshot({ clip: { x, y, width: 1, height: 1 } });
  return page.evaluate(async (b64) => {
    const image = new Image();
    image.src = `data:image/png;base64,${b64}`;
    await image.decode();
    const c = document.createElement('canvas');
    c.width = 1;
    c.height = 1;
    const ctx = c.getContext('2d')!;
    ctx.drawImage(image, 0, 0);
    return Array.from(ctx.getImageData(0, 0, 1, 1).data);
  }, png.toString('base64'));
}

async function drag(page: Page, from: { x: number; y: number }, dx: number, dy: number, button: 'left' | 'right') {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down({ button });
  const steps = 12;
  for (let i = 1; i <= steps; i++) {
    await page.mouse.move(from.x + (dx * i) / steps, from.y + (dy * i) / steps);
  }
}

declare global {
  interface Window {
    __globe: {
      setCamera(pose: Partial<Pose>, opts?: { animate?: boolean; durationMs?: number }): void;
      reset(opts?: { animate?: boolean }): void;
      getCamera(): Pose;
      latLngToScreen(point: LatLng): { x: number; y: number } | null;
      screenToLatLng(x: number, y: number): LatLng | null;
      startAutoRotate(speed?: number): void;
      stopAutoRotate(): void;
    };
    __warnings: string[];
    __lost: number;
  }
}

/* -------------------------------------------------------------------- tests */

test('renders an interactive globe with no console errors', async ({ page }) => {
  const errors = await openPlayground(page);
  await expect(canvas(page)).toBeVisible();
  const box = await canvasBox(page);
  expect(box.width).toBeGreaterThan(300);
  const hasWebgl2 = await canvas(page).evaluate((c: HTMLCanvasElement) => c.getContext('webgl2') !== null);
  expect(hasWebgl2).toBe(true);
  expect(errors).toEqual([]);
});

test('the imperative handle moves the camera', async ({ page }) => {
  const errors = await openPlayground(page);
  await setCamera(page, { lat: 12.345, lng: -45.678, zoom: 2.2, tilt: 17.5 });
  const pose = await getCamera(page);
  expect(pose.lat).toBeCloseTo(12.345, 3);
  expect(pose.lng).toBeCloseTo(-45.678, 3);
  expect(pose.zoom).toBeCloseTo(2.2, 3);
  expect(pose.tilt).toBeCloseTo(17.5, 3);
  expect(errors).toEqual([]);
});

test('zoom is clamped', async ({ page }) => {
  await openPlayground(page);
  await setCamera(page, { zoom: 0.1 });
  expect((await getCamera(page)).zoom).toBeCloseTo(1.1, 5);
  await setCamera(page, { zoom: 99 });
  expect((await getCamera(page)).zoom).toBeCloseTo(4, 5);
});

test('tilt is clamped', async ({ page }) => {
  await openPlayground(page);
  await setCamera(page, { tilt: -40 });
  expect((await getCamera(page)).tilt).toBe(0);
  await setCamera(page, { tilt: 140 });
  expect((await getCamera(page)).tilt).toBe(75);
});

test('projects the three landmarks', async ({ page }) => {
  await openPlayground(page);
  await setCamera(page, { lat: 0, lng: 0, zoom: 2.6, tilt: 0 });
  const box = await canvasBox(page);

  const gulf = await toScreen(page, { lat: 0, lng: 0 });
  expect(gulf).not.toBeNull();
  expect(Math.abs(gulf!.x - box.width / 2)).toBeLessThan(1);
  expect(Math.abs(gulf!.y - box.height / 2)).toBeLessThan(1);

  const london = await toScreen(page, LONDON);
  expect(london).not.toBeNull();
  expect(london!.y).toBeLessThan(gulf!.y);
  expect(Math.abs(london!.x - gulf!.x)).toBeLessThan(box.width * 0.05);

  // Sydney is on the far side of the planet.
  expect(await toScreen(page, SYDNEY)).toBeNull();
});

test('screenToLatLng inverts latLngToScreen', async ({ page }) => {
  await openPlayground(page);
  await setCamera(page, { lat: 10, lng: 20, zoom: 2.4, tilt: 0 });
  for (const point of [
    { lat: 25, lng: 35 },
    { lat: -5, lng: 10 },
    LONDON,
  ]) {
    const screen = await toScreen(page, point);
    expect(screen).not.toBeNull();
    const back = await toLatLng(page, screen!.x, screen!.y);
    expect(back!.lat).toBeCloseTo(point.lat, 1);
    expect(back!.lng).toBeCloseTo(point.lng, 1);
  }
});

test('left drag rotates and right drag tilts', async ({ page }) => {
  const errors = await openPlayground(page);
  await setCamera(page, { lat: 20, lng: 0, zoom: 2.6, tilt: 0 });
  const box = await canvasBox(page);
  const centre = { x: box.x + box.width / 2, y: box.y + box.height / 2 };

  // Dragging right carries the surface right: the centre moves west.
  await drag(page, centre, 150, 0, 'left');
  await page.mouse.up({ button: 'left' });
  await page.waitForTimeout(300);
  const rotated = await getCamera(page);
  expect(rotated.lng).toBeLessThan(0);
  expect(rotated.tilt).toBe(0);

  await drag(page, centre, 0, 80, 'right');
  await page.mouse.up({ button: 'right' });
  await page.waitForTimeout(300);
  expect((await getCamera(page)).tilt).toBeGreaterThan(10);
  expect(errors).toEqual([]);
});

test('the canvas suppresses its own context menu and nothing else', async ({ page }) => {
  await openPlayground(page);
  const onCanvas = await canvas(page).evaluate((c) => {
    const event = new MouseEvent('contextmenu', { bubbles: true, cancelable: true });
    c.dispatchEvent(event);
    return event.defaultPrevented;
  });
  expect(onCanvas).toBe(true);
  const onBody = await page.evaluate(() => {
    const event = new MouseEvent('contextmenu', { bubbles: true, cancelable: true });
    document.body.dispatchEvent(event);
    return event.defaultPrevented;
  });
  expect(onBody).toBe(false);
});

test('wheel zooms, and with enableZoom off the page scrolls', async ({ page }) => {
  await openPlayground(page);
  await setCamera(page, { zoom: 3 });
  const box = await canvasBox(page);
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.wheel(0, -300);
  await page.waitForTimeout(800);
  expect((await getCamera(page)).zoom).toBeLessThan(3);

  await setToggle(page, 'enableZoom', false);
  await page.waitForTimeout(400);
  const prevented = await canvas(page).evaluate((c) => {
    const event = new WheelEvent('wheel', { deltaY: 100, bubbles: true, cancelable: true });
    c.dispatchEvent(event);
    return event.defaultPrevented;
  });
  expect(prevented).toBe(false);
});

test('clusters carry their count and expand', async ({ page }) => {
  await openPlayground(page);
  await setCamera(page, { lat: 48.9, lng: 2.4, zoom: 3.4, tilt: 0 });
  await page.waitForTimeout(1000);

  const clusters = page.locator('[data-globe-root] button').filter({ hasText: /^\d+$/ });
  await expect(clusters.first()).toBeVisible();
  const counts = (await clusters.allTextContents()).map(Number);
  expect(Math.max(...counts)).toBeGreaterThanOrEqual(3);

  await setCamera(page, { zoom: 1.15 });
  await page.waitForTimeout(1000);
  await expect(clusters).toHaveCount(0);
});

test('locale translates the controls, cluster names and place names', async ({ page }) => {
  const errors = await openPlayground(page);
  const root = page.locator('[data-globe-root]');
  await expect(root).toHaveAttribute('lang', 'en');
  await expect(root.getByRole('button', { name: 'Zoom in', exact: true })).toBeVisible();

  await select(page, 'locale', 'de');
  await expect(root).toHaveAttribute('lang', 'de');
  await expect(root.getByRole('button', { name: 'Vergrößern', exact: true })).toBeVisible();
  await expect(root.getByRole('button', { name: 'Zoom in', exact: true })).toHaveCount(0);

  // The Paris trio sits in one cluster at this distance.
  await setCamera(page, { lat: 48.9, lng: 2.4, zoom: 3.4, tilt: 0 });
  await page.waitForTimeout(1000);
  await expect(root.getByRole('button', { name: /^\d+ Markierungen$/ }).first()).toBeVisible();

  await setToggle(page, 'showCountryNames', true);
  await setCamera(page, { lat: 46.5, lng: 2.5, zoom: 2.2, tilt: 0 });
  await page.waitForTimeout(1500);
  await expect(root.getByText('Frankreich', { exact: true })).toBeVisible();

  await select(page, 'locale', 'hu');
  await page.waitForTimeout(1000);
  await expect(root.getByRole('button', { name: 'Nagyítás', exact: true })).toBeVisible();
  await expect(root.getByText('Franciaország', { exact: true })).toBeVisible();
  await expect(root.getByText('Frankreich', { exact: true })).toHaveCount(0);

  await select(page, 'locale', 'ro');
  await page.waitForTimeout(1000);
  await expect(root.getByText('Franța', { exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

test('capitals appear only once close enough', async ({ page }) => {
  await openPlayground(page);
  await setToggle(page, 'showCapitals', true);
  await setCamera(page, { lat: 48.86, lng: 2.35, zoom: 3.6, tilt: 0 });
  await page.waitForTimeout(1500);
  await expect(page.locator('[data-globe-root]').getByText('Paris', { exact: true })).toHaveCount(0);

  await setCamera(page, { zoom: 2 });
  await page.waitForTimeout(1000);
  await expect(page.locator('[data-globe-root]').getByText('Paris', { exact: true }).first()).toBeVisible();
});

test('country names render as crisp DOM text', async ({ page }) => {
  await openPlayground(page);
  await setToggle(page, 'showCountryNames', true);
  await setCamera(page, { lat: 46.5, lng: 2.5, zoom: 2.2, tilt: 0 });
  await page.waitForTimeout(1500);
  await expect(page.locator('[data-globe-root]').getByText('France', { exact: true })).toBeVisible();
});

test('every render override replaces its default', async ({ page }) => {
  const errors = await openPlayground(page);

  await setToggle(page, 'clusterComponent', true);
  await setCamera(page, { lat: 48.9, lng: 2.4, zoom: 3.4, tilt: 0 });
  await page.waitForTimeout(1000);
  await expect(page.locator('[data-globe-root] [data-testid="diamond-cluster"]').first()).toBeVisible();

  await setToggle(page, 'controlsComponent', true);
  await page.waitForTimeout(500);
  await expect(page.locator('[data-globe-root]').getByRole('button', { name: '<', exact: true })).toBeVisible();

  await setToggle(page, 'pinComponent', true);
  await setCamera(page, { lat: 51.5, lng: -0.13, zoom: 1.6, tilt: 0 });
  await page.waitForTimeout(1000);
  await expect(page.locator('[data-globe-root] [data-testid="square-pin"]').first()).toBeVisible();

  await setToggle(page, 'connectionComponent', true);
  await setCamera(page, { lat: 25, lng: 8, zoom: 2.8, tilt: 0 });
  // Software WebGL under load can take several overlay passes to project the paths; poll, do not sleep.
  await expect.poll(() => page.locator('[data-globe-root] svg g[stroke] path').count(), { timeout: 20_000 }).toBeGreaterThan(0);
  expect(errors).toEqual([]);
});

test('an unknown connection endpoint warns instead of throwing', async ({ page }) => {
  // Vite's dev client installs its own console.warn later; a getter survives that.
  await page.addInitScript(() => {
    const warnings: string[] = [];
    (window as unknown as { __warnings: string[] }).__warnings = warnings;
    const original = console.warn.bind(console);
    Object.defineProperty(console, 'warn', {
      configurable: true,
      get: () => (...args: unknown[]) => {
        warnings.push(args.map(String).join(' '));
        original(...args);
      },
      set: () => undefined,
    });
  });
  const errors = await openPlayground(page);
  const warnings = await page.evaluate(() => window.__warnings);
  expect(warnings.some((w) => w.includes('atlantis') && w.includes('broken'))).toBe(true);
  expect(errors).toEqual([]);
  await expect(canvas(page)).toBeVisible();
});

test('cartoon and grayscale change what is drawn, without a CSS filter', async ({ page }) => {
  const errors = await openPlayground(page);
  const filters = () =>
    page.evaluate(() => {
      const root = document.querySelector('[data-globe-root]')!;
      const c = root.querySelector('canvas')!;
      return [getComputedStyle(root).filter, getComputedStyle(c).filter];
    });
  expect(await filters()).toEqual(['none', 'none']);
  await select(page, 'renderStyle', 'cartoon');
  await page.waitForTimeout(2000);
  expect(await filters()).toEqual(['none', 'none']);
  await select(page, 'colorScheme', 'grayscale');
  await page.waitForTimeout(1000);
  expect(await filters()).toEqual(['none', 'none']);
  expect(errors).toEqual([]);
});

test('mounting and unmounting twenty times leaks no WebGL context', async ({ page }) => {
  // Each remount builds a fresh context and recompiles its shaders, which takes
  // several seconds under software rendering; twenty of them need room.
  test.setTimeout(600_000);
  await page.addInitScript(() => {
    (window as unknown as { __lost: number }).__lost = 0;
    document.addEventListener(
      'webglcontextlost',
      () => {
        (window as unknown as { __lost: number }).__lost += 1;
      },
      true,
    );
  });
  const tooMany: string[] = [];
  page.on('console', (m) => {
    if (/too many active webgl contexts/i.test(m.text())) tooMany.push(m.text());
  });
  const errors = await openPlayground(page);

  for (let i = 0; i < 20; i++) {
    await page.getByRole('button', { name: 'Unmount the globe' }).click();
    await expect(canvas(page)).toHaveCount(0);
    await page.getByRole('button', { name: 'Mount the globe' }).click();
    await expect(canvas(page)).toHaveCount(1);
    await page.waitForTimeout(150);
  }
  await page.waitForTimeout(1000);

  expect(await page.evaluate(() => window.__lost)).toBe(0);
  expect(tooMany).toEqual([]);
  await expect(page.locator('canvas')).toHaveCount(1);
  const lost = await canvas(page).evaluate((c: HTMLCanvasElement) => c.getContext('webgl2')?.isContextLost() ?? true);
  expect(lost).toBe(false);
  expect(errors).toEqual([]);
});

test('holds a workable frame rate with five thousand pins', async ({ page }) => {
  const errors = await openPlayground(page);
  await setToggle(page, '5 000-pin stress set', true);
  await page.waitForTimeout(2000);
  await page.evaluate(() => window.__globe.startAutoRotate(2));
  const fps = await page.evaluate(
    () =>
      new Promise<number>((resolve) => {
        let frames = 0;
        const start = performance.now();
        const step = (): void => {
          frames += 1;
          if (performance.now() - start < 2000) requestAnimationFrame(step);
          else resolve(frames / ((performance.now() - start) / 1000));
        };
        requestAnimationFrame(step);
      }),
  );
  await page.evaluate(() => window.__globe.stopAutoRotate());
  expect(fps).toBeGreaterThan(1);
  expect(errors).toEqual([]);
});

test('right drag keeps the grabbed point under the cursor', async ({ page }) => {
  await openPlayground(page);
  await setCamera(page, { lat: 20, lng: 0, zoom: 2.6, tilt: 0 });
  const box = await canvasBox(page);
  // Off-centre: a centred point would stay put whatever the anchoring did.
  const local = { x: box.width * 0.42, y: box.height * 0.38 };
  const grabbed = await toLatLng(page, local.x, local.y);
  expect(grabbed).not.toBeNull();

  await drag(page, { x: box.x + local.x, y: box.y + local.y }, 0, 60, 'right');
  const held = await toScreen(page, grabbed!);
  const pose = await getCamera(page);
  await page.mouse.up({ button: 'right' });

  expect(held).not.toBeNull();
  expect(Math.hypot(held!.x - local.x, held!.y - local.y)).toBeLessThan(3);
  expect(pose.tilt).toBeGreaterThan(8);
});

test('a hard tilt cannot throw the globe out of position', async ({ page }) => {
  await openPlayground(page);
  await setCamera(page, { lat: 20, lng: 0, zoom: 2.6, tilt: 0 });
  const box = await canvasBox(page);
  await drag(page, { x: box.x + box.width * 0.42, y: box.y + box.height * 0.3 }, 0, 260, 'right');
  await page.mouse.up({ button: 'right' });
  const pose = await getCamera(page);
  expect(pose.tilt).toBeGreaterThan(40);
  expect(Math.abs(pose.lat - 20)).toBeLessThan(25);
  expect(Math.abs(pose.lng)).toBeLessThan(25);
});

test('reset returns the camera to where the globe opened', async ({ page }) => {
  await openPlayground(page);
  await setCamera(page, { lat: -10, lng: 100, zoom: 3.5, tilt: 20 });
  await page.evaluate(() => window.__globe.reset({ animate: false }));
  const pose = await getCamera(page);
  expect(pose.lat).toBeCloseTo(HOME.lat, 3);
  expect(pose.lng).toBeCloseTo(HOME.lng, 3);
  expect(pose.zoom).toBeCloseTo(HOME.zoom, 3);
  expect(pose.tilt).toBeCloseTo(HOME.tilt, 3);
});

test('the reset button is offered only when there is something to undo', async ({ page }) => {
  await openPlayground(page);
  const reset = page.locator('[data-globe-root]').getByRole('button', { name: 'Reset view' });
  await expect(reset).toBeDisabled();
  await page.locator('[data-globe-root]').getByRole('button', { name: 'Zoom in' }).click();
  await page.waitForTimeout(800);
  await expect(reset).toBeEnabled();
  await reset.click();
  await page.waitForTimeout(1500);
  await expect(reset).toBeDisabled();
});

test('defaultCenter is where the globe opens', async ({ page }) => {
  await openPlayground(page);
  const pose = await getCamera(page);
  expect(pose.lat).toBeCloseTo(25, 3);
  expect(pose.lng).toBeCloseTo(8, 3);
});

test('every render style draws a different globe', async ({ page }) => {
  await openPlayground(page);
  const shots: string[] = [];
  for (const style of ['standard', 'realistic', 'cartoon', 'modern']) {
    await select(page, 'renderStyle', style);
    await page.waitForTimeout(2500);
    shots.push(await snapshot(page));
  }
  expect(new Set(shots).size).toBe(4);
});

test('every style compiles its shader without complaint', async ({ page }) => {
  const errors = await openPlayground(page);
  for (const style of ['standard', 'realistic', 'cartoon', 'modern']) {
    await select(page, 'renderStyle', style);
    await page.waitForTimeout(2000);
    // Close enough that the flat styles draw their land mesh too.
    await setCamera(page, { zoom: 2 });
    await page.waitForTimeout(1500);
    await setCamera(page, { zoom: 2.8 });
  }
  expect(errors.filter((e) => /shader|program|glsl/i.test(e))).toEqual([]);
  expect(errors).toEqual([]);
});

test('the graticule and its labels can be turned on', async ({ page }) => {
  await openPlayground(page);
  const label = page.locator('[data-globe-root]').getByText('30°E', { exact: true });
  await expect(label).toHaveCount(0);
  await setToggle(page, 'showGraticule', true);
  await page.waitForTimeout(700);
  await expect(label).toBeVisible();
  await setToggle(page, 'showGraticuleLabels', false);
  await page.waitForTimeout(700);
  await expect(label).toHaveCount(0);
});

test('a design token background reaches WebGL instead of warning', async ({ page }) => {
  const warnings: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'warning') warnings.push(m.text());
  });
  await openPlayground(page);
  await select(page, 'backgroundColor', 'var(--globe-demo-bg)');
  await page.waitForTimeout(800);
  expect(warnings.filter((w) => /THREE\.Color/.test(w))).toEqual([]);
  const box = await canvasBox(page);
  const [r, , b] = await pixelAt(page, box.x + 4, box.y + 4);
  expect(b).toBeGreaterThan(r);
  expect(r).toBeGreaterThan(150);
  expect(r).toBeLessThan(245);
});

test('clouds can be turned off without changing the style', async ({ page }) => {
  await openPlayground(page);
  await select(page, 'renderStyle', 'realistic');
  await page.waitForTimeout(4000);
  const withClouds = await snapshot(page);
  await setToggle(page, 'showClouds (realistic)', false);
  await page.waitForTimeout(1000);
  const withoutClouds = await snapshot(page);
  expect(withoutClouds).not.toBe(withClouds);
});
