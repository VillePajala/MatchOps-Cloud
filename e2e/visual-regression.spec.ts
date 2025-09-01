import { test, expect } from '@playwright/test';

test.describe('Visual Regression Tests', () => {
  test.describe('Start Screen Layouts', () => {
    test('should match start screen on desktop', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      // Wait for animations to complete
      await page.waitForTimeout(1000);
      
      // Take screenshot of full page
      await expect(page).toHaveScreenshot('start-screen-desktop.png', {
        fullPage: true,
        animations: 'disabled',
      });
    });

    test('should match start screen on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      // Wait for animations to complete
      await page.waitForTimeout(1000);
      
      // Take screenshot of full page
      await expect(page).toHaveScreenshot('start-screen-mobile.png', {
        fullPage: true,
        animations: 'disabled',
      });
    });

    test('should match start screen on tablet', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      // Wait for animations to complete
      await page.waitForTimeout(1000);
      
      // Take screenshot of full page
      await expect(page).toHaveScreenshot('start-screen-tablet.png', {
        fullPage: true,
        animations: 'disabled',
      });
    });
  });

  test.describe('Authentication Modals', () => {
    test('should match sign in modal', async ({ page }) => {
      await page.goto('/');
      await page.getByRole('button', { name: /sign in/i }).click();
      
      // Wait for modal animation
      await page.waitForTimeout(500);
      
      // Take screenshot of the modal
      const modal = page.locator('[role="dialog"]').or(page.locator('.modal')).or(page.getByText(/sign in to your account/i).locator('..'));
      await expect(modal).toHaveScreenshot('sign-in-modal.png', {
        animations: 'disabled',
      });
    });

    test('should match sign up modal', async ({ page }) => {
      await page.goto('/');
      await page.getByRole('button', { name: /sign up/i }).click();
      
      // Wait for modal animation
      await page.waitForTimeout(500);
      
      // Take screenshot of the modal
      const modal = page.locator('[role="dialog"]').or(page.locator('.modal')).or(page.getByText(/create your account/i).locator('..'));
      await expect(modal).toHaveScreenshot('sign-up-modal.png', {
        animations: 'disabled',
      });
    });
  });

  test.describe('Language Switching', () => {
    test('should match Finnish language layout', async ({ page }) => {
      await page.goto('/');
      
      // Switch to Finnish
      await page.getByRole('button', { name: /finnish/i }).click();
      await page.waitForTimeout(1000); // Wait for language to load
      
      // Take screenshot
      await expect(page).toHaveScreenshot('start-screen-finnish.png', {
        fullPage: true,
        animations: 'disabled',
      });
    });

    test('should match language switcher component', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      // Screenshot just the language switcher
      const languageSwitcher = page.locator('div').filter({ hasText: /EN.*FI/ }).last();
      await expect(languageSwitcher).toHaveScreenshot('language-switcher.png', {
        animations: 'disabled',
      });
    });
  });

  test.describe('Dark Mode Support', () => {
    test('should handle system dark mode preference', async ({ page }) => {
      // Set system to dark mode
      await page.emulateMedia({ colorScheme: 'dark' });
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      // Wait for theme to apply
      await page.waitForTimeout(1000);
      
      // Take screenshot
      await expect(page).toHaveScreenshot('start-screen-dark-mode.png', {
        fullPage: true,
        animations: 'disabled',
      });
    });

    test('should handle system light mode preference', async ({ page }) => {
      // Set system to light mode
      await page.emulateMedia({ colorScheme: 'light' });
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      // Wait for theme to apply
      await page.waitForTimeout(1000);
      
      // Take screenshot
      await expect(page).toHaveScreenshot('start-screen-light-mode.png', {
        fullPage: true,
        animations: 'disabled',
      });
    });
  });

  test.describe('Interactive States', () => {
    test('should match button hover states', async ({ page }) => {
      await page.goto('/');
      
      // Hover over sign in button
      const signInButton = page.getByRole('button', { name: /sign in/i });
      await signInButton.hover();
      
      // Take screenshot of hovered button
      await expect(signInButton).toHaveScreenshot('sign-in-button-hover.png', {
        animations: 'disabled',
      });
    });

    test('should match button focus states', async ({ page }) => {
      await page.goto('/');
      
      // Focus on sign in button using keyboard
      await page.keyboard.press('Tab');
      const signInButton = page.getByRole('button', { name: /sign in/i });
      
      // Take screenshot of focused button
      await expect(signInButton).toHaveScreenshot('sign-in-button-focus.png', {
        animations: 'disabled',
      });
    });

    test('should match language button active state', async ({ page }) => {
      await page.goto('/');
      
      // Click Finnish button to make it active
      await page.getByRole('button', { name: /finnish/i }).click();
      await page.waitForTimeout(500);
      
      // Screenshot the language switcher with Finnish active
      const languageSwitcher = page.locator('div').filter({ hasText: /EN.*FI/ }).last();
      await expect(languageSwitcher).toHaveScreenshot('language-switcher-finnish-active.png', {
        animations: 'disabled',
      });
    });
  });

  test.describe('Loading States', () => {
    test('should match page loading state', async ({ page }) => {
      // Intercept requests to simulate slow loading
      await page.route('**/*', route => {
        setTimeout(() => route.continue(), 100);
      });
      
      await page.goto('/');
      
      // Take screenshot during initial load
      await page.waitForTimeout(200);
      await expect(page).toHaveScreenshot('start-screen-loading.png', {
        animations: 'disabled',
      });
    });
  });

  test.describe('Error States', () => {
    test('should match offline banner', async ({ page }) => {
      await page.goto('/');
      
      // Set offline and reload to trigger offline banner
      await page.context().setOffline(true);
      await page.reload();
      
      // Wait for offline state to be detected
      await page.waitForTimeout(1000);
      
      // Take screenshot showing offline banner
      await expect(page).toHaveScreenshot('start-screen-offline.png', {
        fullPage: true,
        animations: 'disabled',
      });
    });
  });

  test.describe('Cross-browser Consistency', () => {
    ['chromium', 'firefox', 'webkit'].forEach(browserName => {
      test(`should render consistently in ${browserName}`, async ({ page, browserName: currentBrowser }) => {
        // Only run this specific test for the matching browser
        test.skip(currentBrowser !== browserName, `Skipping ${browserName} test in ${currentBrowser}`);
        
        await page.goto('/');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000);
        
        // Take screenshot for cross-browser comparison
        await expect(page).toHaveScreenshot(`start-screen-${browserName}.png`, {
          fullPage: true,
          animations: 'disabled',
          threshold: 0.3, // Allow for minor browser differences
        });
      });
    });
  });
});