import {defineConfig} from 'vitest/config';
import path from 'node:path';
export default defineConfig({
  esbuild:{tsconfigRaw:{compilerOptions:{target:"ES2022"}}},resolve:{alias:{'@':path.resolve(__dirname)}},test:{include:['tests/db/**/*.test.ts'],fileParallelism:false,maxWorkers:1,minWorkers:1,testTimeout:20000,hookTimeout:20000}});
