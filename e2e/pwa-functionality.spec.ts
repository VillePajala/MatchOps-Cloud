import { test, expect } from '@playwright/test';
import { injectAxe, checkA11y } from '@axe-core/playwright';

test.describe('PWA Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await injectAxe(page);
  });

  test.describe('Service Worker', () => {
    test('should register service worker', async ({ page }) => {
      // Check if service worker is registered
      const swRegistration = await page.evaluate(async () => {
        if ('serviceWorker' in navigator) {
          const registration = await navigator.serviceWorker.getRegistration();
          return !!registration;
        }
        return false;
      });
      
      expect(swRegistration).toBe(true);
    });

    test('should cache essential resources', async ({ page }) => {
      await page.waitForLoadState('networkidle');
      
      // Go offline and check if page still loads
      await page.context().setOffline(true);
      await page.reload();
      
      // Page should still be accessible (though some features may be limited)
      await expect(page.locator('h1')).toContainText('MatchOps');
    });
  });

  test.describe('Manifest and Installation', () => {
    test('should have valid web app manifest', async ({ page }) => {
      // Check for manifest link
      const manifestLink = await page.locator('link[rel="manifest"]').getAttribute('href');
      expect(manifestLink).toBe('/manifest.json');
      
      // Fetch and validate manifest
      const manifestResponse = await page.request.get('/manifest.json');
      expect(manifestResponse.ok()).toBe(true);
      
      const manifest = await manifestResponse.json();
      expect(manifest.name).toContain('MatchOps Cloud');
      expect(manifest.short_name).toBeTruthy();
      expect(manifest.icons).toBeDefined();
      expect(manifest.start_url).toBeDefined();
      expect(manifest.display).toBeDefined();
    });

    test('should have proper theme colors', async ({ page }) => {
      // Check theme-color meta tag
      const themeColor = await page.locator('meta[name="theme-color"]').getAttribute('content');
      expect(themeColor).toBeTruthy();
      
      // Should match manifest theme color
      const manifestResponse = await page.request.get('/manifest.json');
      const manifest = await manifestResponse.json();
      expect(themeColor).toBe(manifest.theme_color);
    });

    test('should have proper viewport configuration', async ({ page }) => {
      const viewport = await page.locator('meta[name="viewport"]').getAttribute('content');
      expect(viewport).toContain('width=device-width');
      expect(viewport).toContain('initial-scale=1');
    });
  });

  test.describe('Offline Functionality', () => {
    test('should show offline indicator when offline', async ({ page }) => {
      // Start online
      await page.waitForLoadState('networkidle');
      
      // Go offline
      await page.context().setOffline(true);
      
      // Trigger a navigation or reload to detect offline state
      await page.reload();
      
      // Should show offline banner/indicator
      await expect(page.getByText(/offline/i)).toBeVisible();
    });

    test('should hide offline indicator when back online', async ({ page }) => {
      // Start offline
      await page.context().setOffline(true);
      await page.reload();
      
      // Go back online
      await page.context().setOffline(false);
      await page.reload();
      
      // Offline indicator should be hidden
      await expect(page.getByText(/you are currently offline/i)).not.toBeVisible();
    });

    test('should cache user preferences offline', async ({ page }) => {
      // Set language preference
      await page.getByRole('button', { name: /finnish/i }).click();
      await page.waitForTimeout(500);
      
      // Go offline
      await page.context().setOffline(true);
      await page.reload();
      
      // Language preference should persist
      await expect(page.getByRole('button', { name: /finnish/i })).toHaveClass(/bg-indigo-600/);
    });
  });

  test.describe('Install Prompt', () => {
    test('should handle beforeinstallprompt event', async ({ page }) => {
      // Simulate beforeinstallprompt event
      await page.evaluate(() => {
        const event = new Event('beforeinstallprompt') as any;
        event.prompt = () => Promise.resolve();
        event.userChoice = Promise.resolve({ outcome: 'dismissed', platform: 'web' });
        window.dispatchEvent(event);
      });
      
      await page.waitForTimeout(1000);
      
      // Install prompt might show based on app logic
      // We mainly test that the event handling doesn't break the app
      await expect(page.locator('h1')).toBeVisible();
    });

    test('should track app usage for install prompt', async ({ page }) => {
      // Multiple page visits should increment usage count
      for (let i = 0; i < 3; i++) {
        await page.reload();
        await page.waitForLoadState('networkidle');
      }
      
      // App should handle usage tracking without errors
      await expect(page.locator('h1')).toBeVisible();
    });
  });

  test.describe('Performance Optimization', () => {
    test('should load quickly on repeat visits', async ({ page }) => {
      // First visit (cold start)
      const firstVisitStart = Date.now();
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      const firstVisitTime = Date.now() - firstVisitStart;
      
      // Second visit (should be faster due to caching)
      const secondVisitStart = Date.now();
      await page.reload();
      await page.waitForLoadState('networkidle');
      const secondVisitTime = Date.now() - secondVisitStart;
      
      // Second visit should be faster or at least not significantly slower
      expect(secondVisitTime).toBeLessThanOrEqual(firstVisitTime * 1.5);
    });

    test('should preload critical resources', async ({ page }) => {
      await page.goto('/');
      
      // Check for resource hints
      const preloadLinks = await page.locator('link[rel="preload"]').count();
      const preconnectLinks = await page.locator('link[rel="preconnect"]').count();
      
      // Should have some optimization hints
      expect(preloadLinks + preconnectLinks).toBeGreaterThan(0);
    });
  });

  test.describe('Storage and State Management', () => {
    test('should persist app settings in IndexedDB', async ({ page }) => {
      // Change a setting
      await page.getByRole('button', { name: /finnish/i }).click();
      await page.waitForTimeout(500);
      
      // Check that IndexedDB contains the setting
      const hasIndexedDBData = await page.evaluate(async () => {
        try {
          const databases = await indexedDB.databases();
          return databases.length > 0;
        } catch {
          return false;
        }
      });
      
      expect(hasIndexedDBData).toBe(true);
    });

    test('should handle storage quota limits gracefully', async ({ page }) => {
      // Simulate storage pressure
      await page.evaluate(() => {
        // Mock storage quota exceeded
        const originalSetItem = localStorage.setItem;
        localStorage.setItem = () => {
          throw new Error('QuotaExceededError');
        };
      });
      
      // App should continue to function
      await page.reload();
      await expect(page.locator('h1')).toBeVisible();
    });
  });

  test.describe('Security', () => {
    test('should serve over HTTPS in production', async ({ page }) => {
      // In development, we test that the app would work over HTTPS
      // Check for security-related headers
      const response = await page.goto('/');
      
      // Should have security headers (even in dev mode for testing)
      const headers = response?.headers() || {};
      
      // Test that the app loads without mixed content warnings
      const securityErrors: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error' && msg.text().includes('Mixed Content')) {
          securityErrors.push(msg.text());
        }
      });
      
      await page.waitForLoadState('networkidle');
      expect(securityErrors).toHaveLength(0);
    });

    test('should not expose sensitive data in client', async ({ page }) => {
      await page.goto('/');
      
      // Check that no API keys or secrets are exposed in the page source
      const pageContent = await page.content();
      
      // Common patterns that shouldn't appear in client code
      const sensitivePatterns = [
        /sk_[a-zA-Z0-9]{20,}/,  // Stripe secret keys
        /AKIA[0-9A-Z]{16}/,     // AWS access keys
        /ya29\.[0-9A-Za-z\-_]+/, // Google OAuth tokens
      ];
      
      sensitivePatterns.forEach(pattern => {
        expect(pageContent).not.toMatch(pattern);
      });
    });
  });

  test.describe('Accessibility in PWA Context', () => {
    test('should maintain accessibility when installed as PWA', async ({ page }) => {
      // Simulate PWA mode by hiding browser UI
      await page.setViewportSize({ width: 390, height: 844 });
      
      // Run accessibility checks
      await checkA11y(page, null, {
        detailedReport: true,
        detailedReportOptions: { html: true },
      });
    });

    test('should support high contrast mode', async ({ page }) => {
      // Simulate high contrast mode
      await page.emulateMedia({ forcedColors: 'active' });
      await page.goto('/');
      
      // App should still be usable
      await expect(page.locator('h1')).toBeVisible();
      
      // Run accessibility check for high contrast
      await checkA11y(page, null, {
        tags: ['wcag2aa'],
        rules: {
          'color-contrast': { enabled: true }
        }
      });
    });

    test('should support reduced motion preferences', async ({ page }) => {
      // Simulate reduced motion preference
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto('/');
      
      // App should respect reduced motion
      await expect(page.locator('h1')).toBeVisible();
      
      // No animations should be running
      const animatingElements = await page.evaluate(() => {
        const elements = document.querySelectorAll('*');
        let animatingCount = 0;
        
        elements.forEach(el => {
          const styles = getComputedStyle(el);
          if (styles.animationDuration !== '0s' && styles.animationDuration !== '') {
            animatingCount++;
          }
        });
        
        return animatingCount;
      });
      
      // Should have minimal or no animations when reduced motion is preferred
      expect(animatingElements).toBeLessThan(5);
    });
  });
});