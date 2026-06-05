import { resolve } from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(import.meta.dirname, './src'),
    },
  },
  test: {
    ui: !process.env.CI,
    globals: false,
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    // Tests share one Postgres DB and truncate it between cases via resetDb().
    // Running files in parallel (separate workers, same DB) would let one file's
    // reset wipe another's rows mid-run, so force fully sequential execution.
    fileParallelism: false,
    include: [
      'src/**/*.test.ts',
      'tests/unit/**/*.test.ts',
      'tests/integration/**/*.test.ts',
    ],
    exclude: ['tests/e2e/**', 'node_modules/**', '.next/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/lib/**', 'src/services/**', 'src/app/api/**/service.ts'],
    },
  },
})
