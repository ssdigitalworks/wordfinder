import { test, expect } from '@playwright/test';

test.describe('Scrabble Word Finder E2E Flows', () => {
  test('Search flow and definition modal on homepage', async ({ page }) => {
    // Navigate to homepage
    await page.goto('/');

    // Verify title and header are loaded
    await expect(page.locator('h1')).toContainText('Scrabble Word Finder');

    // Fill letters and search (actual input id is "letters-input")
    await page.fill('#letters-input', 'CAT');
    await page.click('button[type="submit"]');

    // Wait for the results table/container to appear
    const resultsContainer = page.locator('#results-container');
    await expect(resultsContainer).toBeVisible({ timeout: 10000 });

    // Verify that at least one word result row is displayed
    const wordRow = resultsContainer.locator('.word-result-row').first();
    await expect(wordRow).toBeVisible();
    const wordText = await wordRow.getAttribute('data-word');
    expect(wordText?.trim().length).toBeGreaterThan(0);

    // Click the "Look up" button to open the definition modal
    const lookupBtn = wordRow.locator('.lookup-btn');
    await lookupBtn.click();

    // Verify definition modal is visible
    const modal = page.locator('#definition-modal');
    await expect(modal).toBeVisible();
    await expect(modal.locator('#modal-word-title')).toContainText(wordText?.trim().toUpperCase() || '');

    // Close the definition modal
    await page.click('#modal-close-btn');
    await expect(modal).not.toBeVisible();
  });

  test('Word Checker validation', async ({ page }) => {
    // Navigate to Word Checker page
    await page.goto('/word-checker');

    // Verify page header
    await expect(page.locator('h1')).toContainText('Word Checker');

    // Type a word and check
    await page.fill('#check-word', 'DOG');
    await page.click('#dictionary-form button[type="submit"]');

    // Verify results container contains word and validity badges
    const results = page.locator('#check-results');
    await expect(results).toBeVisible();
    await expect(results).toContainText('DOG');
    await expect(results).toContainText('Valid');

    // Verify definitions section loaded definitions
    const defSection = page.locator('#definition-section');
    await expect(defSection).toBeVisible();
    await expect(defSection).toContainText('Definition');
  });

  test('Contact form submission with success feedback', async ({ page }) => {
    // Navigate to Contact Us page
    await page.goto('/contact');

    // Verify page header
    await expect(page.locator('h1')).toContainText('Contact Us');

    // Fill the contact form fields
    await page.fill('#name', 'Playwright Tester');
    await page.fill('#email', 'tester@example.com');
    await page.selectOption('#subject', 'feedback');
    await page.fill('#message', 'This is an automated E2E browser test message.');

    // Submit the form
    await page.click('button[type="submit"]');

    // Wait for success message — the form's parent container gets replaced with a success div.
    // Use a text-based locator to avoid the strict mode violation with generic '.card'.
    const successHeading = page.getByText('Message Sent Successfully!');
    await expect(successHeading).toBeVisible({ timeout: 10000 });
  });
});
