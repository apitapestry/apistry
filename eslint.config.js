export default [
    {
        linterOptions: {
            reportUnusedDisableDirectives: false
        }
    },
    {
        ignores: [
            'dist/**',
            'node_modules/**',
            'docs-site/**'
        ]
    },
    {
        files: ['**/*.js', '**/*.mjs'],
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
            globals: {
                Buffer: 'readonly',
                console: 'readonly',
                clearTimeout: 'readonly',
                process: 'readonly',
                setTimeout: 'readonly',
                URL: 'readonly'
            }
        }
    }
];
