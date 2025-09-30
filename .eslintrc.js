module.exports = {
  env: {
    browser: true,
    es2021: true,
    jest: true,
  },
  extends: [
    "airbnb",
    "plugin:import/typescript",
    "plugin:@typescript-eslint/recommended",
    // Make sure this is always the last configuration in the extends array.
    "prettier",
  ],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaFeatures: {
      jsx: true,
    },
    ecmaVersion: "latest",
    sourceType: "module",
  },
  plugins: ["@typescript-eslint"],
  rules: {
    "no-unused-vars": "off", // this rule is incompatible with typescript-eslint's 'no-unused-vars
    "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    "@typescript-eslint/no-empty-function": "off",
    "@typescript-eslint/no-explicit-any": "off",
    "no-shadow": "off", // disable base rule for TypeScript
    "@typescript-eslint/no-shadow": ["error"],
    "import/prefer-default-export": "off",
    "import/extensions": [
      "error",
      "ignorePackages",
      {
        ts: "never",
        tsx: "never",
      },
    ],
    "no-underscore-dangle": ["error", { allowAfterThis: true }],
  },
  overrides: [
    {
      files: ["*.test.ts", "*.test.tsx"],
      rules: {
        "import/no-extraneous-dependencies": "off",
      },
    },
  ],
};
