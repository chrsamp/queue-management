import { describe, expect, test, vi } from 'vitest'

import type { ApiClient } from './client'
import {
  activateServiceRequest,
  addCitizen,
  addCitizenToQueue,
  beginCitizenService,
  createServiceRequest,
  finishCitizenService,
  getCategories,
  getChannels,
  getCitizens,
  getCsrs,
  getServices,
  inviteCitizen,
  inviteNextCitizen,
  loginAdminSession,
  markCitizenLeft,
  placeCitizenOnHold,
  sendWalkinLineReminder,
  updateCsr,
  updateCitizen,
  downloadExamDocument,
  downloadExamExport,
  getExams,
  updateExam,
  uploadCompletedExamDocument,
  updateServiceRequest,
} from './endpoints'

describe('loginAdminSession', () => {
  test('returns concrete query data after the bridge request succeeds', async () => {
    const client = {
      get: vi.fn().mockResolvedValue('<!doctype html>'),
    } as unknown as ApiClient

    await expect(loginAdminSession(client)).resolves.toEqual({
      authenticated: true,
    })
  })
})

describe('updateCsr', () => {
  test('sends counter and receptionist state to the legacy CSR endpoint', async () => {
    const client = {
      request: vi.fn().mockResolvedValue({ csr: {}, errors: {} }),
    } as unknown as ApiClient

    await updateCsr(client, 42, {
      counter_id: 2,
      receptionist_ind: 0,
    })

    expect(client.request).toHaveBeenCalledWith('/csrs/42/', {
      body: {
        counter_id: 2,
        receptionist_ind: 0,
      },
      method: 'PUT',
      schema: expect.anything(),
      signal: undefined,
    })
  })
})

describe('exam endpoints', () => {
  test('loads exams with an office number filter', async () => {
    const exams = [{ exam_id: 1 }]
    const client = {
      get: vi.fn().mockResolvedValue({ exams, errors: {} }),
    } as unknown as ApiClient

    await expect(getExams(client, undefined, 94)).resolves.toEqual(exams)
    expect(client.get).toHaveBeenCalledWith('/exams/?office_number=94', {
      schema: expect.anything(),
      signal: undefined,
    })
  })

  test('updates exam details through the legacy exam endpoint', async () => {
    const client = {
      request: vi.fn().mockResolvedValue({ exam: { exam_id: 4 }, errors: {} }),
    } as unknown as ApiClient

    await updateExam(client, 4, { exam_received_date: null })

    expect(client.request).toHaveBeenCalledWith('/exams/4/', {
      body: { exam_received_date: null },
      method: 'PUT',
      schema: expect.anything(),
      signal: undefined,
    })
  })

  test('uses binary helpers for exam document and report downloads', async () => {
    const blob = new Blob(['x'])
    const client = {
      requestBlob: vi.fn().mockResolvedValue(blob),
    } as unknown as ApiClient

    await expect(downloadExamDocument(client, 7)).resolves.toBe(blob)
    await expect(
      downloadExamExport(client, {
        endDate: '2026-06-30',
        examType: 'ita',
        startDate: '2026-06-01',
      }),
    ).resolves.toBe(blob)

    expect(client.requestBlob).toHaveBeenNthCalledWith(
      1,
      '/exams/7/download/',
      { signal: undefined },
    )
    expect(client.requestBlob).toHaveBeenNthCalledWith(
      2,
      '/exams/export/?start_date=2026-06-01&end_date=2026-06-30&exam_type=ita',
      { signal: undefined },
    )
  })

  test('uploads completed exam documents via presigned URL before transfer', async () => {
    const file = new Blob(['pdf'], { type: 'application/pdf' })
    const client = {
      get: vi.fn().mockResolvedValue({ url: 'https://storage.example/upload' }),
      putPresignedBlob: vi.fn().mockResolvedValue(undefined),
      request: vi.fn().mockResolvedValue({ bcmp: {}, errors: {} }),
    } as unknown as ApiClient

    await uploadCompletedExamDocument(client, 9, file)

    expect(client.get).toHaveBeenCalledWith('/exams/9/upload/', {
      schema: expect.anything(),
      signal: undefined,
    })
    expect(client.putPresignedBlob).toHaveBeenCalledWith(
      'https://storage.example/upload',
      file,
      undefined,
    )
    expect(client.request).toHaveBeenCalledWith('/exams/9/transfer/', {
      method: 'POST',
      schema: expect.anything(),
      signal: undefined,
    })
  })
})

