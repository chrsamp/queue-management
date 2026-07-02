import { expect, test } from '@playwright/test'

const office = {
  appointments_enabled_ind: 1,
  civic_address: '403-771 Vernon Avenue, Victoria, BC',
  deleted: null,
  latitude: 48.455,
  longitude: -123.377,
  office_id: 10,
  office_name: 'Victoria Service BC Centre',
  office_number: 101,
  online_status: 'Status.SHOW',
  telephone: '250-555-0100',
  timezone: { timezone_id: 1, timezone_name: 'America/Vancouver' },
}

const service = {
  actual_service_ind: 1,
  deleted: null,
  display_dashboard_ind: 1,
  external_service_name: 'General Service',
  is_dlkt: false,
  online_availability: 'Availability.SHOW',
  online_link: null,
  parent: { service_name: 'Personal Services' },
  parent_id: 50,
  prefix: null,
  service_code: null,
  service_desc: 'Service description',
  service_id: 20,
  service_name: 'General Service',
}

const user = {
  display_name: 'E2E Citizen',
  email: 'citizen@example.test',
  last_name: 'Citizen',
  send_email_reminders: true,
  send_sms_reminders: false,
  telephone: '2505550100',
  user_id: 30,
  username: 'citizen@bceidboth',
}

test('manages appointments and account settings', async ({ page }) => {
  let appointments = [
    {
      appointment_id: 41,
      citizen_id: 30,
      citizen_name: 'E2E Citizen',
      comments: '',
      end_time: '2030-07-15T16:30:00.000Z',
      is_draft: false,
      office,
      office_id: 10,
      service,
      service_id: 20,
      start_time: '2030-07-15T16:00:00.000Z',
    },
  ]

  await page.route('https://tile.openstreetmap.org/**', (route) =>
    route.fulfill({
      body: Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Z4WQAAAAASUVORK5CYII=',
        'base64',
      ),
      contentType: 'image/png',
    }),
  )
  await page.route('**/api/v1/users/', (route) =>
    route.fulfill({ contentType: 'application/json', json: [user] }),
  )
  await page.route('**/api/v1/users/appointments/', (route) =>
    route.fulfill({
      contentType: 'application/json',
      json: { appointments },
    }),
  )
  await page.route('**/api/v1/appointments/41/', (route) => {
    if (route.request().method() === 'DELETE') {
      appointments = []
      return route.fulfill({ body: '', status: 204 })
    }
    return route.fallback()
  })
  await page.route('**/api/v1/users/30/', async (route) => {
    const request = route.request().postDataJSON()
    return route.fulfill({
      contentType: 'application/json',
      json: [
        {
          ...user,
          email: request.email,
          send_email_reminders: request.send_email_reminders,
          send_sms_reminders: request.send_sms_reminders,
          telephone: request.telephone,
        },
      ],
    })
  })

  await page.goto('/login?e2e-auth=1')
  await page.getByRole('link', { name: 'Login with Basic BCeID' }).click()
  await expect(
    page.getByRole('heading', { name: 'Book an appointment at Service BC' }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Menu' }).click()
  await page.getByRole('menuitem', { name: 'My Appointments' }).click()

  await expect(
    page.getByRole('heading', { name: 'My Appointments' }),
  ).toBeVisible()
  await expect(page.getByText('Appointment Confirmed')).toBeVisible()
  await page.getByRole('button', { name: 'Cancel Appointment' }).click()
  await page.getByRole('button', { name: 'Yes, Cancel it' }).click()
  await expect(page.getByText('No appointments found!')).toBeVisible()

  await page.getByRole('button', { name: 'Menu' }).click()
  await page.getByRole('menuitem', { name: 'Account Settings' }).click()
  const email = page.getByRole('textbox', { name: /Email/ })
  await email.fill('updated@example.test')
  await page.getByRole('button', { name: 'Update' }).click()
  await expect(page.getByText('Profile Successfully Updated!')).toBeVisible()
})
