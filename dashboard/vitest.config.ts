import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  esbuild:{tsconfigRaw:{compilerOptions:{target:"ES2022"}}},
  resolve: { alias: { '@': path.resolve(__dirname) } },
  test: { include: ['lib/**/*.test.ts'] },
});
