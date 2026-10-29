import { defineConfig } from '@playwright/test';

// Kein eigenes Chromium auf diesem Mac: installiertes Chrome, headless.
export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  fullyParallel: false,
  reporter: 'list',
  use: { baseURL: 'http://127.0.0.1:4180/', channel: 'chrome', headless: true, viewport: { width: 390, height: 844 } },
  webServer: {
    command: 'npx vite preview --host 127.0.0.1 --port 4180 --strictPort',
    cwd: '.',
    url: 'http://127.0.0.1:4180/',
    reuseExistingServer: false,
    timeout: 30_000,
  },
});
