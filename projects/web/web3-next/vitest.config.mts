import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    environment: "jsdom", // per-file override via `// @vitest-environment node`
    setupFiles: ["./vitest.setup.ts"],
    include: ["__tests__/**/*.test.{ts,tsx}"],
    // Phase 1 ships zero test files by design (RED tests land in later PRs).
    // Vitest exits 1 on an empty match set unless this is set — without it,
    // `npm test` would fail on a clean tooling-only install with no tests yet.
    passWithNoTests: true,
  },
});
