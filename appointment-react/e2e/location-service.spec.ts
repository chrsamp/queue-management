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
  await page.route('**/api/v1/offices/10/slots/**', (route) =>
    route.fulfill({
      contentType: 'application/json',
      json: {
        '07/15/2030': [
          { end_time: '09:30', no_of_slots: 1, start_time: '09:00' },
        ],
      },
    }),
  )
  await page.route('**/api/v1/appointments/draft', (route) =>
    route.fulfill({
      contentType: 'application/json',
      json: {
        appointment: {
          appointment_id: 40,
          citizen_id: null,
          citizen_name: 'Draft',
          comments: '',
          end_time: '2030-07-15T16:30:00.000Z',
          is_draft: true,
          office_id: 10,
          service_id: 20,
          start_time: '2030-07-15T16:00:00.000Z',
        },
        warning: {},
      },
      status: 201,
    }),
  )
  await page.route('**/api/v1/users/', (route) =>
    route.fulfill({
      contentType: 'application/json',
      json: [
        {
          display_name: 'E2E Citizen',
          email: 'citizen@example.test',
          last_name: 'Citizen',
          send_email_reminders: true,
          send_sms_reminders: false,
          telephone: '2505550100',
          user_id: 30,
          username: 'citizen@bceidboth',
        },
      ],
    }),
  )
  await page.route('**/api/v1/appointments/', (route) =>
    route.fulfill({
      contentType: 'application/json',
      json: {
        appointment: {
          appointment_id: 41,
          citizen_id: 30,
          citizen_name: 'E2E Citizen',
          comments: '',
          end_time: '2030-07-15T16:30:00.000Z',
          is_draft: false,
          office_id: 10,
          service_id: 20,
          start_time: '2030-07-15T16:00:00.000Z',
        },
        errors: {},
      },
      status: 201,
    }),
  )
})

test('completes the location and service selection slice', async ({ page }) => {
  await page.goto('/appointment')
  await page.getByRole('button', { name: 'Book an appointment' }).click()

  await page.getByLabel('Select Office').click()
  await page.getByRole('option', { name: 'Victoria Service BC Centre' }).click()

  await expect(
    page.getByRole('heading', { name: 'Victoria Service BC Centre' }),
  ).toBeVisible()
  await expect(
    page.getByLabel('Map showing Victoria Service BC Centre'),
  ).toBeVisible()

  await page.getByRole('link', { name: 'View available services' }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByText('General Service')).toBeVisible()
  await expect(dialog.getByText('Unavailable Service')).toBeVisible()
  await dialog.getByRole('button', { name: 'Close' }).click()

  await page.getByRole('button', { name: 'Book Appointment' }).click()
  await page.getByLabel('Select Service').click()
  await page.getByRole('option', { name: /Unavailable Service/ }).click()
  await expect(page.getByText(/is not available by appointment/)).toBeVisible()
  await expect(page.getByRole('button', { name: /Next/ })).toHaveCount(0)

  await page.getByRole('button', { name: /Unavailable Service/ }).click()
  await page.getByRole('option', { name: 'General Service' }).click()
  await page.getByRole('button', { name: /Next/ }).click()

  await expect(
    page.getByRole('heading', { name: 'Select a date and time' }),
  ).toBeFocused()
})

test('reserves a slot, resumes after BCeID login, and confirms', async ({
  page,
}) => {
  await page.goto('/appointment?e2e-auth=1')
  await page.getByRole('button', { name: 'Book an appointment' }).click()
  await page.getByLabel('Select Office').click()
  await page.getByRole('option', { name: 'Victoria Service BC Centre' }).click()
  await page.getByRole('button', { name: 'Book Appointment' }).click()
  await page.getByLabel('Select Service').click()
  await page.getByRole('option', { name: 'General Service' }).click()
  await page.getByRole('button', { name: /Next/ }).click()

  await page.getByRole('button', { name: /9:00.*9:30/i }).click()
  await expect(page.getByRole('heading', { name: 'Login' })).toBeVisible()
  await page.getByRole('link', { name: 'Login with Basic BCeID' }).click()

  await expect(
    page.getByRole('heading', { name: 'Appointment summary' }),
  ).toBeVisible()
  await page.getByText('I agree to the Terms of Use').click()
  await page.getByRole('button', { name: 'Confirm Appointment' }).click()

  await expect(
    page.getByRole('heading', {
      name: 'Success! Your appointment has been booked.',
    }),
  ).toBeVisible()
})
