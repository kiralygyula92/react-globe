/** Unit tests: pure logic under jsdom. Anything needing a real GPU is end-to-end. */

import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: { __DEV__: 'true' },
  test: { environment: 'jsdom', include: ['src/**/*.spec.{ts,tsx}'], globals: true },
});
