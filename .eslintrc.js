module.exports = {
  root: true,
  env: {
    browser: true,
    node: true,
    es6: true,
  },
  extends: [
    'eslint:recommended',
    'prettier',
    'plugin:jest/recommended',
    'plugin:import/recommended',
    'plugin:compat/recommended',
  ],
  plugins: ['prettier', 'jest', 'import'],
  parser: '@babel/eslint-parser',
  parserOptions: { sourceType: 'module', ecmaVersion: 2019, ecmaFeatures: { modules: true } },
  rules: {
    'prettier/prettier': ['error'],
    'no-console': ['error'],
    'import/no-unresolved': ['error', { commonjs: true, amd: true }],
    'import/no-cycle': ['error', { maxDepth: 1 }],
    'import/no-extraneous-dependencies': [
      'error',
      {
        devDependencies: true,
        optionalDependencies: false,
        peerDependencies: false,
      },
    ],
    'no-duplicate-imports': ['error'],
    'no-param-reassign': ['off'],
    'no-unused-vars': ['error', { vars: 'all', args: 'after-used', ignoreRestSiblings: true }],
  },
  settings: {
    polyfills: ['Promise', 'WeakMap', 'fetch'],
  },
}
