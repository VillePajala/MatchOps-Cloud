# End-to-End Testing Setup Guide

## Overview

MatchOps Cloud uses Playwright for comprehensive E2E testing across multiple browsers and devices. This document covers setup, configuration, and best practices for running and maintaining E2E tests.

## Test Structure

### Core Test Suites

1. **accessibility.spec.ts** - WCAG 2.1 AA compliance testing
2. **auth-flow.spec.ts** - Authentication workflows and validation  
3. **game-workflow.spec.ts** - Core game functionality and user flows
4. **pwa-functionality.spec.ts** - PWA features, service worker, offline functionality
5. **smoke-test.spec.ts** - Critical path validation and error detection
6. **start-screen.spec.ts** - Landing page functionality and branding
7. **visual-regression.spec.ts** - UI consistency across browsers

### Browser Coverage

- **Chromium**: Desktop Chrome functionality
- **Firefox**: Desktop Firefox cross-browser validation
- **WebKit**: Safari/WebKit engine testing
- **Mobile Chrome**: Android mobile experience
- **Mobile Safari**: iOS mobile experience

## Installation & Setup

### System Dependencies

For WSL/Linux environments, install Playwright browser dependencies:

```bash
# Option 1: Automatic installation
sudo npx playwright install-deps

# Option 2: Manual package installation
sudo apt-get install libnspr4 libnss3 libasound2t64
```

### Browser Installation

```bash
# Install Playwright browsers
npx playwright install

# Install specific browsers only
npx playwright install chromium firefox webkit
```

## Configuration

### Playwright Config (`playwright.config.ts`)

Key configuration features:
- **Cross-browser testing**: 5 browser/device combinations
- **Parallel execution**: Optimized for CI/CD performance
- **Video/Screenshot capture**: On failure for debugging
- **Development server**: Automatic startup with port handling
- **Retry logic**: 2 retries on CI, 0 locally for fast feedback

### Base URL Configuration

Tests automatically adapt to available ports:
- Development: `http://localhost:3000` (or next available port)
- CI: Configured via webServer in playwright.config.ts

## Running Tests

### Local Development

```bash
# Run all E2E tests
npm run test:e2e

# Run with UI mode for debugging
npm run test:e2e:ui

# Run specific test file
npx playwright test e2e/smoke-test.spec.ts

# Run headed mode (see browser)
npm run test:e2e:headed

# Debug mode with step-through
npm run test:e2e:debug
```

### CI/Production

```bash
# CI-optimized run
npx playwright test --reporter=github

# Generate HTML report
npm run test:e2e:report
```

## Test Categories

### 1. Accessibility Testing

**File**: `accessibility.spec.ts`  
**Coverage**: WCAG 2.1 AA compliance, screen reader support, keyboard navigation

Key features:
- Automated axe-core integration
- Focus management validation
- Color contrast verification
- Mobile accessibility testing
- Keyboard navigation patterns

### 2. Authentication Flows

**File**: `auth-flow.spec.ts`  
**Coverage**: Sign in/up modals, form validation, session management

Test scenarios:
- Modal opening/closing
- Form validation errors
- Email/password requirements
- Keyboard navigation
- Error message accessibility

### 3. Game Workflow Testing

**File**: `game-workflow.spec.ts`  
**Coverage**: Core game functionality, offline/online transitions

Critical paths:
- Game creation workflows
- Offline functionality
- URL parameter handling
- Performance benchmarks
- Error boundary testing

### 4. PWA Functionality

**File**: `pwa-functionality.spec.ts`  
**Coverage**: Service worker, manifest, install prompts, caching

PWA features:
- Service worker registration
- Offline caching validation
- Install prompt handling
- Storage quota management
- Security headers verification

### 5. Smoke Testing

**File**: `smoke-test.spec.ts`  
**Coverage**: Critical path validation, full user journeys

Full scenarios:
- Complete signup → game creation → save workflow
- Offline/online state transitions
- Keyboard accessibility validation
- Console error detection

### 6. Visual Regression

**File**: `visual-regression.spec.ts`  
**Coverage**: UI consistency across browsers and viewports

