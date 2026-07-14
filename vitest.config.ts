import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['./src/test/setup.ts'],
    exclude: ['e2e/**', 'node_modules/**', 'dist/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/game/**/*.ts', 'src/ui/**/*.tsx'],
      exclude: [
        '**/*.test.*',
        'src/game/scenes/**',
        'src/game/createGame.ts',
        'src/game/model/particle.ts',
      ],
    },
  },
});