describe('getCitizens', () => {
  test('returns parsed citizens from the queue endpoint', async () => {
    const citizens = [
      {
        citizen_id: 1,
        citizen_name: null,
        cs: {
          cs_state_name: 'Active',
        },
        office_id: 1,
        service_reqs: [
          {
            citizen_id: 1,
            periods: [
              {
                csr: {
                  counter: 1,
                  counter_id: 1,
                  username: 'queue.user',
                },
                period_id: 10,
                ps: {
                  ps_name: 'Waiting',
                },
                time_end: null,
                time_start: '2026-06-23T16:00:00Z',
              },
            ],
            service: {
              parent: {
                service_name: 'Licensing',
              },
              parent_id: 1,
              service_name: 'Driver licence',
            },
            sr_id: 20,
          },
        ],
      },
    ]
    const client = {
      get: vi.fn().mockResolvedValue({ citizens, errors: {} }),
    } as unknown as ApiClient

    await expect(getCitizens(client)).resolves.toEqual(citizens)
    expect(client.get).toHaveBeenCalledWith('/citizens/', {
      schema: expect.anything(),
      signal: undefined,
    })
  })
})

describe('getCsrs', () => {
  test('returns parsed CSR list items without requiring nested office data', async () => {
    const csrs = [
      {
        counter: 1,
        counter_id: 1,
        csr_id: 42,
        csr_state: {
          csr_state_desc: null,
          csr_state_id: 2,
          csr_state_name: 'Login',
        },
        csr_state_id: 2,
        finance_designate: null,
        ita2_designate: null,
        office_id: 1,
        pesticide_designate: null,
        qt_xn_csr_ind: null,
        receptionist_ind: null,
        role: {
          role_code: 'GA',
          role_desc: null,
          role_id: 1,
        },
        role_id: 1,
        username: 'queue.user',
      },
    ]
    const client = {
      get: vi.fn().mockResolvedValue({ csrs, errors: {} }),
    } as unknown as ApiClient

    await expect(getCsrs(client)).resolves.toEqual(csrs)
    expect(client.get).toHaveBeenCalledWith('/csrs/', {
      schema: expect.anything(),
      signal: undefined,
    })
  })
})

