import { test, expect } from '@playwright/test';
import AxeBuilder from "@axe-core/playwright";

test.describe('Start Screen', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display MatchOps Cloud branding', async ({ page }) => {
    // Check that the app name is correct
    await expect(page.locator('h1')).toContainText('MatchOps');
    await expect(page.locator('h1')).toContainText('Cloud');
    
    // Check tagline
    await expect(page.getByText('Elevate Your Game')).toBeVisible();
  });

  test('should show authentication buttons when not logged in', async ({ page }) => {
    // Should show sign in and sign up buttons
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /sign up/i })).toBeVisible();
  });

  test('should have language switcher', async ({ page }) => {
    // Check language buttons are present
    await expect(page.getByRole('button', { name: /english/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /finnish/i })).toBeVisible();
  });

  test('should switch languages', async ({ page }) => {
    // Click Finnish language button
    await page.getByRole('button', { name: /finnish/i }).click();
    
    // Wait for language change (the button should become active)
    await expect(page.getByRole('button', { name: /finnish/i })).toHaveClass(/bg-indigo-600/);
    
    // Switch back to English
    await page.getByRole('button', { name: /english/i }).click();
    await expect(page.getByRole('button', { name: /english/i })).toHaveClass(/bg-indigo-600/);
  });

  test('should open sign in modal', async ({ page }) => {
    await page.getByRole('button', { name: /sign in/i }).click();
    
    // Check modal is open (look for modal content)
    await expect(page.getByText(/sign in to your account/i)).toBeVisible();
  });

  test('should open sign up modal', async ({ page }) => {
    await page.getByRole('button', { name: /sign up/i }).click();
    
    // Check modal is open (look for modal content)
    await expect(page.getByText(/create your account/i)).toBeVisible();
  });

  test('should close auth modal with escape key', async ({ page }) => {
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page.getByText(/sign in to your account/i)).toBeVisible();
    
    // Press escape to close
    await page.keyboard.press('Escape');
    await expect(page.getByText(/sign in to your account/i)).not.toBeVisible();
  });

  test('should be accessible', async ({ page }) => {
    const accessibilityScanResults = await new AxeBuilder({ page })
      .analyze();
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should have proper viewport meta tag for mobile', async ({ page }) => {
    const viewportMeta = await page.locator('meta[name="viewport"]').getAttribute('content');
    expect(viewportMeta).toContain('width=device-width');
    expect(viewportMeta).toContain('initial-scale=1');
  });

  test('should load without JavaScript errors', async ({ page }) => {
    const errors: string[] = [];
    
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    page.on('pageerror', (error) => {
      errors.push(error.message);
    });
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Filter out known harmless errors (like network errors in dev)
    const criticalErrors = errors.filter(error => 
      !error.includes('Failed to load resource') &&
      !error.includes('net::ERR_') &&
      !error.includes('favicon.ico')
    );
    
    expect(criticalErrors).toHaveLength(0);
  });

  test('should work on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE size
    await page.goto('/');
    
    // Check that UI elements are still visible and functional on mobile
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /sign up/i })).toBeVisible();
  });

  test('should maintain state after page refresh', async ({ page }) => {
    // Change to Finnish
    await page.getByRole('button', { name: /finnish/i }).click();
    await expect(page.getByRole('button', { name: /finnish/i })).toHaveClass(/bg-indigo-600/);
    
    // Refresh the page
    await page.reload();
    
    // Language should be preserved
    await expect(page.getByRole('button', { name: /finnish/i })).toHaveClass(/bg-indigo-600/);
  });
});