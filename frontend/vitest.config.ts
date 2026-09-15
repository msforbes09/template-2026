import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

// Unit tests for the pure seams — spec summarising, dependency detection,
// request building, rate limiting, tool-output parsing. See
// .claude/skills/nextjs-conventions/references/testing.md: test the seams this
// codebase defines, not the framework.
//
// Node environment, no React plugin, no jsdom. Everything covered here is a
// pure function, and @vitejs/plugin-react currently can't be installed anyway:
// it pulls an optional @babel/core@8 peer that conflicts with the @babel/core@7
// shadcn brings in. Component tests would need @vitejs/plugin-react-swc (which
// avoids babel entirely) plus jsdom — add them with the first component test,
// not before.
//
// Vitest is pinned to 3.x: 4.x runs on rolldown, which imports `styleText`
// from node:util and so needs Node >= 20.12. This project builds on 20.10.
export default defineConfig({
  resolve: {
    alias: {
      // Mirrors tsconfig's `"@/*": ["./*"]`. Done by hand rather than with
      // vite-tsconfig-paths, which is ESM-only and can't be require()d from a
      // .ts config while package.json has no "type": "module".
      "@": resolve(__dirname),
      // `server-only` is not a real installed package here — Next aliases it
      // during its own build. Outside that build it doesn't resolve at all, so
      // any module importing it (rate-limit.ts, tools.ts) would fail to load.
      "server-only": resolve(__dirname, "test/stubs/server-only.ts"),
    },
  },
  test: {
    environment: "node",
    include: ["**/*.test.ts"],
    exclude: ["node_modules/**", ".next/**"],
  },
});
