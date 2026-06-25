import { test, expect } from '@playwright/test'

const username =
  process.env.PLAYWRIGHT_KEYCLOAK_USERNAME ??
  process.env.KEYCLOAK_USERNAME ??
  'cfms-postman-operator'
const password =
  process.env.PLAYWRIGHT_KEYCLOAK_PASSWORD ??
  process.env.KEYCLOAK_PASSWORD ??
  'password'

test('authentication smoke', async ({ page }) => {
  let staffProfileRequests = 0
  await page.route('**/api/v1/csrs/me/', async (route) => {
    staffProfileRequests += 1
    await route.continue()
  })

  await page.goto('/')

  await expect(page).toHaveTitle('Queue Management')
  await expect(
    page.getByRole('heading', { level: 1, name: 'Queue Management' }),
  ).toBeVisible()
  expect(staffProfileRequests).toBe(0)

  await page.goto('/queue')
  await expect(
    page.getByText(
      'You must be signed in before accessing the staff application.',
    ),
  ).toBeVisible()

  await page.getByRole('button', { name: 'Login' }).first().click()
  await page.locator('#username').fill(username)
  await page.locator('#password').fill(password)
  await page.locator('#kc-login').click()

  await expect(page).toHaveURL(/\/queue/)
  await expect(
    page.getByText(/Citizens (Waiting|on Hold):/).first(),
  ).toBeVisible()

  let adminLoginRequests = 0
  await page.route('**/api/v1/login/', async (route) => {
    adminLoginRequests += 1
    await route.fulfill({
      contentType: 'text/html',
      status: 200,
      body: '<!doctype html><title>Admin session</title>',
    })
  })
  await page.route('**/admin/csrga/', async (route) => {
    await route.fulfill({
      contentType: 'text/html',
      status: 200,
      body: '<!doctype html><title>Admin</title>',
    })
  })

  await page.getByRole('button', { name: 'Menu' }).click()
  await page.getByRole('menuitem', { name: 'Admin' }).click()
  await expect(page).toHaveURL(/\/admin/)
  await expect(page.locator('iframe[title="Admin"]')).toHaveAttribute(
    'src',
    /\/admin\/csrga\/$/,
  )
  expect(adminLoginRequests).toBe(1)

  await page.unroute('**/api/v1/csrs/me/')
  await page.route('**/api/v1/csrs/me/', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      status: 404,
      body: JSON.stringify({ Message: 'User Not Found' }),
    })
  })

  await page.goto('/queue')
  await expect(page.getByText('Access unavailable')).toBeVisible()
  await expect(page.getByText('Queue workspace placeholder.')).toBeHidden()

  await page.getByRole('button', { name: 'Menu' }).click()
  await page.getByRole('menuitem', { name: 'Log out' }).click()
  await expect(page).toHaveURL(/\/$/)
})
