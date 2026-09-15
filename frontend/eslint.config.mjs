import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Session material must never reach stdout. A bare console.log(session) sat
  // in the DAL guard and printed the auth cookie value and the upstream Bearer
  // token on every protected render; nothing in the toolchain objected.
  //
  // Banned everywhere by default. The two files that legitimately log get a
  // files:-scoped exemption for the ONE channel each of them uses, rather than
  // a global allow-list — a global one left console.error(session) lint-clean
  // in the DAL and its ~30 call sites, which is the same leak wearing a
  // different identifier.
  //
  // This is debug hygiene and it only reaches the identifier, never the data:
  // lib/redact.ts is what actually scrubs credentials at the sink.
  {
    rules: {
      "no-console": "error",
    },
  },
  {
    // The sanctioned logger; its dev branch prints the redacted error.
    files: ["lib/log-error.ts"],
    rules: {
      "no-console": ["error", { allow: ["error"] }],
    },
  },
  {
    // An expected mid-keystroke mermaid parse failure in the editor preview.
    files: ["components/ui/markdown.tsx"],
    rules: {
      "no-console": ["error", { allow: ["debug"] }],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
