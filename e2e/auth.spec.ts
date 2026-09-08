import { test, expect } from '@playwright/test';

test.use({ viewport: { width: 390, height: 844 } });

test('sign-in submits native autofill values and starts a fresh navigation', async ({ page }) => {
  // Simulate a password manager filling native controls without React input events.
  // The login API is mocked: this checks the form/navigation contract, not the database.
  let submitted: unknown;
  await page.route('**/api/auth/login', async route => {
    submitted = route.request().postDataJSON();
    await route.fulfill({ json: { ok: true } });
  });
  await page.route('**/home', route => route.fulfill({
    contentType: 'text/html', body: '<h1>Authenticated destination</h1>',
  }));
  await page.goto('/login');
  await page.getByLabel('Work email').evaluate((input: HTMLInputElement) => { input.value = 'autofill@example.test'; });
  await page.locator('input[name="password"]').evaluate((input: HTMLInputElement) => { input.value = 'fixture-password'; });
  await page.getByRole('button', { name: 'Sign in to workspace' }).click();
  await expect(page.getByRole('heading', { name: 'Authenticated destination' })).toBeVisible();
  expect(submitted).toEqual({ email: 'autofill@example.test', password: 'fixture-password' });
});

test('rejected credentials keep the form available for correction', async ({ page }) => {
  await page.route('**/api/auth/login', route => route.fulfill({ status: 401, json: { error: 'Invalid credentials' } }));
  await page.goto('/login');
  await page.getByLabel('Work email').fill('fixture@example.test');
  await page.locator('input[name="password"]').fill('wrong-password');
  await page.getByRole('button', { name: 'Sign in to workspace' }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'Invalid credentials' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sign in to workspace' })).toBeEnabled();
});
