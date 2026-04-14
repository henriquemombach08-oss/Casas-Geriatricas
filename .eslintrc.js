/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: true,
    tsconfigRootDir: __dirname,
  },
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
    'prettier',
  ],
  rules: {
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/consistent-type-imports': 'error',
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    // Express async handlers are passed where void return is expected — false positive
    '@typescript-eslint/no-misused-promises': ['error', { checksVoidReturn: false }],
    // no-require-imports is the preferred successor; no-var-requires is redundant
    '@typescript-eslint/no-var-requires': 'off',
    // req.body is typed as `any` by Express — Zod validates at runtime
    '@typescript-eslint/no-unsafe-assignment': 'warn',
    '@typescript-eslint/no-unsafe-member-access': 'warn',
    '@typescript-eslint/no-unsafe-argument': 'warn',
    '@typescript-eslint/no-unsafe-call': 'warn',
    '@typescript-eslint/no-unsafe-return': 'warn',
  },
  overrides: [
    {
      // Test files are excluded from tsconfig — disable all type-aware rules for them
      files: ['**/__tests__/**/*.ts', '**/*.test.ts', '**/*.spec.ts'],
      extends: ['plugin:@typescript-eslint/disable-type-checked'],
    },
  ],
  ignorePatterns: ['dist/', 'node_modules/', '.next/', 'coverage/'],
};
