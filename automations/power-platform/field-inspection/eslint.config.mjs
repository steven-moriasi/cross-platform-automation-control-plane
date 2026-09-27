import eslint from "@eslint/js";

export default [
  {
    files: ["scripts/**/*.js", "test/**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      globals: {
        __dirname: "readonly",
        console: "readonly",
        module: "readonly",
        process: "readonly",
        require: "readonly",
        structuredClone: "readonly",
      },
      sourceType: "commonjs",
    },
    rules: eslint.configs.recommended.rules,
  },
];
