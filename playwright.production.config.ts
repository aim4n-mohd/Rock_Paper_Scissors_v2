import { defineConfig, devices } from '@playwright/test';
import { resolve } from 'node:path';

const previewCommand = `"${process.execPath}" "${resolve('node_modules/vite/bin/vite.js')}" preview --host 127.0.0.1 --port 4174`;
const productionBasePath = process.env.PRODUCTION_BASE_PATH ?? '/';

export default defineConfig({
  testDir: './e2e',
  testMatch: 'production.spec.ts',
  timeout: 30_000,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: `http://127.0.0.1:4174${productionBasePath}`,
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: { command: previewCommand, url: 'http://127.0.0.1:4174', reuseExistingServer: false },
});
