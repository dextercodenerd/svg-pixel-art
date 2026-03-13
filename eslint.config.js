import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import vue from 'eslint-plugin-vue'
import vueParser from 'vue-eslint-parser'
import prettier from 'eslint-config-prettier'

export default [
  // Ignores should be first
  {
    ignores: [
      '**/*',
      '!src/**',
      '!tests/**',

      '**/.pnp.*',
      '**/.yarn/**',
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/coverage/**',
      '**/.output/**',
      '**/*.min.*',
    ],
  },

  js.configs.recommended,

  // TS rules for TS files
  ...tseslint.configs.recommended.map(c => ({
    ...c,
    files: ['src/**/*.{ts,tsx}', 'tests/**/*.{ts,tsx}'],
  })),

  // Vue rules for .vue files
  ...vue.configs['flat/recommended'].map(c => ({
    ...c,
    files: ['src/**/*.vue', 'tests/**/*.vue'],
  })),

  // Parse Vue with TS inside them
  {
    files: ['src/**/*.vue', 'tests/**/*.vue'],
    languageOptions: {
      parser: vueParser,
      parserOptions: {
        parser: tseslint.parser,
        extraFileExtensions: ['.vue'],
      },
    },
  },

  // Disable stylistic rules that conflict with Prettier
  prettier,

  // Final overrides
  {
    files: ['src/**/*.{ts,tsx,js,jsx,vue}', 'tests/**/*.{ts,tsx,js,jsx,vue}'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    rules: {
      curly: ['error', 'all'],
      'vue/multi-word-component-names': 'off',
      'vue/prop-name-casing': 'off',
      'vue/attributes-order': 'off',
      'vue/v-on-style': 'off',
    },
  },
]
