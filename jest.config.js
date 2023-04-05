module.exports = {
    preset: 'react-native',
    transform: {
        '^.+\\.jsx$': 'babel-jest',
        '^.+\\.tsx?$': [
            'ts-jest',
            {
                tsconfig: 'tsconfig.spec.json'
            }
        ]
    },
    moduleNameMapper: {
        '^@components(.*)$': '<rootDir>/src/components$1',
        '^@styles(.*)$': '<rootDir>/src/styles$1',
        '^@utils(.*)$': '<rootDir>/src/utils$1',
        '^@assets(.*)$': '<rootDir>/src/assets$1',
    },
    modulePathIgnorePatterns: ['<rootDir>/lib/'],
    moduleFileExtensions: ['ts', 'tsx', 'js'],
    testRegex: '(/__tests__/.*|\\.(test|spec))\\.(ts|tsx|js)$',
    testPathIgnorePatterns: ['<rootDir>/node_modules/'],
    cacheDirectory: './jest/cache',
    transformIgnorePatterns: [
        'node_modules/(?!react-native)/'
    ],
    testEnvironment: 'node',
}
