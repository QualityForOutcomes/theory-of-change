export default {
    preset: 'ts-jest',
    testEnvironment: 'node',
    roots: ['<rootDir>/__tests__'],
    testMatch: ['**/__tests__/**/*.test.ts', '**/?(*.)+(spec|test).ts'],
    transform: {
        '^.+\\.ts$': 'ts-jest',
    },
    collectCoverageFrom: [
        'api/**/*.ts',
        'services/**/*.ts',
        'utils/**/*.ts',
        'validators/**/*.ts',
        'middleware/**/*.ts',
        '!**/*.d.ts',
        '!**/__tests__/**',
        '!**/node_modules/**',
    ],
    coverageThreshold: {
        global: {
            branches: 70,
            functions: 70,
            lines: 70,
            statements: 70,
        },
    },
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/$1',
    },
    moduleDirectories: ['node_modules', '<rootDir>'],
    testTimeout: 10000,
};