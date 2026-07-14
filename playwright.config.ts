import { defineConfig, devices } from '@playwright/test';
import { resolve } from 'node:path';

const viteCommand = `"${process.execPath}" "${resolve('node_modules/vite/bin/vite.js')}" --mode test --host 127.0.0.1 --port 4173`;

export default defineConfig({
  testDir: './e2e',
  testIgnore: 'production.spec.ts',
  timeout: 30_000,
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: viteCommand,
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
  },
});
