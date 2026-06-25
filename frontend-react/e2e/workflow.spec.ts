import { expect, test, type Page } from '@playwright/test'

const apiBase = 'http://localhost:8000/api/v1'

const office = {
  check_in_notification: null,
  counters: [
    {
      counter_id: 1,
      counter_name: 'Front 1',
    },
  ],
  office_id: 1,
  office_name: 'Downtown',
  office_number: 100,
  sb: {
    sb_id: 1,
    sb_type: 'callbyticket',
  },
  timeslots: [],
  timezone: {
    timezone_id: 1,
    timezone_name: 'America/Vancouver',
  },
}

const csrStates = [
  {
    csr_state_desc: null,
    csr_state_id: 1,
    csr_state_name: 'Login',
  },
  {
    csr_state_desc: null,
    csr_state_id: 2,
    csr_state_name: 'Break',
  },
]

function csr(roleCode = 'GA') {
  return {
    counter: 1,
    counter_id: 1,
    csr_id: 10,
    csr_state: csrStates[0],
    csr_state_id: 1,
    finance_designate: null,
    ita2_designate: null,
    office,
    office_id: office.office_id,
    pesticide_designate: null,
    qt_xn_csr_ind: null,
    receptionist_ind: 1,
    role: {
      role_code: roleCode,
      role_desc: null,
      role_id: roleCode === 'SUPPORT' ? 2 : 1,
    },
    role_id: roleCode === 'SUPPORT' ? 2 : 1,
    username: 'e2e.user',
  }
}

function serviceRequest(periodName: string) {
  return {
    channel: {
      channel_id: 1,
      channel_name: 'In Person',
    },
    channel_id: 1,
    citizen_id: 1,
    periods: [
      {
        csr: {
          counter: 1,
          counter_id: 1,
          username: 'e2e.user',
        },
        csr_id: 10,
        period_id: 1,
        ps: {
          ps_name: periodName,
        },
        time_end: null,
        time_start: '2026-06-23T16:00:00Z',
      },
    ],
    quantity: 1,
    service: {
      parent: {
        service_name: 'Licensing',
      },
      parent_id: 1,
      service_name: 'Driver licence',
    },
    service_id: 1,
    sr_id: 20,
  }
}

function citizen(id: number, periodName: string) {
  return {
    citizen_comments: 'Bring ID',
    citizen_id: id,
    citizen_name: null,
    counter_id: 1,
    cs: {
      cs_state_name: 'Active',
    },
    office_id: 1,
    priority: 2,
    service_reqs: [serviceRequest(periodName)],
    start_time: '2026-06-23T16:00:00Z',
    ticket_number: `A${id}`,
  }
}

async function installMockRoutes(page: Page, roleCode = 'GA') {
  let citizens = [citizen(1, 'Waiting')]
  let csrs = [
    stripOffice({
      ...csr('CSR'),
      username: 'active.user',
    }),
    stripOffice({
      ...csr('CSR'),
      csr_id: 11,
      csr_state: csrStates[1],
      csr_state_id: 2,
      username: 'break.user',
    }),
  ]

  await page.route('**/config/configuration.json', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        VITE_Q_API_URL: apiBase,
        VITE_Q_E2E_AUTH_ENABLED: true,
        VITE_Q_SUPPORT_URL: 'https://support.example.test',
      }),
    })
  })
  await page.route('**/config/keycloak.json', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        clientId: 'queue-management',
        realm: 'e2e',
        url: 'https://keycloak.example.test',
      }),
    })
  })
  await page.route('**/api/v1/csrs/me/', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        active_citizens: [],
        attention_needed: false,
        back_office_display: null,
        csr: csr(roleCode),
        errors: {},
        recurring_feature_flag: null,
      }),
    })
  })
  await page.route('**/api/v1/offices/', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ errors: {}, offices: [office] }),
    })
  })
  await page.route('**/api/v1/citizens/', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ citizens, errors: {} }),
    })
  })
  await page.route('**/api/v1/csr_states/', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ csr_states: csrStates, errors: {} }),
    })
  })
  await page.route('**/api/v1/csrs/', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ csrs, errors: {} }),
    })
  })
  await page.route('**/api/v1/categories/', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ categories: [], errors: {} }),
    })
  })
  await page.route('**/api/v1/channels/', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        channels: [{ channel_id: 1, channel_name: 'In Person' }],
        errors: {},
      }),
    })
  })
  await page.route('**/api/v1/services/?office_id=1', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        errors: {},
        services: [
          {
            actual_service_ind: 1,
            display_dashboard_ind: 1,
            parent: { service_name: 'Licensing' },
            parent_id: 1,
            service_id: 1,
            service_name: 'Driver licence',
          },
        ],
      }),
    })
  })
  await page.route('**/api/v1/citizens/invite/', async (route) => {
    citizens = [citizen(1, 'Invited')]
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({}),
    })
  })
  await page.route('**/api/v1/citizens/1/begin_service/', async (route) => {
    citizens = [citizen(1, 'Being Served')]
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({}),
    })
  })
  await page.route('**/api/v1/send-reminder/line-walkin/', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({}),
    })
  })
  await page.route('**/api/v1/citizens/1/place_on_hold/', async (route) => {
    citizens = [citizen(1, 'On hold')]
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({}),
    })
  })
  await page.route(
    '**/api/v1/citizens/1/finish_service/?inaccurate=false',
    async (route) => {
      citizens = []
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({}),
      })
    },
  )
  await page.route(
    '**/api/v1/citizens/1/finish_service/?inaccurate=true',
    async (route) => {
      citizens = []
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({}),
      })
    },
  )
  await page.route('**/api/v1/citizens/1/', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ citizen: citizens[0] ?? citizen(1, 'Waiting') }),
    })
  })

  return {
    refreshGaCsrs: () => {
      csrs = [
        ...csrs,
        {
          ...csrs[0],
          csr_id: 12,
          username: 'new.user',
        },
      ]
    },
    setCitizens: (nextCitizens: Array<ReturnType<typeof citizen>>) => {
      citizens = nextCitizens
    },
  }
}