describe('add citizen endpoints', () => {
  test('loads reference data from legacy endpoints', async () => {
    const client = {
      get: vi.fn((path: string) => {
        if (path === '/categories/') {
          return Promise.resolve({
            categories: [{ service_id: 1, service_name: 'Permits' }],
          })
        }
        if (path === '/channels/') {
          return Promise.resolve({
            channels: [{ channel_id: 2, channel_name: 'In Person' }],
          })
        }
        return Promise.resolve({
          services: [
            {
              actual_service_ind: 1,
              display_dashboard_ind: 1,
              parent_id: 1,
              service_id: 3,
              service_name: 'Road test',
            },
            {
              actual_service_ind: 0,
              display_dashboard_ind: 1,
              parent_id: 1,
              service_id: 4,
              service_name: 'Hidden',
            },
          ],
        })
      }),
    } as unknown as ApiClient

    await expect(getCategories(client)).resolves.toEqual([
      { service_id: 1, service_name: 'Permits' },
    ])
    await expect(getChannels(client)).resolves.toEqual([
      { channel_id: 2, channel_name: 'In Person' },
    ])
    await expect(getServices(client, 10)).resolves.toEqual([
      {
        actual_service_ind: 1,
        display_dashboard_ind: 1,
        parent_id: 1,
        service_id: 3,
        service_name: 'Road test',
      },
    ])
    expect(client.get).toHaveBeenCalledWith('/services/?office_id=10', {
      schema: expect.anything(),
      signal: undefined,
    })
  })

  test('uses legacy mutation paths and payloads', async () => {
    const citizen = {
      citizen_id: 5,
      cs: { cs_state_name: 'Active' },
      office_id: 1,
      service_reqs: [],
    }
    const client = {
      request: vi.fn((path: string) => {
        if (path === '/citizens/2/add_citizen/') {
          return Promise.resolve({ citizen })
        }
        return Promise.resolve({})
      }),
    } as unknown as ApiClient

    await expect(addCitizen(client, 2)).resolves.toEqual(citizen)
    await updateCitizen(client, 5, {
      citizen_comments: 'Bring ID',
      counter_id: 1,
      priority: 2,
    })
    await createServiceRequest(client, {
      channel_id: 7,
      citizen_id: 5,
      priority: 2,
      quantity: 1,
      service_id: 9,
    })
    await addCitizenToQueue(client, 5)
    await beginCitizenService(client, 5)
    await markCitizenLeft(client, 5)
    await inviteNextCitizen(client, 3)
    await inviteCitizen(client, 5, 3)
    await placeCitizenOnHold(client, 5)
    await finishCitizenService(client, 5, true)
    await updateServiceRequest(client, 11, {
      channel_id: 7,
      quantity: 2,
      service_id: 9,
    })
    await activateServiceRequest(client, 11)
    await sendWalkinLineReminder(client, 5)

    expect(client.request).toHaveBeenNthCalledWith(
      1,
      '/citizens/2/add_citizen/',
      {
        method: 'POST',
        schema: expect.anything(),
        signal: undefined,
      },
    )
    expect(client.request).toHaveBeenNthCalledWith(2, '/citizens/5/', {
      body: {
        citizen_comments: 'Bring ID',
        counter_id: 1,
        priority: 2,
      },
      method: 'PUT',
      schema: expect.anything(),
      signal: undefined,
    })
    expect(client.request).toHaveBeenNthCalledWith(3, '/service_requests/', {
      body: {
        service_request: {
          channel_id: 7,
          citizen_id: 5,
          priority: 2,
          quantity: 1,
          service_id: 9,
        },
      },
      method: 'POST',
      schema: expect.anything(),
      signal: undefined,
    })
    expect(client.request).toHaveBeenNthCalledWith(
      4,
      '/citizens/5/add_to_queue/',
      {
        body: {},
        method: 'POST',
        schema: expect.anything(),
        signal: undefined,
      },
    )
    expect(client.request).toHaveBeenNthCalledWith(
      5,
      '/citizens/5/begin_service/',
      {
        body: {},
        method: 'POST',
        schema: expect.anything(),
        signal: undefined,
      },
    )
    expect(client.request).toHaveBeenNthCalledWith(
      6,
      '/citizens/5/citizen_left/',
      {
        method: 'POST',
        schema: expect.anything(),
        signal: undefined,
      },
    )
    expect(client.request).toHaveBeenNthCalledWith(7, '/citizens/invite/', {
      body: { counter_id: 3 },
      method: 'POST',
      schema: expect.anything(),
      signal: undefined,
    })
    expect(client.request).toHaveBeenNthCalledWith(8, '/citizens/5/invite/', {
      body: { counter_id: 3 },
      method: 'POST',
      schema: expect.anything(),
      signal: undefined,
    })
    expect(client.request).toHaveBeenNthCalledWith(
      9,
      '/citizens/5/place_on_hold/',
      {
        method: 'POST',
        schema: expect.anything(),
        signal: undefined,
      },
    )
    expect(client.request).toHaveBeenNthCalledWith(
      10,
      '/citizens/5/finish_service/?inaccurate=true',
      {
        method: 'POST',
        schema: expect.anything(),
        signal: undefined,
      },
    )
    expect(client.request).toHaveBeenNthCalledWith(
      11,
      '/service_requests/11/',
      {
        body: {
          channel_id: 7,
          quantity: 2,
          service_id: 9,
        },
        method: 'PUT',
        schema: expect.anything(),
        signal: undefined,
      },
    )
    expect(client.request).toHaveBeenNthCalledWith(
      12,
      '/service_requests/11/activate/',
      {
        method: 'POST',
        schema: expect.anything(),
        signal: undefined,
      },
    )
    expect(client.request).toHaveBeenNthCalledWith(
      13,
      '/send-reminder/line-walkin/',
      {
        body: { previous_citizen_id: 5 },
        method: 'POST',
        schema: expect.anything(),
        signal: undefined,
      },
    )
  })
})