Screenshot testing:
- Multiple viewport sizes (mobile, tablet, desktop)
- Dark/light mode variations
- Interactive states (hover, focus, active)
- Cross-browser consistency validation
- Loading and error states

## Mutation Testing

### Stryker Configuration

Mutation testing validates that our tests actually catch bugs by introducing small code changes (mutations) and verifying tests fail appropriately.

**Configuration**: `stryker.conf.mjs`

```bash
# Run mutation testing on stores
npm run test:mutation:stores

# Run on utilities
npm run test:mutation:utils

# Full mutation test suite
npm run test:mutation
```

### Mutation Testing Scope

**Targeted files**:
- Core stores (gameStore, persistenceStore, uiStore)
- Critical utilities (validation, state management)
- Business logic functions

**Exclusions**:
- Test files
- Configuration files
- Translation files
- Build scripts

## Best Practices

### Test Organization

1. **Descriptive test names**: Clear intent and expected behavior
2. **Logical grouping**: Related tests in describe blocks
3. **Setup/teardown**: Use beforeEach for common setup
4. **Page object patterns**: Reusable selectors and actions

### Selector Strategy

```typescript
// Prefer semantic selectors
page.getByRole('button', { name: /sign in/i })
page.getByLabel(/email/i)

// Use data-testid for complex elements
page.getByTestId('game-timer')

// Avoid brittle CSS selectors when possible
```

### Assertion Patterns

```typescript
// Wait for elements to be ready
await expect(page.locator('h1')).toBeVisible()

// Use meaningful timeouts
await page.waitForLoadState('networkidle')

// Test accessibility
await checkA11y(page, null, { tags: ['wcag2aa'] })
```

### Error Handling

```typescript
// Capture errors for debugging
const errors: string[] = []
page.on('console', (msg) => {
  if (msg.type() === 'error') {
    errors.push(msg.text())
  }
})

// Filter expected errors
const criticalErrors = errors.filter(error => 
  !error.includes('favicon') && 
  !error.includes('WebGL')
)
```

## CI Integration

### GitHub Actions

E2E tests run automatically on:
- Pull requests to main branch
- Push to main branch
- Manual workflow dispatch

**Parallel execution**: Tests run across multiple workers for speed

**Artifact collection**:
- Test reports (HTML format)
- Screenshots on failure
- Video recordings for debugging

### Quality Gates

E2E test failures block:
- Pull request merging
- Production deployments
- Release tagging

## Troubleshooting

### Common Issues

1. **Browser dependencies missing**
   ```bash
   sudo npx playwright install-deps
   ```

2. **Port conflicts**
   - Playwright automatically finds available ports
   - Check webServer configuration in playwright.config.ts

3. **Test timeouts**
   - Increase timeout in test configuration
   - Use `page.waitForLoadState('networkidle')` for slow pages

4. **Flaky tests**
   - Add proper wait conditions
   - Use `expect().toPass()` for retry logic
   - Review timing-sensitive assertions

### Debug Mode

```bash
# Run specific test with debug info
npx playwright test --debug --headed e2e/smoke-test.spec.ts

# Verbose logging
npx playwright test --trace on
```

## Performance Optimization

### Test Execution Speed

- **Parallel workers**: Configured based on CI vs local environment
- **Selective running**: Target specific test files during development
- **Browser reuse**: Playwright optimizes browser instance management

### CI Optimization

- **Shard execution**: Split tests across multiple runners
- **Selective testing**: Run only affected tests when possible
- **Caching**: Browser binaries cached between runs

## Future Enhancements

### Planned Improvements

1. **Visual diff baselines**: Automated screenshot baseline management
2. **Performance monitoring**: Automated Web Vitals tracking in CI
3. **Cross-device testing**: Extended mobile device coverage
4. **API testing integration**: Backend API validation alongside E2E
5. **Load testing**: Automated performance regression detection

### Monitoring Integration

- **Test result tracking**: Historical test performance data
- **Flaky test detection**: Automatic identification of unreliable tests
- **Coverage correlation**: E2E coverage mapped to feature usage analytics