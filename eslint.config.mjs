import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // React Compiler advisory: flags the SSR-safe pattern of hydrating client
      // state from localStorage inside a mount effect (cart + notifications bell),
      // which is intentional here. Keep it visible as a warning, not an error.
      "react-hooks/set-state-in-effect": "warn"
    }
  },
  globalIgnores([".next/**", "out/**", "build/**", "reference-site/**", "next-env.d.ts"])
]);

export default eslintConfig;
