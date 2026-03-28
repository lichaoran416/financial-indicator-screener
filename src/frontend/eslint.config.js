import js from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
import solid from 'eslint-plugin-solid';

export default [
  js.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        document: 'readonly',
        console: 'readonly',
        window: 'readonly',
        Event: 'readonly',
        HTMLInputElement: 'readonly',
        KeyboardEvent: 'readonly',
        InputEvent: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
      solid,
    },
    rules: {
      'no-unused-vars': 'warn',
      'no-console': 'warn',
      ...solid.configs.recommended.rules,
      ...tseslint.configs.recommended.rules,
    },
  },
  {
    ignores: ['node_modules/**', 'dist/**'],
  },
];