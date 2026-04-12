import js from "@eslint/js";

export default [
  js.configs.recommended,
  {
    rules: {
      "no-unused-vars": "error",
      "no-unreachable": "error",
      "no-console": "warn",
      "consistent-return": "error",
      "eqeqeq": "error",
      "no-var": "error"
    }
  },
  {
    // SW registration uses console intentionally
    files: ["sw.js"],
    rules: {
      "no-console": "off"
    }
  }
];
