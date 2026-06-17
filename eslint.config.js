import js from '@eslint/js';
import globals from 'globals';

/**
 * Flat ESLint config.
 * - public/js  → browser ES modules
 * - server.js / test → Node ES modules (with global fetch)
 */
export default [
  js.configs.recommended,
  {
    languageOptions: { ecmaVersion: 2023, sourceType: 'module' },
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'no-var': 'error',
      'prefer-const': 'error',
      eqeqeq: ['error', 'smart'],
    },
  },
  {
    files: ['public/js/**/*.js'],
    languageOptions: { globals: { ...globals.browser } },
  },
  {
    files: ['server.js', 'test/**/*.js', 'eslint.config.js'],
    languageOptions: { globals: { ...globals.node, fetch: 'readonly' } },
  },
];
