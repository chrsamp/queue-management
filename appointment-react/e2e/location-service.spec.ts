import { expect, test } from '@playwright/test'

const office = {
  appointments_enabled_ind: 1,
  civic_address: '403-771 Vernon Avenue, Victoria, BC',
  deleted: null,
  external_map_link: 'https://www.openstreetmap.org/',
  latitude: 48.455,
  longitude: -123.377,
  office_appointment_message: 'Please arrive five minutes early.',
  office_id: 10,
  office_name: 'Victoria Service BC Centre',
  office_number: 101,
  online_status: 'Status.SHOW',
  telephone: '250-555-0100',
  timeslots: [
    {
      day_of_week: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      end_time: '16:30:00',
      no_of_slots: 16,
      start_time: '08:30:00',
    },
  ],
  timezone: { timezone_id: 1, timezone_name: 'America/Vancouver' },
}

const serviceBase = {
  actual_service_ind: 1,
  deleted: null,
  display_dashboard_ind: 1,
  is_dlkt: false,
  parent: { service_name: 'Personal Services' },
  parent_id: 50,
  prefix: null,
  service_code: null,
  service_desc: 'Service description',
}

const services = [
  {
    ...serviceBase,
    external_service_name: 'General Service',
    online_availability: 'Availability.SHOW',
    online_link: null,
    service_id: 20,
    service_name: 'General Service',
  },
  {
    ...serviceBase,
    external_service_name: 'Unavailable Service',
    online_availability: 'Availability.DISABLE',
    online_link: 'https://example.test/online',
    service_id: 21,
    service_name: 'Unavailable Service',
  },
]

test.beforeEach(async ({ page }) => {
  await page.route('**/api/v1/offices/', (route) =>
    route.fulfill({
      contentType: 'application/json',
      json: { errors: {}, offices: [office] },
    }),
  )
  await page.route('**/api/v1/services/**', (route) =>
    route.fulfill({
      contentType: 'application/json',
      json: { errors: {}, services },
    }),
  )
  await page.route('**/api/v1/categories/', (route) =>
    route.fulfill({
      contentType: 'application/json',
      json: {
        categories: [
          {
            ...serviceBase,
            actual_service_ind: 0,
            display_dashboard_ind: 0,
            external_service_name: 'Personal Services',
            parent: null,
            parent_id: null,
            service_id: 50,
            service_name: 'Personal Services',
          },
        ],
        errors: {},
      },
    }),
  )
  await page.route('https://tile.openstreetmap.org/**', (route) =>
    route.fulfill({
      body: Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Z4WQAAAAASUVORK5CYII=',
        'base64',
      ),
      contentType: 'image/png',
    }),
  )
})

test('completes the location and service selection slice', async ({ page }) => {
  await page.goto('/appointment')

  await page.getByLabel('Select Office').click()
  await page.getByRole('option', { name: 'Victoria Service BC Centre' }).click()

  await expect(
    page.getByRole('heading', { name: 'Victoria Service BC Centre' }),
  ).toBeVisible()
  await expect(
    page.getByLabel('Map showing Victoria Service BC Centre'),
  ).toBeVisible()

  await page.getByRole('button', { name: 'Available Services' }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByText('General Service')).toBeVisible()
  await expect(dialog.getByText('Unavailable Service')).toBeVisible()
  await dialog.getByRole('button', { name: 'Close' }).click()

  await page.getByRole('button', { name: 'Book Appointment' }).click()
  await page.getByLabel('Select Service').click()
  await page.getByRole('option', { name: /Unavailable Service/ }).click()
  await expect(page.getByText(/is not available by appointment/)).toBeVisible()
  await expect(page.getByRole('button', { name: /Next/ })).toHaveCount(0)

  await page.getByLabel('Select Service').click()
  await page.getByRole('option', { name: 'General Service' }).click()
  await page.getByRole('button', { name: /Next/ }).click()

  await expect(
    page.getByRole('heading', { name: 'Select a Date' }),
  ).toBeFocused()
})
