export default {
    verbose: true,
    rootDir: './',
    clearMocks: true,
    testEnvironment: 'node',

    testMatch: [
        '**/tests/**/*.test.ts',
        '**/?(*.)+(spec|test).ts',
    ],

    testPathIgnorePatterns: [
        '/node_modules/',
        '/dist/',
        '/docs/',
    ],

    collectCoverage: true,
    collectCoverageFrom: [
        'src/**/*.{ts,tsx}',
        '!**/node_modules/**',
        '!**/dist/**',
        '!**/coverage/**',
    ],
    coverageDirectory: '<rootDir>/coverage',
    coverageReporters: ['json', 'lcov', 'text', 'clover', 'html', 'json-summary'],

    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],

    preset: 'ts-jest/presets/default',

    transform: {
        '^.+\\.tsx?$': [
            'ts-jest',
            {
                tsconfig: './tsconfig.test.json',
            },
        ],
    },

    watchman: true,
    cacheDirectory: '<rootDir>/.jest/cache',
    resetMocks: true,
    restoreMocks: true,
    slowTestThreshold: 5,
    maxWorkers: '50%',
};
