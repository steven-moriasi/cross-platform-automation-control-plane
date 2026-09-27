import eslint from "@eslint/js";

const nodeGlobals = {
  module: "readonly",
  process: "readonly",
  require: "readonly",
};

export default [
  {
    files: ["index.js", "src/**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      globals: nodeGlobals,
      sourceType: "commonjs",
    },
    rules: eslint.configs.recommended.rules,
  },
  {
    files: ["test/**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      globals: {
        ...nodeGlobals,
        afterEach: "readonly",
        describe: "readonly",
        expect: "readonly",
        it: "readonly",
      },
      sourceType: "commonjs",
    },
    rules: eslint.configs.recommended.rules,
  },
];
