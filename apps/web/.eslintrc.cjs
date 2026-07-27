/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: true,
  extends: ["../../packages/config/eslint/react.js"],
  parserOptions: {
    project: "./tsconfig.json",
    tsconfigRootDir: __dirname,
  },
};