function stripOffice<T extends { office?: unknown }>(value: T) {
  const item = { ...value }
  delete item.office

  return item
}

test.describe('mocked queue workflows', () => {
  test('redirects authenticated root visits to the queue', async ({ page }) => {
    await installMockRoutes(page)

    await page.goto('/')

    await expect(page).toHaveURL(/\/queue$/)
    await expect(page.getByText('Citizens Waiting: 1')).toBeVisible()
  })

  test('invites, begins, holds, and clears active citizen state', async ({
    page,
  }) => {
    await installMockRoutes(page)

    await page.goto('/queue')
    await expect(page.getByText('Citizens Waiting: 1')).toBeVisible()

    await page.getByRole('button', { name: 'Invite' }).click()
    await expect(
      page.getByRole('heading', { name: 'Serve Citizen' }),
    ).toBeVisible()

    await page.getByRole('button', { name: 'Begin Service' }).click()
    await expect(
      page.getByRole('button', { name: 'Place on Hold' }),
    ).toBeEnabled()
    await page.getByRole('button', { name: 'Place on Hold' }).click()

    await expect(
      page.getByRole('heading', { name: 'Serve Citizen' }),
    ).toBeHidden()
    await expect(page.getByRole('button', { name: 'Serve Now' })).toBeDisabled()
  })

  test('opens the service modal from a socket active-citizen event', async ({
    page,
  }) => {
    await installMockRoutes(page)

    await page.goto('/queue')
    await expect(
      page.getByRole('button', { name: 'Receptionist Counter' }),
    ).toBeVisible()
    await page.waitForFunction(() =>
      Boolean(
        (globalThis as { __QMS_E2E_REALTIME__?: unknown })
          .__QMS_E2E_REALTIME__,
      ),
    )
    await page.evaluate(
      (payload) => {
        const target = globalThis as unknown as {
          __QMS_E2E_REALTIME__?: {
            emit: (eventName: string, payload?: unknown) => void
          }
        }

        target.__QMS_E2E_REALTIME__?.emit('update_active_citizen', payload)
      },
      citizen(1, 'Invited'),
    )

    await expect(
      page.getByRole('heading', { name: 'Serve Citizen' }),
    ).toBeVisible()
  })

  test('shows and refreshes the GA panel for GA users', async ({ page }) => {
    const mocks = await installMockRoutes(page)

    await page.goto('/queue')
    await expect(page.getByRole('button', { name: 'GA Panel' })).toBeEnabled()
    await page.getByRole('button', { name: 'GA Panel' }).click()

    await expect(page.getByRole('dialog', { name: 'GA Panel' })).toBeVisible()
    await expect(
      page.getByRole('table', { name: 'GA panel staff' }),
    ).toContainText('break.user')

    mocks.refreshGaCsrs()
    await page.evaluate(() => {
      const target = globalThis as unknown as {
        __QMS_E2E_REALTIME__?: {
          emit: (eventName: string, payload?: unknown) => void
        }
      }

      target.__QMS_E2E_REALTIME__?.emit('csr_update', { csr_id: 12 })
    })

    await expect(
      page.getByRole('table', { name: 'GA panel staff' }),
    ).toContainText('new.user')
  })

  test('hides the GA panel trigger for CSR users', async ({ page }) => {
    await installMockRoutes(page, 'CSR')

    await page.goto('/queue')
    await expect(page.getByRole('button', { name: 'GA Panel' })).toBeHidden()
  })
})
