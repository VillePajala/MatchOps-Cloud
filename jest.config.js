import nextJest from 'next/jest.js'; // Use .js extension

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
  dir: './',
});

// Add any custom config to be passed to Jest
/** @type {import('jest').Config} */
const customJestConfig = {
  // Add more setup options before each test is run
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.js', '<rootDir>/src/setupModalTests.ts', '<rootDir>/src/setupFormStoreMocks.ts', '<rootDir>/src/setupAccessibilityTests.ts'],
  
  testEnvironment: 'jest-environment-jsdom',
  testPathIgnorePatterns: ['<rootDir>/e2e/', '<rootDir>/.next/', '<rootDir>/node_modules/'],
  testMatch: ['<rootDir>/src/**/*.(test|spec).{js,jsx,ts,tsx}'],
  moduleNameMapper: {
    '^@/i18n$': '<rootDir>/src/__mocks__/i18n.ts',
    '^@/utils/logger$': '<rootDir>/src/utils/__mocks__/logger.ts',
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@supabase/supabase-js$': '<rootDir>/src/__mocks__/@supabase/supabase-js.ts',
    '^@supabase/ssr$': '<rootDir>/src/__mocks__/@supabase/ssr.ts',
    '^next/headers$': '<rootDir>/src/__mocks__/next/headers.ts',
    '^../lib/supabase$': '<rootDir>/src/__mocks__/lib/supabase.ts',
    '^../../lib/supabase$': '<rootDir>/src/__mocks__/lib/supabase.ts',
    '^i18next$': '<rootDir>/src/__mocks__/i18n.ts',
    '^react-i18next$': '<rootDir>/src/__mocks__/react-i18next.ts',
  },
  testPathIgnorePatterns: [
    '/node_modules/',
    '/.next/',
    '<rootDir>/tests/', // Ignore Playwright specs
  ],
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{js,jsx,ts,tsx}',
    // Exclude debug/test/verification pages from coverage
    '!src/app/debug*/**',
    '!src/app/test*/**',
    '!src/app/check*/**',
    '!src/app/verify*/**',
    '!src/app/fix*/**',
    '!src/app/diagnose*/**',
    '!src/app/cleanup*/**',
    '!src/app/analyze*/**',
    '!src/app/import-backup/**',
    '!src/app/reset-supabase/**',
    '!src/app/refresh-games-cache/**',
    '!src/app/storage-diagnostic/**',
    '!src/app/env-check/**',
    '!src/app/simple-test/**',
    '!src/app/storage-config/**',
    '!src/app/auth-debug/**',
    '!src/app/password-reset-help/**'
  ],
  // Phase 4: Production Quality Gates - Coverage Thresholds
  coverageThreshold: {
    // Global minimum thresholds (Phase 4 requirement: ≥60%)
    global: { 
      statements: 51, // Current: 51.55%, will ratchet to 60%
      lines: 51,      // Current: 52.11%, will ratchet to 60%
      functions: 46,  // Current: 46.79%, will ratchet to 60%
      branches: 44    // Current: 44.08%, will ratchet to 50%
    },
    // Critical modules (Phase 4 requirement: ≥80% lines, ≥90% functions)
    "./src/stores/persistenceStore.ts": { 
      statements: 70, 
      lines: 73,      // Current: 73.19%
      functions: 86,  // Current: 86.58%
      branches: 65 
    },
    "./src/providers/storage/storageManager.ts": { 
      statements: 90, 
      lines: 94,      // Current: 94.17%
      functions: 100, // Current: 100%
      branches: 85 
    },
    "./src/providers/storage/supabaseProvider.ts": { 
      statements: 80, 
      lines: 86,      // Current: 86%
      functions: 96,  // Current: 96.55%
      branches: 75 
    },
    // Store coverage requirements
    "./src/stores/**/*.{ts,tsx}": { 
      statements: 50, 
      lines: 50, 
      functions: 50, 
      branches: 40 
    },
    // Critical component coverage
    "./src/components/HomePage.tsx": { 
      statements: 47, // Current: 47.36%
      lines: 47, 
      functions: 45, 
      branches: 40 
    },
    // Modal coverage requirements
    "./src/components/LoadGameModal.tsx": { 
      statements: 80, 
      lines: 83,      // Current: 83.64%
      functions: 80, 
      branches: 70 
    },
    "./src/components/NewGameSetupModal.tsx": { 
      statements: 70, 
      lines: 71,      // Current: 71.67%
      functions: 70, 
      branches: 65 
    },
    "./src/components/GameSettingsModal.tsx": { 
      statements: 60, 
      lines: 61,      // Current: 61.8%
      functions: 60, 
      branches: 55 
    },
    // UI interaction hotspots (Phase 4 requirement: ≥70%)
    "./src/components/ControlBar.tsx": { 
      statements: 70, 
      lines: 70, 
      functions: 70, 
      branches: 65 
    },
    // Utils directory (already excellent)
    "./src/utils/**/*.{ts,tsx}": { 
      statements: 80, 
      lines: 84,      // Current: 84.94%
      functions: 80, 
      branches: 75 
    }
  },
  // Add transform for ts-jest if needed, but next/jest should handle it
  // transform: {
  //   '^.+\\.(ts|tsx)$?': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.json' }],
  // },
  
  // Coverage reporting
  coverageReporters: ['text-summary', 'html', 'lcov'],
  coverageDirectory: 'coverage',
  
  // Help with async operations cleanup - Week 1 hardening
  testTimeout: 15000,
  detectOpenHandles: true, // Enable to find async leaks
  forceExit: false, // Disable force exit to properly detect issues
};

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
export default createJestConfig(customJestConfig); 
