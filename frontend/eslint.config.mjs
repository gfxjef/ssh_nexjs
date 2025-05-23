import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      // Permitir tipos any temporalmente
      "@typescript-eslint/no-explicit-any": "warn",
      // Permitir variables no utilizadas como warning
      "@typescript-eslint/no-unused-vars": "warn",
      // Permitir @ts-ignore
      "@typescript-eslint/ban-ts-comment": "warn",
      // Permitir caracteres no escapados en JSX
      "react/no-unescaped-entities": "warn",
      // Permitir var
      "no-var": "warn",
      // Permitir preferir const
      "prefer-const": "warn",
      // Permitir interfaces vacías
      "@typescript-eslint/no-empty-object-type": "warn",
      // Warnings para hooks de React
      "react-hooks/exhaustive-deps": "warn",
    }
  }
];

export default eslintConfig;
