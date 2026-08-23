import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      'dist',
      // Vendored reference codebase — not part of this app's build/lint scope
      'nextera-pos-system-main',
    ],
  },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      // ────────────────────────────────────────────────────────────────
      // LINT POLICY (2026-08-23 cleanup):
      //  * ERRORS = real problems, fixed everywhere (unused vars, empty
      //    blocks, case-declarations, useless escapes, prefer-const…).
      //  * WARNINGS = legacy debt kept visible for STAGED cleanup only:
      //    - no-explicit-any: ~1000 legacy sites; mass re-typing without
      //      a tsc typecheck gate risks silent regressions in a live POS.
      //    - exhaustive-deps: "fixing" changes effect timing/behavior;
      //      each site needs individual review, not automation.
      // ────────────────────────────────────────────────────────────────
      '@typescript-eslint/no-explicit-any': 'warn',
      'react-hooks/exhaustive-deps': 'warn',
      'no-empty': ['error', { allowEmptyCatch: true }],
      '@typescript-eslint/ban-ts-comment': ['error', {
        'ts-ignore': 'allow-with-description',
        'ts-expect-error': 'allow-with-description',
        'ts-nocheck': 'allow-with-description',
        minimumDescriptionLength: 8,
      }],
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          args: 'all',
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
    },
  }
);
