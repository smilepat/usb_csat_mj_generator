/**
 * Jest 설정 파일
 */

module.exports = {
  // 테스트 환경
  testEnvironment: 'node',

  // 루트 디렉토리
  rootDir: '..',

  // 테스트 파일 패턴
  testMatch: [
    '**/tests/**/*.test.js',
    '**/tests/**/*.spec.js'
  ],

  // 무시할 경로
  testPathIgnorePatterns: [
    '/node_modules/',
    '/client/'
  ],

  // 커버리지 설정
  collectCoverageFrom: [
    'services/**/*.js',
    'middleware/**/*.js',
    'repositories/**/*.js',
    'routes/**/*.js',
    '!**/node_modules/**'
  ],

  // 커버리지 디렉토리
  coverageDirectory: 'tests/coverage',

  // 커버리지 리포터
  coverageReporters: ['text', 'lcov', 'html'],

  // 설정 파일
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],

  // 타임아웃
  testTimeout: 10000,

  // 상세 출력
  verbose: true
};
