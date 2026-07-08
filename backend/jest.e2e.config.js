/** @type {import('jest').Config} */
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.*\\.e2e-spec\\.ts$',
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        tsconfig: {
          allowJs: false,
        },
      },
    ],
  },
  transformIgnorePatterns: ['/node_modules/', '/shared/dist/'],
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@agroerp/prisma-bpms-client$':
      '<rootDir>/node_modules/@agroerp/prisma-bpms-client',
    '^@agroerp/prisma-eip-client$':
      '<rootDir>/node_modules/@agroerp/prisma-eip-client',
    '^@agroerp/prisma-eint-client$':
      '<rootDir>/node_modules/@agroerp/prisma-eint-client',
    '^@agroerp/prisma-eops-client$':
      '<rootDir>/node_modules/@agroerp/prisma-eops-client',
    '^@agroerp/prisma-eatp-client$':
      '<rootDir>/node_modules/@agroerp/prisma-eatp-client',
    '^@agroerp/prisma-eapp-client$':
      '<rootDir>/node_modules/@agroerp/prisma-eapp-client',
    '^@agroerp/prisma-eiwp-client$':
      '<rootDir>/node_modules/@agroerp/prisma-eiwp-client',
    '^@agroerp/prisma-ephp-client$':
      '<rootDir>/node_modules/@agroerp/prisma-ephp-client',
    '^@agroerp/prisma-eatr-client$':
      '<rootDir>/node_modules/@agroerp/prisma-eatr-client',
    '^@agroerp/prisma-eacc-client$':
      '<rootDir>/node_modules/@agroerp/prisma-eacc-client',
    '^@agroerp/prisma-effm-client$':
      '<rootDir>/node_modules/@agroerp/prisma-effm-client',
    '^@agroerp/prisma-eaip-client$':
      '<rootDir>/node_modules/@agroerp/prisma-eaip-client',
    '^@agroerp/prisma-eace-client$':
      '<rootDir>/node_modules/@agroerp/prisma-eace-client',
  },
  setupFiles: ['<rootDir>/prisma/jest-e2e.setup.ts'],
  testTimeout: 180000,
};
