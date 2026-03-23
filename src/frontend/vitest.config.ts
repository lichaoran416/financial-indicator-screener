import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

const testsRoot = resolve(__dirname, './tests').replace(/\\/g, '/');

export default defineConfig({
  test: {
    include: [`${testsRoot}/**/*.test.{ts,tsx}`],
    environment: 'jsdom',
    setupFiles: [`${testsRoot}/setup.ts`],
  },
});