import path from 'node:path';
import { fileURLToPath } from 'node:url';

import eslint from '@eslint/js';
import { defineConfig } from 'eslint/config';
import eslintConfigPrettier from 'eslint-config-prettier';
import eslintPluginImportX from 'eslint-plugin-import-x';
import eslintPluginPrettier from 'eslint-plugin-prettier';
import tseslint from 'typescript-eslint';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig([
  eslint.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,

  // ==========================================================================
  // 1. GLOBAL TYPESCRIPT CONFIGURATION
  // ==========================================================================
  {
    name: 'omnichannel/global-typescript',
    files: ['**/*.{js,mjs,ts}'],
    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: ['api/test/*.ts'],
          defaultProject: 'tsconfig.node.json',
        },
        tsconfigRootDir: __dirname,
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    plugins: {
      'import-x': eslintPluginImportX,
    },
    settings: {
      'import-x/parsers': {
        '@typescript-eslint/parser': ['.ts'],
      },
      'import-x/resolver': {
        typescript: {
          alwaysTryTypes: true,
          noWarnOnMultipleProjects: true,
          project: [
            path.resolve(__dirname, 'tsconfig.json'),
            path.resolve(__dirname, 'tsconfig.node.json'),
            path.resolve(__dirname, 'core/tsconfig.json'),
            path.resolve(__dirname, 'api/tsconfig.json'),
          ],
        },
        node: {
          extensions: ['.js', '.ts'],
        },
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unsafe-assignment': 'error',
      '@typescript-eslint/no-unsafe-member-access': 'error',
      '@typescript-eslint/no-unsafe-call': 'error',
      '@typescript-eslint/no-unsafe-return': 'error',
      '@typescript-eslint/no-unsafe-argument': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/require-await': 'error',
      '@typescript-eslint/return-await': ['error', 'in-try-catch'],
      '@typescript-eslint/no-unnecessary-condition': 'error',
      '@typescript-eslint/prefer-nullish-coalescing': 'error',
      '@typescript-eslint/prefer-optional-chain': 'error',
      '@typescript-eslint/prefer-readonly': 'error',
      '@typescript-eslint/switch-exhaustiveness-check': 'error',
      '@typescript-eslint/restrict-template-expressions': [
        'error',
        {
          allowNumber: true,
          allowBoolean: true,
        },
      ],
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
        },
      ],
      'no-console': ['error', { allow: ['warn', 'error', 'info'] }],
      'no-debugger': 'error',
      'prefer-const': 'error',
      'no-var': 'error',
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      '@typescript-eslint/consistent-type-definitions': ['error', 'interface'],
      '@typescript-eslint/array-type': ['error', { default: 'array-simple' }],
      '@typescript-eslint/consistent-type-imports': [
        'error',
        {
          prefer: 'type-imports',
          disallowTypeAnnotations: false,
          fixStyle: 'separate-type-imports',
        },
      ],
      '@typescript-eslint/consistent-type-exports': [
        'error',
        {
          fixMixedExportsWithInlineTypeSpecifier: true,
        },
      ],
      '@typescript-eslint/no-import-type-side-effects': 'error',
      '@typescript-eslint/ban-ts-comment': 'error',
      '@typescript-eslint/naming-convention': 'off',
      'import-x/no-duplicates': 'error',
      'import-x/no-unresolved': 'error',
      'import-x/no-self-import': 'error',
      'import-x/no-cycle': ['error', { maxDepth: 3 }],
      'import-x/order': 'off',
      'import-x/newline-after-import': 'off',
      'import-x/first': 'off',
      'import-x/no-default-export': 'off',
    },
  },

  // ==========================================================================
  // 2. ROOT CONFIGURATION FILES
  // ==========================================================================
  {
    name: 'omnichannel/root-config-files',
    files: ['*.config.{js,mjs,ts}'],
    languageOptions: {
      globals: {
        process: 'readonly',
      },
    },
    rules: {
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
    },
  },

  // ==========================================================================
  // 3. DOMAIN CORE (@tupynambalucas-dev/omnichannel-core)
  // ==========================================================================
  {
    name: 'omnichannel/domain-core',
    files: ['core/**/*.ts'],
    rules: {
      '@typescript-eslint/explicit-function-return-type': 'error',
      '@typescript-eslint/explicit-module-boundary-types': 'error',
      '@typescript-eslint/strict-boolean-expressions': 'error',
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'fastify',
              message: 'Zero Infrastructure Coupling: core must never import fastify.',
            },
            {
              name: 'pg',
              message: 'Zero Infrastructure Coupling: core must never import pg.',
            },
            {
              name: 'ioredis',
              message: 'Zero Infrastructure Coupling: core must never import ioredis.',
            },
            {
              name: 'bullmq',
              message: 'Zero Infrastructure Coupling: core must never import bullmq.',
            },
            {
              name: 'mongoose',
              message: 'Zero Infrastructure Coupling: core must never import mongoose.',
            },
          ],
          patterns: [
            {
              group: [
                '@fastify/*',
                '@sentry/*',
                'pino*',
                '@tupynambalucas-dev/omnichannel-api',
                '**/api/**',
              ],
              message:
                'Zero Infrastructure Coupling: core must remain runtime-agnostic and never import API or infrastructure packages.',
            },
          ],
        },
      ],
      'no-restricted-properties': [
        'error',
        {
          object: 'process',
          property: 'env',
          message: 'Zero Infrastructure Coupling: core must never access process.env.',
        },
      ],
    },
  },

  // ==========================================================================
  // 4. DOMAIN API (@tupynambalucas-dev/omnichannel-api)
  // ==========================================================================
  {
    name: 'omnichannel/domain-api',
    files: ['api/**/*.ts'],
    rules: {
      '@typescript-eslint/explicit-module-boundary-types': 'error',
      '@typescript-eslint/explicit-function-return-type': [
        'error',
        {
          allowExpressions: true,
          allowTypedFunctionExpressions: true,
          allowHigherOrderFunctions: true,
        },
      ],
      '@typescript-eslint/strict-boolean-expressions': [
        'error',
        {
          allowString: false,
          allowNumber: false,
          allowNullableObject: true,
          allowNullableBoolean: false,
        },
      ],
      '@typescript-eslint/no-misused-promises': [
        'error',
        {
          checksVoidReturn: false,
        },
      ],
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/core/src/**', '../core/**', '../../core/**', '../../../core/**'],
              message:
                'Package Boundary Violation: import from @tupynambalucas-dev/omnichannel-core public entrypoint instead of deep core paths.',
            },
          ],
        },
      ],
      'no-process-env': 'off',
    },
  },

  // ==========================================================================
  // 5. TEST SUITES
  // ==========================================================================
  {
    name: 'omnichannel/test-files',
    files: ['**/*.{test,spec}.ts', '**/__tests__/**/*.ts'],
    rules: {
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-floating-promises': 'off',
      'no-console': 'off',
    },
  },

  // ==========================================================================
  // 6. GLOBAL IGNORES
  // ==========================================================================
  {
    name: 'omnichannel/ignores',
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      '**/build/**',
      '**/coverage/**',
      '**/.turbo/**',
      '**/.eslintcache',
      '**/.agents/**',
      '**/*.json',
      '**/*.d.ts',
    ],
  },

  // ==========================================================================
  // 7. PRETTIER INTEGRATION
  // ==========================================================================
  {
    name: 'omnichannel/prettier',
    plugins: {
      prettier: eslintPluginPrettier,
    },
    rules: {
      'prettier/prettier': ['error', { endOfLine: 'auto' }],
    },
  },
  eslintConfigPrettier,
]);
