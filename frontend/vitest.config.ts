import { resolve } from "node:path";
import react from "@vitejs/plugin-react-swc";
import { defineConfig } from "vitest/config";

// Unit tests (*.test.ts) run in node; component tests (*.test.tsx) run in
// jsdom. See .claude/skills/nextjs-conventions/references/testing.md: test
// the seams this codebase defines, not the framework.
//
// @vitejs/plugin-react-swc rather than @vitejs/plugin-react: the latter pulls
// an optional @babel/core@8 peer that conflicts with the @babel/core@7 shadcn
// brings in; the SWC plugin avoids babel entirely.
//
// Vitest is pinned to 3.x: 4.x runs on rolldown, which imports `styleText`
// from node:util and so needs Node >= 20.12.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Mirrors tsconfig's `"@/*": ["./*"]`. Done by hand rather than with
      // vite-tsconfig-paths, which is ESM-only and can't be require()d from a
      // .ts config while package.json has no "type": "module".
      "@": resolve(__dirname),
      // `server-only` is not a real installed package here — Next aliases it
      // during its own build. Outside that build it doesn't resolve at all, so
      // any module importing it (lib/rate-limit.ts) would fail to load.
      "server-only": resolve(__dirname, "test/stubs/server-only.ts"),
    },
  },
  test: {
    environment: "node",
    environmentMatchGlobs: [["**/*.test.tsx", "jsdom"]],
    include: ["**/*.test.{ts,tsx}"],
    exclude: ["node_modules/**", ".next/**"],
    setupFiles: ["./vitest.setup.ts"],
  },
});
