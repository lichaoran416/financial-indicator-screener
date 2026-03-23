import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['/mnt/d/lcrworkspace/projects/stock-analysis-1/tests/**/*.test.{ts,tsx}'],
    environment: 'jsdom',
  },
});