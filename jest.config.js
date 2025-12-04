module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  modulePaths: ['<rootDir>/src'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  verbose: true,
};
