/**
 * @type {import('@stryker-mutator/api/core').PartialStrykerOptions}
 */
export default {
  packageManager: 'npm',
  reporters: ['html', 'clear-text', 'progress'],
  testRunner: 'jest',
  coverageAnalysis: 'perTest',
  
  // Skip TypeScript checking to avoid complex type errors
  checkers: [],
  disableTypeChecks: '{src,e2e}/**/*.{js,ts,tsx}',
  
  // Target only stores for focused mutation testing
  mutate: [
    'src/stores/**/*.ts',
    '!src/**/*.test.ts',
    '!src/**/*.test.tsx',
    '!src/**/__tests__/**',
    '!src/**/__mocks__/**'
  ],
  
  // Jest configuration
  jest: {
    projectType: 'custom',
    configFile: 'jest.config.js',
    enableFindRelatedTests: true
  },
  
  // Timeout configuration
  timeoutMS: 120000,
  timeoutFactor: 2,
  dryRunTimeoutMinutes: 10,
  
  // Performance optimization
  concurrency: 2,
  
  // Ignore patterns
  ignorePatterns: [
    'coverage/**',
    'dist/**',
    'build/**',
    '.next/**',
    'node_modules/**',
    'e2e/**',
    'scripts/**',
    'docs/**',
    'supabase/**',
    'public/**'
  ],
  
  // Mutation scoring
  thresholds: {
    high: 85,
    low: 75,
    break: 70
  },
  
  // Plugin configuration
  plugins: [
    '@stryker-mutator/jest-runner'
  ],
  
  // Logging
  logLevel: 'info',
  
  // HTML report configuration
  htmlReporter: {
    fileName: 'reports/mutation/mutation-report.html'
  },
  
  // Incremental testing
  incremental: false
};