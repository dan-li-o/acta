import js from "@eslint/js";
import prettier from "eslint-config-prettier";
import importPlugin from "eslint-plugin-import";
import simpleImportSort from "eslint-plugin-simple-import-sort";

export default [
  js.configs.recommended,
  prettier,
  {
    files: ["**/*.ts"],
    languageOptions: {
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module"
      }
    },
    plugins: {
      import: importPlugin,
      "simple-import-sort": simpleImportSort
    },
    rules: {
      "no-console": ["warn", { allow: ["error", "warn", "info"] }],
      "import/no-unresolved": "error",
      "import/order": "off",
      "simple-import-sort/imports": "error",
      "simple-import-sort/exports": "error"
    }
  }
];
