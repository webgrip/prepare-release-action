import { defineConfig, globalIgnores } from 'eslint/config';
import typescriptEslint from '@typescript-eslint/eslint-plugin';
import stylistic from '@stylistic/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import js from '@eslint/js';
import { FlatCompat } from '@eslint/eslintrc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all,
});

export default defineConfig([globalIgnores(['**/node_modules/*', '**/dist/*', '**/docs/*']), {
    extends: compat.extends('eslint:recommended', 'plugin:@typescript-eslint/recommended'),

    plugins: {
        '@typescript-eslint': typescriptEslint,
        '@stylistic': stylistic,
    },

    languageOptions: {
        parser: tsParser,
        ecmaVersion: 'latest',
        sourceType: 'module',

        parserOptions: {
            ecmaFeatures: {
                jsx: true,
            },
        },
    },

    rules: {
        '@stylistic/indent': ['error', 4],

        '@stylistic/quotes': ['error', 'single', {
            avoidEscape: true,
        }],

        '@stylistic/semi': ['error', 'always'],
        '@stylistic/linebreak-style': ['error', 'unix'],
        '@stylistic/comma-dangle': ['error', 'always-multiline'],
        '@stylistic/object-curly-spacing': ['error', 'always'],
        '@stylistic/array-bracket-spacing': ['error', 'never'],
        '@stylistic/no-trailing-spaces': 'error',
        '@stylistic/space-before-blocks': 'error',

        '@stylistic/keyword-spacing': ['error', {
            before: true,
            after: true,
        }],

        '@stylistic/space-infix-ops': 'error',

        '@stylistic/no-multiple-empty-lines': ['error', {
            max: 1,
            maxEOF: 0,
        }],

        'prefer-const': 'error',
        eqeqeq: ['error', 'always'],
        'no-var': 'error',
        'arrow-parens': ['error', 'always'],

        'no-unused-vars': ['error', {
            vars: 'all',
            args: 'after-used',
            ignoreRestSiblings: true,
        }],

        'no-debugger': 'error',
        'no-alert': 'warn',
    },
}]);
