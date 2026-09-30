import { defineConfig } from 'vitest/config';
import { config } from 'dotenv';
config({ path: '.env.test', override: true });
if (!process.env.DATABASE_URL?.includes('/taskflow_test'))
  throw new Error('Integration tests require an isolated taskflow_test database in .env.test');
process.env.NODE_ENV = 'test';
export default defineConfig({
  test: {
    include: ['tests/integration/**/*.test.ts'],
    environment: 'node',
    fileParallelism: false,
    testTimeout: 20000,
    hookTimeout: 30000,
  },
});
