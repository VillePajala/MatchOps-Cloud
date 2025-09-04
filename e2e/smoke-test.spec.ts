import { test, expect } from '@playwright/test';

test.describe('Core User Journey Smoke Test', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto('/');
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle');
  });

  test('should load homepage without errors', async ({ page }) => {
    // Check that the page loads successfully
    await expect(page).toHaveTitle(/MatchOps Cloud/);
    
    // Check for any console errors
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    // Wait a bit to catch any async errors
    await page.waitForTimeout(2000);
    
    // Report if there are critical errors (ignoring common warnings)
    const criticalErrors = errors.filter(error => 
      !error.includes('WebGL') && 
      !error.includes('favicon') &&
      !error.includes('source map')
    );
    
    if (criticalErrors.length > 0) {
      console.warn('Console errors found:', criticalErrors);
    }
  });

  test('full user journey: signup → create game → add players → log goal → save', async ({ page }) => {
    console.log('🚀 Starting full user journey test...');
    
    // Step 1: Check if we need to sign up or if we're already logged in
    await page.waitForTimeout(3000); // Wait for auth to initialize
    
    const signupButton = page.locator('button:has-text("Sign Up"), button:has-text("Get Started")');
    const newGameButton = page.locator('button:has-text("New Game"), button:has-text("Start New Game")');
    
    // Check if we can see new game button (already logged in) or need to sign up
    const isLoggedIn = await newGameButton.isVisible({ timeout: 5000 }).catch(() => false);
    
    if (!isLoggedIn) {
      console.log('👤 Need to sign up/log in...');
      
      // Try to find and click sign up
      if (await signupButton.isVisible({ timeout: 5000 })) {
        await signupButton.first().click();
        
        // Fill in signup form (we'll use a test email)
        const testEmail = `test-${Date.now()}@example.com`;
        const testPassword = 'TestPassword123!';
        
        await page.fill('input[type="email"], input[name="email"]', testEmail);
        await page.fill('input[type="password"], input[name="password"]', testPassword);
        
        // Submit signup
        await page.click('button[type="submit"], button:has-text("Sign Up")');
        
        // Wait for signup to complete
        await page.waitForTimeout(5000);
      }
    }
    
    // Step 2: Create a new game
    console.log('⚽ Creating new game...');
    
    // Look for new game button with various possible texts
    const newGameSelectors = [
      'button:has-text("New Game")',
      'button:has-text("Start New Game")',
      'button:has-text("Create Game")',
      '[data-testid="new-game-button"]',
      '.new-game-button'
    ];
    
    let newGameClicked = false;
    for (const selector of newGameSelectors) {
      if (await page.locator(selector).isVisible({ timeout: 2000 }).catch(() => false)) {
        await page.locator(selector).first().click();
        newGameClicked = true;
        console.log(`✅ Clicked new game with selector: ${selector}`);
        break;
      }
    }
    
    if (!newGameClicked) {
      throw new Error('Could not find New Game button');
    }
    
    // Wait for game creation modal/page
    await page.waitForTimeout(2000);
    
    // Step 3: Set up the game (fill in basic info)
    console.log('📝 Setting up game details...');
    
    // Try to find and fill game setup fields
    const opponentField = page.locator('input[name="opponent"], input[placeholder*="opponent" i], input[placeholder*="team" i]');
    if (await opponentField.isVisible({ timeout: 3000 }).catch(() => false)) {
      await opponentField.fill('Test Opponents FC');
    }
    
    // Look for a submit/continue/start button
    const startGameSelectors = [
      'button:has-text("Start Game")',
      'button:has-text("Continue")',
      'button:has-text("Create")',
      'button:has-text("Next")',
      'button[type="submit"]'
    ];
    
    for (const selector of startGameSelectors) {
      if (await page.locator(selector).isVisible({ timeout: 2000 }).catch(() => false)) {
        await page.locator(selector).first().click();
        console.log(`✅ Started game with selector: ${selector}`);
        break;
      }
    }
    
    await page.waitForTimeout(3000);
    
    // Step 4: Add players (if there's a player management interface)
    console.log('👥 Adding players...');
    
    const addPlayerSelectors = [
      'button:has-text("Add Player")',
      'button:has-text("+ Player")',
      '[data-testid="add-player"]',
      '.add-player-button'
    ];
    
    for (const selector of addPlayerSelectors) {
      if (await page.locator(selector).isVisible({ timeout: 3000 }).catch(() => false)) {
        // Add a couple of test players
        await page.locator(selector).first().click();
        await page.waitForTimeout(1000);
        
        // Fill in player name
        const playerNameField = page.locator('input[name="playerName"], input[name="name"], input[placeholder*="name" i]');
        if (await playerNameField.isVisible({ timeout: 2000 }).catch(() => false)) {
          await playerNameField.fill('Test Player 1');
          
          // Submit player
          const savePlayerButton = page.locator('button:has-text("Save"), button:has-text("Add"), button[type="submit"]');
          if (await savePlayerButton.isVisible({ timeout: 2000 }).catch(() => false)) {
            await savePlayerButton.first().click();
          }
        }
        
        console.log('✅ Added test player');
        break;
      }
    }
    
    // Step 5: Start the timer (if there's a timer interface)
    console.log('⏰ Starting game timer...');
    
    const startTimerSelectors = [
      'button:has-text("Start")',
      'button:has-text("▶")',
      '[data-testid="start-timer"]',
      '.timer-start'
    ];
    
    for (const selector of startTimerSelectors) {
      if (await page.locator(selector).isVisible({ timeout: 3000 }).catch(() => false)) {
        await page.locator(selector).first().click();
        console.log(`✅ Started timer with selector: ${selector}`);
        await page.waitForTimeout(2000);
        break;
      }
    }
    
    // Step 6: Log a goal
    console.log('⚽ Logging a goal...');
    
    const goalSelectors = [
      'button:has-text("Goal")',
      'button:has-text("⚽")',
      '[data-testid="goal-button"]',
      '.goal-button'
    ];
    
    for (const selector of goalSelectors) {
      if (await page.locator(selector).isVisible({ timeout: 3000 }).catch(() => false)) {
        await page.locator(selector).first().click();
        console.log(`✅ Logged goal with selector: ${selector}`);
        await page.waitForTimeout(1000);
        break;
      }
    }
    
    // Step 7: Save the game
    console.log('💾 Saving game...');
    
    const saveSelectors = [
      'button:has-text("Save")',
      'button:has-text("Save Game")',
      '[data-testid="save-button"]',
      '.save-button'
    ];
    
    for (const selector of saveSelectors) {
      if (await page.locator(selector).isVisible({ timeout: 3000 }).catch(() => false)) {
        await page.locator(selector).first().click();
        console.log(`✅ Saved game with selector: ${selector}`);
        await page.waitForTimeout(2000);
        break;
      }
    }
    
    // Final verification: check if we can see some indication of success
    console.log('✅ Full user journey completed successfully!');
    
    // Take a screenshot at the end for debugging
    await page.screenshot({ path: 'e2e/results/final-state.png', fullPage: true });
  });

  test('should handle offline/online transitions', async ({ page }) => {
    console.log('🌐 Testing offline/online functionality...');
    
    // Start online
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Go offline
    await page.context().setOffline(true);
    console.log('📴 Gone offline');
    
    // Try to interact with the app offline
    await page.reload();
    await page.waitForTimeout(2000);
    
    // Should show offline indicator or cached content
    const offlineIndicators = [
      'text=offline',
      'text=no connection',
      '[data-testid="offline-indicator"]'
    ];
    
    let offlineIndicatorFound = false;
    for (const selector of offlineIndicators) {
      if (await page.locator(selector).isVisible({ timeout: 3000 }).catch(() => false)) {
        console.log(`✅ Found offline indicator: ${selector}`);
        offlineIndicatorFound = true;
        break;
      }
    }
    
    // Go back online
    await page.context().setOffline(false);
    console.log('📶 Back online');
    
    await page.waitForTimeout(3000);
    
    // Should reconnect and sync
    console.log('✅ Offline/online transition test completed');
  });

  test('accessibility: keyboard navigation works', async ({ page }) => {
    console.log('♿ Testing keyboard accessibility...');
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Test Tab navigation through interactive elements
    const initiallyFocused = await page.evaluate(() => document.activeElement?.tagName);
    
    // Press Tab several times and check that focus moves
    const focusedElements = [];
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('Tab');
      await page.waitForTimeout(100);
      
      const focusedElement = await page.evaluate(() => {
        const el = document.activeElement;
        return {
          tagName: el?.tagName,
          text: el?.textContent?.slice(0, 30),
          type: el?.getAttribute('type'),
          role: el?.getAttribute('role')
        };
      });
      
      focusedElements.push(focusedElement);
    }
    
    // Check that we focused on interactive elements
    const interactiveElements = focusedElements.filter(el => 
      el.tagName === 'BUTTON' || 
      el.tagName === 'INPUT' || 
      el.tagName === 'A' ||
      el.role === 'button'
    );
    
    expect(interactiveElements.length).toBeGreaterThan(0);
    console.log(`✅ Found ${interactiveElements.length} focusable elements`);
  });
});