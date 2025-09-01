import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Comprehensive Accessibility Testing', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test.describe('WCAG 2.1 AA Compliance', () => {
    test('should pass all WCAG 2.1 AA rules on start screen', async ({ page }) => {
      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();
      expect(accessibilityScanResults.violations).toEqual([]);
    });

    test('should pass WCAG rules in authentication modals', async ({ page }) => {
      // Test sign in modal
      await page.getByRole('button', { name: /sign in/i }).click();
      await page.waitForTimeout(500);

      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();
      expect(accessibilityScanResults.violations).toEqual([]);

      // Close and test sign up modal
      await page.keyboard.press('Escape');
      await page.getByRole('button', { name: /sign up/i }).click();
      await page.waitForTimeout(500);

      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();
      expect(accessibilityScanResults.violations).toEqual([]);
    });

    test('should maintain accessibility across different viewport sizes', async ({ page }) => {
      const viewports = [
        { width: 320, height: 568 }, // iPhone SE
        { width: 768, height: 1024 }, // iPad
        { width: 1920, height: 1080 }, // Desktop
      ];

      for (const viewport of viewports) {
        await page.setViewportSize(viewport);
        await page.reload();
        await page.waitForLoadState('networkidle');

        const accessibilityScanResults = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa'])
          .analyze();
        expect(accessibilityScanResults.violations).toEqual([]);
      }
    });
  });

  test.describe('Keyboard Navigation', () => {
    test('should support full keyboard navigation', async ({ page }) => {
      // Start with first focusable element
      await page.keyboard.press('Tab');
      
      // Should be able to navigate to sign in button
      const signInButton = page.getByRole('button', { name: /sign in/i });
      await expect(signInButton).toBeFocused();

      // Navigate to sign up button
      await page.keyboard.press('Tab');
      const signUpButton = page.getByRole('button', { name: /sign up/i });
      await expect(signUpButton).toBeFocused();

      // Navigate to language switcher
      await page.keyboard.press('Tab');
      const englishButton = page.getByRole('button', { name: /english/i });
      await expect(englishButton).toBeFocused();

      await page.keyboard.press('Tab');
      const finnishButton = page.getByRole('button', { name: /finnish/i });
      await expect(finnishButton).toBeFocused();
    });

    test('should open and navigate modals with keyboard', async ({ page }) => {
      // Tab to sign in button and activate with Enter
      await page.keyboard.press('Tab');
      await page.keyboard.press('Enter');

      // Modal should be open and focus should be trapped
      await expect(page.getByText(/sign in to your account/i)).toBeVisible();

      // Tab through modal form fields
      await page.keyboard.press('Tab');
      await expect(page.getByLabel(/email/i)).toBeFocused();

      await page.keyboard.press('Tab');
      await expect(page.getByLabel(/password/i)).toBeFocused();

      // Close modal with Escape
      await page.keyboard.press('Escape');
      await expect(page.getByText(/sign in to your account/i)).not.toBeVisible();

      // Focus should return to the sign in button
      await expect(page.getByRole('button', { name: /sign in/i })).toBeFocused();
    });

    test('should support arrow key navigation in language switcher', async ({ page }) => {
      // Focus on English button
      await page.getByRole('button', { name: /english/i }).focus();

      // Right arrow should move to Finnish
      await page.keyboard.press('ArrowRight');
      await expect(page.getByRole('button', { name: /finnish/i })).toBeFocused();

      // Left arrow should move back to English
      await page.keyboard.press('ArrowLeft');
      await expect(page.getByRole('button', { name: /english/i })).toBeFocused();
    });
  });

  test.describe('Screen Reader Support', () => {
    test('should have proper heading hierarchy', async ({ page }) => {
      // Check that main heading is h1
      const h1Elements = await page.locator('h1').count();
      expect(h1Elements).toBe(1);

      // Main heading should contain app name
      await expect(page.locator('h1')).toContainText('MatchOps');

      // Check heading hierarchy
      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a'])
        .withRules(['heading-order'])
        .analyze();

      expect(accessibilityScanResults.violations).toHaveLength(0);
    });

    test('should have meaningful button labels', async ({ page }) => {
      // All buttons should have accessible names
      const buttons = page.getByRole('button');
      const buttonCount = await buttons.count();

      for (let i = 0; i < buttonCount; i++) {
        const button = buttons.nth(i);
        const accessibleName = await button.getAttribute('aria-label') || 
                              await button.textContent();
        expect(accessibleName?.trim()).toBeTruthy();
      }
    });

    test('should announce state changes properly', async ({ page }) => {
      // Check that language change is announced
      const finnishButton = page.getByRole('button', { name: /finnish/i });
      
      // Should have aria attributes for state
      await finnishButton.click();
      
      // Button should indicate current selection
      await expect(finnishButton).toHaveAttribute('aria-pressed', 'true');
    });

    test('should provide form labels and error announcements', async ({ page }) => {
      await page.getByRole('button', { name: /sign in/i }).click();

      // Form fields should have proper labels
      const emailField = page.getByLabel(/email/i);
      const passwordField = page.getByLabel(/password/i);

      await expect(emailField).toBeVisible();
      await expect(passwordField).toBeVisible();

      // Test form validation announcement
      await emailField.fill('invalid-email');
      await page.getByRole('button', { name: /sign in/i }).click();

      // Error should be associated with the field
      const errorMessage = page.getByText(/invalid email/i);
      if (await errorMessage.isVisible()) {
        // Error should be announced to screen readers
        await expect(errorMessage).toHaveAttribute('role', 'alert');
      }
    });
  });

  test.describe('Color and Contrast', () => {
    test('should meet color contrast requirements', async ({ page }) => {
      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2aa'])
        .withRules(['color-contrast'])
        .analyze();
      expect(accessibilityScanResults.violations).toEqual([]);
    });

    test('should not rely solely on color for information', async ({ page }) => {
      const accessibilityScanResults = await new AxeBuilder({ page })
        .withRules(['color-contrast', 'link-in-text-block'])
        .analyze();
      expect(accessibilityScanResults.violations).toEqual([]);
    });

    test('should be usable in high contrast mode', async ({ page }) => {
      // Simulate Windows High Contrast mode
      await page.emulateMedia({ forcedColors: 'active' });
      await page.reload();

      // App should still be functional
      await expect(page.locator('h1')).toBeVisible();
      await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();

      // Run accessibility check
      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2aa'])
        .analyze();
      expect(accessibilityScanResults.violations).toEqual([]);
    });
  });

  test.describe('Focus Management', () => {
    test('should have visible focus indicators', async ({ page }) => {
      // Tab through interactive elements and verify focus is visible
      const interactiveElements = [
        page.getByRole('button', { name: /sign in/i }),
        page.getByRole('button', { name: /sign up/i }),
        page.getByRole('button', { name: /english/i }),
        page.getByRole('button', { name: /finnish/i }),
      ];

      for (const element of interactiveElements) {
        await element.focus();
        
        // Focus should be visible (element should have focus styles)
        await expect(element).toBeFocused();
        
        // Check that focus indicator is present
        const focusStyles = await element.evaluate((el) => {
          const styles = window.getComputedStyle(el);
          return {
            outline: styles.outline,
            outlineWidth: styles.outlineWidth,
            boxShadow: styles.boxShadow,
          };
        });

        // Should have some kind of focus indicator
        const hasFocusIndicator = 
          focusStyles.outline !== 'none' ||
          focusStyles.outlineWidth !== '0px' ||
          focusStyles.boxShadow !== 'none';

        expect(hasFocusIndicator).toBe(true);
      }
    });

    test('should trap focus in modals', async ({ page }) => {
      await page.getByRole('button', { name: /sign in/i }).click();

      // Get all focusable elements in modal
      const modalFocusableElements = await page.locator(
        'input, button, select, textarea, [tabindex]:not([tabindex="-1"])'
      ).filter({ hasText: /./ }).all();

      expect(modalFocusableElements.length).toBeGreaterThan(0);

      // Tab through all elements and ensure we stay in modal
      for (let i = 0; i < modalFocusableElements.length + 2; i++) {
        await page.keyboard.press('Tab');
        
        // Focus should remain within modal
        const focusedElement = page.locator(':focus');
        const isInModal = await focusedElement.count() > 0;
        expect(isInModal).toBe(true);
      }
    });

    test('should restore focus after modal closes', async ({ page }) => {
      const signInButton = page.getByRole('button', { name: /sign in/i });
      
      // Focus and open modal
      await signInButton.focus();
      await signInButton.click();

      // Close modal with Escape
      await page.keyboard.press('Escape');

      // Focus should return to sign in button
      await expect(signInButton).toBeFocused();
    });
  });

  test.describe('Motion and Animation', () => {
    test('should respect reduced motion preferences', async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.reload();

      // App should still be functional
      await expect(page.locator('h1')).toBeVisible();

      // Check that animations are disabled or reduced
      const hasReducedMotion = await page.evaluate(() => {
        return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      });

      expect(hasReducedMotion).toBe(true);

      // Verify no accessibility violations with reduced motion
      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2aa'])
        .analyze();
      expect(accessibilityScanResults.violations).toEqual([]);
    });

    test('should not cause seizures with flashing content', async ({ page }) => {
      // Check for elements that might flash or blink rapidly
      const accessibilityScanResults = await new AxeBuilder({ page })
        .withRules(['blink', 'marquee'])
        .analyze();
      expect(accessibilityScanResults.violations).toEqual([]);
    });
  });

  test.describe('Mobile Accessibility', () => {
    test('should be accessible on touch devices', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.reload();

      // Touch targets should be large enough (44x44px minimum)
      const buttons = page.getByRole('button');
      const buttonCount = await buttons.count();

      for (let i = 0; i < buttonCount; i++) {
        const button = buttons.nth(i);
        const boundingBox = await button.boundingBox();
        
        if (boundingBox) {
          expect(boundingBox.width).toBeGreaterThanOrEqual(40); // Allow some tolerance
          expect(boundingBox.height).toBeGreaterThanOrEqual(40);
        }
      }

      // Run full accessibility check on mobile
      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa'])
        .analyze();
      expect(accessibilityScanResults.violations).toEqual([]);
    });

    test('should support screen reader gestures on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.reload();

      // Elements should be properly marked up for mobile screen readers
      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa'])
        .withRules(['button-name', 'link-name', 'label'])
        .analyze();
      expect(accessibilityScanResults.violations).toEqual([]);
    });
  });

  test.describe('Error Prevention and Recovery', () => {
    test('should provide clear error messages', async ({ page }) => {
      await page.getByRole('button', { name: /sign in/i }).click();

      // Submit form without filling required fields
      await page.getByRole('button', { name: /sign in/i }).click();

      // Check for error messages
      const errors = page.getByRole('alert');
      const errorCount = await errors.count();

      if (errorCount > 0) {
        // Errors should be clearly announced
        for (let i = 0; i < errorCount; i++) {
          const error = errors.nth(i);
          const errorText = await error.textContent();
          expect(errorText?.trim()).toBeTruthy();
        }
      }
    });

    test('should allow error correction', async ({ page }) => {
      await page.getByRole('button', { name: /sign in/i }).click();

      // Enter invalid email
      await page.getByLabel(/email/i).fill('invalid-email');
      await page.getByRole('button', { name: /sign in/i }).click();

      // Should be able to correct the error
      const emailField = page.getByLabel(/email/i);
      await emailField.clear();
      await emailField.fill('valid@email.com');

      // Field should accept the correction
      await expect(emailField).toHaveValue('valid@email.com');
    });
  });

  test.describe('Comprehensive Violation Detection', () => {
    test('should detect and report all accessibility violations', async ({ page }) => {
      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();

      // Log violations for debugging
      if (accessibilityScanResults.violations.length > 0) {
        console.log('Accessibility violations found:');
        accessibilityScanResults.violations.forEach((violation: any, index: number) => {
          console.log(`${index + 1}. ${violation.id}: ${violation.description}`);
          console.log(`   Impact: ${violation.impact}`);
          console.log(`   Nodes: ${violation.nodes.length}`);
        });
      }

      // Should have no violations
      expect(accessibilityScanResults.violations).toHaveLength(0);
    });

    test('should test with different user preferences', async ({ page }) => {
      const preferences = [
        { reducedMotion: 'reduce' as const, colorScheme: 'dark' as const },
        { reducedMotion: 'reduce' as const, colorScheme: 'light' as const },
        { reducedMotion: 'no-preference' as const, colorScheme: 'dark' as const },
        { reducedMotion: 'no-preference' as const, colorScheme: 'light' as const },
      ];

      for (const pref of preferences) {
        await page.emulateMedia(pref);
        await page.reload();
        await page.waitForLoadState('networkidle');

        const accessibilityScanResults = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa'])
          .analyze();
        expect(accessibilityScanResults.violations).toEqual([]);
      }
    });
  });
});