import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';

// Flat config: base JS rules + TypeScript overrides
export default [
  js.configs.recommended,
  // global rule adjustments - reduce strictness to warnings for now
  {
    rules: {
      'no-unused-vars': 'warn',
    },
  },
  {
    ignores: ['dist'],
  },
  // Node/server files
  {
    files: ['server/**', 'server/**/*.js', 'server/**/*.mjs'],
    languageOptions: {
      globals: { ...globals.node, process: 'readonly', console: 'readonly' },
      parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
    },
    rules: {
      'no-undef': 'off',
    },
  },
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: { ecmaVersion: 2020, sourceType: 'module' },
      globals: { ...globals.browser, ...globals.node, React: 'readonly', process: 'readonly', console: 'readonly' },
    },
    plugins: { '@typescript-eslint': tseslint, 'react-hooks': reactHooks, 'react-refresh': reactRefresh },
    rules: {
      // bring in recommended rules from the TS plugin
      ...tseslint.configs?.recommended?.rules,
      ...reactHooks.configs?.recommended?.rules,
      // relax a few rules to reduce noise while we fix code incrementally
  '@typescript-eslint/no-explicit-any': 'warn',
  // Use the TS-aware rule and turn off the base rule to avoid duplicate reports.
  '@typescript-eslint/no-unused-vars': ['warn', { varsIgnorePattern: '^_', argsIgnorePattern: '^_', args: 'after-used' }],
  'no-unused-vars': 'off',
      'no-undef': 'off',
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },
  // Deno-specific overrides for edge functions in supabase folder
  {
    files: ['supabase/functions/**'],
    languageOptions: {
      globals: { Deno: 'readonly' },
    },
    rules: {
      // allow some leeway in function code
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
];
