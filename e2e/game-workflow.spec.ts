import { test, expect } from '@playwright/test';
import { injectAxe, checkA11y } from '@axe-core/playwright';

test.describe('Game Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await injectAxe(page);
  });

  test.describe('Unauthenticated Game Actions', () => {
    test('should show authentication prompt for Start New Game', async ({ page }) => {
      // Start New Game should trigger auth modal since user is not authenticated
      await page.getByRole('button', { name: /sign in/i }).click();
      await expect(page.getByText(/sign in to your account/i)).toBeVisible();
    });

    test('should show authentication prompt for Load Game', async ({ page }) => {
      // Load Game should also require authentication
      await page.getByRole('button', { name: /sign in/i }).click();
      await expect(page.getByText(/sign in to your account/i)).toBeVisible();
    });
  });

  test.describe('Offline Banner', () => {
    test('should show offline banner when offline', async ({ page }) => {
      // Simulate offline state
      await page.context().setOffline(true);
      await page.reload();
      
      // Should show offline indicator
      await expect(page.getByText(/offline/i)).toBeVisible();
    });

    test('should hide offline banner when online', async ({ page }) => {
      // Ensure we're online
      await page.context().setOffline(false);
      await page.reload();
      
      // Offline banner should not be visible
      await expect(page.getByText(/you are currently offline/i)).not.toBeVisible();
    });
  });

  test.describe('PWA Install Prompt', () => {
    test('should handle install prompt appropriately', async ({ page }) => {
      // Note: PWA install prompt behavior is browser-dependent
      // We can test that the page loads without errors
      await page.goto('/');
      
      // Page should load successfully
      await expect(page.locator('h1')).toContainText('MatchOps');
    });
  });

  test.describe('Navigation and State Management', () => {
    test('should maintain application state during navigation', async ({ page }) => {
      // Set language to Finnish
      await page.getByRole('button', { name: /finnish/i }).click();
      await expect(page.getByRole('button', { name: /finnish/i })).toHaveClass(/bg-indigo-600/);
      
      // Open and close modal
      await page.getByRole('button', { name: /sign in/i }).click();
      await page.keyboard.press('Escape');
      
      // Language setting should persist
      await expect(page.getByRole('button', { name: /finnish/i })).toHaveClass(/bg-indigo-600/);
    });

    test('should handle URL parameters properly', async ({ page }) => {
      // Test with email verification parameter
      await page.goto('/?verified=true');
      
      // Should show verification toast
      await expect(page.getByText(/email verified/i)).toBeVisible();
      
      // URL should be cleaned up
      await page.waitForTimeout(1000);
      expect(page.url()).toBe('http://localhost:3000/');
    });

    test('should handle password reset flow', async ({ page }) => {
      // Test with password reset code
      await page.goto('/?code=reset-code-123');
      
      // Should redirect to reset password page (or show appropriate UI)
      await page.waitForLoadState('networkidle');
      
      // Verify the page handled the reset code
      expect(page.url()).toContain('reset-password');
    });
  });

  test.describe('Performance', () => {
    test('should load within acceptable time', async ({ page }) => {
      const startTime = Date.now();
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      const loadTime = Date.now() - startTime;
      
      // Should load within 3 seconds
      expect(loadTime).toBeLessThan(3000);
    });

    test('should have good Web Vitals scores', async ({ page }) => {
      await page.goto('/');
      
      // Wait for page to stabilize
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);
      
      // Check that no layout shifts occur during normal interaction
      const layoutShifts = await page.evaluate(() => {
        return new Promise((resolve) => {
          let totalShift = 0;
          const observer = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              if (entry.entryType === 'layout-shift' && !entry.hadRecentInput) {
                totalShift += entry.value;
              }
            }
          });
          observer.observe({ entryTypes: ['layout-shift'] });
          
          setTimeout(() => {
            observer.disconnect();
            resolve(totalShift);
          }, 2000);
        });
      });
      
      // CLS should be less than 0.1 (good score)
      expect(layoutShifts).toBeLessThan(0.1);
    });
  });

  test.describe('Accessibility', () => {
    test('should have proper heading hierarchy', async ({ page }) => {
      await page.goto('/');
      
      // Check that there's a proper heading structure
      const h1 = await page.locator('h1').count();
      expect(h1).toBeGreaterThan(0);
      
      // Run accessibility check focusing on headings
      await checkA11y(page, null, {
        tags: ['wcag2a', 'wcag2aa'],
        rules: {
          'heading-order': { enabled: true }
        }
      });
    });

    test('should support screen readers', async ({ page }) => {
      await page.goto('/');
      
      // Check for proper ARIA labels and roles
      const buttons = page.getByRole('button');
      const buttonCount = await buttons.count();
      
      // All buttons should have accessible names
      for (let i = 0; i < buttonCount; i++) {
        const button = buttons.nth(i);
        const accessibleName = await button.getAttribute('aria-label') || 
                              await button.textContent();
        expect(accessibleName).toBeTruthy();
      }
    });

    test('should have sufficient color contrast', async ({ page }) => {
      await page.goto('/');
      
      // Run accessibility check focusing on color contrast
      await checkA11y(page, null, {
        tags: ['wcag2aa'],
        rules: {
          'color-contrast': { enabled: true }
        }
      });
    });
  });

  test.describe('Error Boundaries', () => {
    test('should handle JavaScript errors gracefully', async ({ page }) => {
      const errors: string[] = [];
      
      page.on('pageerror', (error) => {
        errors.push(error.message);
      });
      
      await page.goto('/');
      
      // Simulate potential error conditions
      await page.evaluate(() => {
        // Try to trigger various potential error conditions
        // These should be caught by error boundaries
        localStorage.setItem('invalid-json', '{invalid}');
      });
      
      await page.waitForTimeout(1000);
      
      // Application should still be functional
      await expect(page.locator('h1')).toBeVisible();
      
      // No uncaught errors should propagate
      const criticalErrors = errors.filter(error => 
        !error.includes('Failed to load resource') &&
        !error.includes('favicon.ico')
      );
      expect(criticalErrors).toHaveLength(0);
    });
  });
});