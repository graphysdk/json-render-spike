import browser from '@graphytools/eslint-config/browser';
import graphy from '@graphytools/eslint-plugin-graphy';

// eslint-disable-next-line import-x/no-default-export
export default [
  {
    ignores: ['dist/**', 'lib/**', '.build/**', 'node_modules/**', 'turbo/**', '.rollup.cache/**'],
  },
  ...browser,
  {
    plugins: {
      '@graphytools/graphy': graphy,
    },
    rules: {
      '@graphytools/graphy/no-js-import-extension': 'error',
      '@graphytools/graphy/perfect-order': 'error',
    },
  },
];
