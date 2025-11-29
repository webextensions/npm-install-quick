const js = require('@eslint/js');
const globals = require('globals');

module.exports = [
    {
        ignores: [
            'node_modules-archive/**',
            'npm-install-quick/lib/utils/3rdparty/**'
        ]
    },
    js.configs.recommended,
    {
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
            globals: globals.node
        },
        rules: {
            'indent': ['error', 4, { 'SwitchCase': 1 }],
            'linebreak-style': ['error', 'unix'],
            'no-unused-vars': ['error', {
                caughtErrors: 'none'
            }],
            'semi': ['error', 'always']
        }
    }
];
