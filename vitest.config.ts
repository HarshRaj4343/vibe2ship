import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

// Unit tests target the pure, dependency-free logic in lib/ (points, SLA,
// impact, predictions). These functions back the dashboard, admin board and
// gamification loop, so locking their behaviour down catches regressions in the
// numbers users actually see. Firebase/Next-coupled modules are intentionally
// out of scope here.
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
