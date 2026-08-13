import browser from '@graphytools/eslint-config/browser';

export default [
  { ignores: ['dist/**', 'web/dist/**'] },
  ...browser,
  {
    files: ['server/**/*.ts'],
    rules: {
      'import-x/no-nodejs-modules': 'off',
    },
  },
  {
    files: ['eslint.config.mjs', 'web/vite.config.ts', 'vitest.config.ts'],
    rules: {
      'import-x/no-nodejs-modules': 'off',
      'import-x/no-default-export': 'off',
    },
  },
  {
    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: ['eslint.config.mjs', '*.config.ts', 'vitest.config.ts'],
        },
      },
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
    rules: {
      '@typescript-eslint/no-unnecessary-condition': 'off',
      eqeqeq: ['error', 'always', { null: 'ignore' }],
    },
  },
];
