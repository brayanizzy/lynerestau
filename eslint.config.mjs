import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/build/**",
      "**/.expo/**",
      "**/.tmp/**",
      "**/generated/**",
      "apps/mobile/**",
      "packages/ui/src/tokens.css",
      "database/**",
      "docs/**",
      "services/api/scripts/*.mjs",
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
  {
    files: ["website/scripts/*.cjs", "services/api/deploy/*.{cjs,mjs}"],
    languageOptions: {
      globals: {
        require: "readonly",
        __dirname: "readonly",
        process: "readonly",
        console: "readonly",
        URL: "readonly",
      },
    },
    // Standalone Node helpers deliberately use CommonJS for NODE_PATH tooling.
    rules: { "@typescript-eslint/no-require-imports": "off" },
  },
  {
    files: ["website/scripts/verify.cjs"],
    languageOptions: {
      globals: {
        document: "readonly",
        getComputedStyle: "readonly",
        scrollTo: "readonly",
        innerWidth: "readonly",
      },
    },
  },
);
