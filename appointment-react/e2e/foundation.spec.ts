import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

test('renders the foundation shell and redirects unknown routes', async ({
  page,
}) => {
  await page.goto('/does-not-exist')

  await expect(page).toHaveURL(/\/appointment$/)
  await expect(page).toHaveTitle(
    'Book a Service BC Appointment - Province of British Columbia',
  )
  await expect(
    page.getByRole('heading', {
      level: 1,
      name: 'Book a Service BC Appointment',
    }),
  ).toBeVisible()
  await expect(page.getByRole('contentinfo')).toBeVisible()
})

test('redirects protected routes through the login selector', async ({
  page,
}) => {
  await page.goto('/account-settings')

  await expect(page).toHaveURL(/\/login$/)
  await expect(
    page.getByRole('heading', { level: 2, name: 'Login' }),
  ).toBeVisible()
  await expect(
    page.getByRole('link', { name: 'Login with Basic BCeID' }),
  ).toHaveAttribute('href', '/signin/bceidboth')
})

test('has no serious or critical accessibility violations', async ({
  page,
}) => {
  await page.goto('/appointment')
  await expect(
    page.getByRole('heading', {
      level: 1,
      name: 'Book a Service BC Appointment',
    }),
  ).toBeVisible()

  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze()
  const serious = results.violations.filter(
    ({ impact }) => impact === 'serious' || impact === 'critical',
  )

  expect(serious).toEqual([])
})

test('shows a fatal startup error for invalid runtime configuration', async ({
  page,
}) => {
  await page.route('**/config/configuration.json', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ VITE_APPOINTMENT_API_URL: 'invalid' }),
    })
  })
  await page.goto('/appointment')

  await expect(
    page.getByText('Unable to load the application configuration.'),
  ).toBeVisible()
})
