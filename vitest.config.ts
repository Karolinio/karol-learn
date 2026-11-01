import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['packages/**/*.test.ts', 'apps/server/**/*.test.ts', 'apps/web/src/**/*.test.ts', 'agents/**/*.test.ts', 'scripts/**/*.test.ts'],
    exclude: ['**/node_modules/**', 'apps/web/e2e/**'],
    // Agenten- und Server-Tests starten tsx-Kindprozesse; parallel unter Last dauert ein Start mehrere Sekunden.
    testTimeout: 30_000,
    coverage: {
      provider: 'v8',
      include: ['packages/karten-kern/src/**/*.ts'],
      exclude: ['**/*.test.ts', '**/index.ts', '**/typen.ts'],
      reporter: ['text-summary', 'text'],
      thresholds: { lines: 80, functions: 80, branches: 80, statements: 80 },
    },
  },
});
