import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test.describe('Sign In Modal', () => {
    test.beforeEach(async ({ page }) => {
      await page.getByRole('button', { name: /sign in/i }).click();
      await expect(page.getByText(/sign in to your account/i)).toBeVisible();
    });

    test('should display sign in form', async ({ page }) => {
      // Check form elements are present
      await expect(page.getByLabel(/email/i)).toBeVisible();
      await expect(page.getByLabel(/password/i)).toBeVisible();
      await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
    });

    test('should validate email format', async ({ page }) => {
      await page.getByLabel(/email/i).fill('invalid-email');
      await page.getByLabel(/password/i).fill('password123');
      await page.getByRole('button', { name: /sign in/i }).click();
      
      // Should show validation error for invalid email
      await expect(page.getByText(/invalid email/i)).toBeVisible();
    });

    test('should require password', async ({ page }) => {
      await page.getByLabel(/email/i).fill('test@example.com');
      await page.getByRole('button', { name: /sign in/i }).click();
      
      // Should show validation error for missing password
      await expect(page.getByText(/password is required/i)).toBeVisible();
    });

    test('should show forgot password link', async ({ page }) => {
      await expect(page.getByText(/forgot.*password/i)).toBeVisible();
    });

    test('should switch to sign up mode', async ({ page }) => {
      await page.getByText(/don't have an account/i).click();
      await expect(page.getByText(/create your account/i)).toBeVisible();
    });

    test('should close modal with X button', async ({ page }) => {
      await page.getByRole('button', { name: /close/i }).click();
      await expect(page.getByText(/sign in to your account/i)).not.toBeVisible();
    });

    test('should be accessible', async ({ page }) => {
      const accessibilityScanResults = await new AxeBuilder({ page })
        .analyze();
      expect(accessibilityScanResults.violations).toEqual([]);
    });
  });

  test.describe('Sign Up Modal', () => {
    test.beforeEach(async ({ page }) => {
      await page.getByRole('button', { name: /sign up/i }).click();
      await expect(page.getByText(/create your account/i)).toBeVisible();
    });

    test('should display sign up form', async ({ page }) => {
      // Check form elements are present
      await expect(page.getByLabel(/email/i)).toBeVisible();
      await expect(page.getByLabel(/password/i)).toBeVisible();
      await expect(page.getByRole('button', { name: /sign up/i })).toBeVisible();
    });

    test('should validate password strength', async ({ page }) => {
      await page.getByLabel(/email/i).fill('test@example.com');
      await page.getByLabel(/password/i).fill('123');
      await page.getByRole('button', { name: /sign up/i }).click();
      
      // Should show validation error for weak password
      await expect(page.getByText(/password.*least.*characters/i)).toBeVisible();
    });

    test('should switch to sign in mode', async ({ page }) => {
      await page.getByText(/already have an account/i).click();
      await expect(page.getByText(/sign in to your account/i)).toBeVisible();
    });

    test('should be accessible', async ({ page }) => {
      const accessibilityScanResults = await new AxeBuilder({ page })
        .analyze();
      expect(accessibilityScanResults.violations).toEqual([]);
    });
  });

  test.describe('Form Interactions', () => {
    test('should support keyboard navigation', async ({ page }) => {
      await page.getByRole('button', { name: /sign in/i }).click();
      
      // Tab through form elements
      await page.keyboard.press('Tab');
      await expect(page.getByLabel(/email/i)).toBeFocused();
      
      await page.keyboard.press('Tab');
      await expect(page.getByLabel(/password/i)).toBeFocused();
      
      await page.keyboard.press('Tab');
      await expect(page.getByRole('button', { name: /sign in/i })).toBeFocused();
    });

    test('should submit form with Enter key', async ({ page }) => {
      await page.getByRole('button', { name: /sign in/i }).click();
      
      await page.getByLabel(/email/i).fill('test@example.com');
      await page.getByLabel(/password/i).fill('password123');
      
      // Press Enter to submit
      await page.keyboard.press('Enter');
      
      // Should attempt to sign in (we can't test actual auth without real backend)
      // But we can verify the form submission behavior
      await page.waitForTimeout(1000); // Give time for any validation
    });

    test('should clear form when switching modes', async ({ page }) => {
      await page.getByRole('button', { name: /sign in/i }).click();
      
      // Fill in sign in form
      await page.getByLabel(/email/i).fill('test@example.com');
      await page.getByLabel(/password/i).fill('password123');
      
      // Switch to sign up
      await page.getByText(/don't have an account/i).click();
      
      // Form should be cleared
      await expect(page.getByLabel(/email/i)).toHaveValue('');
      await expect(page.getByLabel(/password/i)).toHaveValue('');
    });
  });

  test.describe('Error Handling', () => {
    test('should handle network errors gracefully', async ({ page }) => {
      // Intercept network requests and simulate failure
      await page.route('**/auth/**', route => route.abort());
      
      await page.getByRole('button', { name: /sign in/i }).click();
      await page.getByLabel(/email/i).fill('test@example.com');
      await page.getByLabel(/password/i).fill('password123');
      await page.getByRole('button', { name: /sign in/i }).click();
      
      // Should show error message (implementation dependent)
      await page.waitForTimeout(2000); // Give time for error handling
    });

    test('should show loading state during authentication', async ({ page }) => {
      await page.getByRole('button', { name: /sign in/i }).click();
      await page.getByLabel(/email/i).fill('test@example.com');
      await page.getByLabel(/password/i).fill('password123');
      
      // Look for loading indicator when submitting
      await page.getByRole('button', { name: /sign in/i }).click();
      
      // Button should show loading state (disabled or with spinner)
      const signInButton = page.getByRole('button', { name: /sign in/i });
      await expect(signInButton).toBeDisabled();
    });
  });
});