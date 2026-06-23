import { test, expect } from '@playwright/test'

test('displays the application', async ({ page }) => {
  await page.goto('/')

  await expect(page).toHaveTitle('Queue Management')

  await expect(
    page.getByRole('heading', { name: 'Service BC Queue Management' }),
  ).toBeVisible()
})
