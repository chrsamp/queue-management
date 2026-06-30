import { describe, expect, it } from 'vitest'

import {
  categoryFixture,
  officeFixture,
  serviceFixtures,
} from '@/test/fixtures'

import {
  filterServices,
  getOfficeHours,
  getRelevantCategories,
  getVisibleOffices,
  getVisibleServices,
} from './booking-utils'

describe('booking utilities', () => {
  it('filters and alphabetizes selectable offices', () => {
    const offices = getVisibleOffices([
      { ...officeFixture, office_id: 11, office_name: 'Zeballos' },
      {
        ...officeFixture,
        appointments_enabled_ind: 0,
        office_id: 12,
        office_name: 'Disabled',
      },
      {
        ...officeFixture,
        office_id: 13,
        office_name: 'Hidden',
        online_status: 'Status.HIDE',
      },
      { ...officeFixture, office_id: 14, office_name: 'Abbotsford' },
      {
        ...officeFixture,
        deleted: '2030-01-01',
        office_id: 15,
        office_name: 'Deleted',
      },
    ])

    expect(offices.map((office) => office.office_name)).toEqual([
      'Abbotsford',
      'Zeballos',
    ])
  })

  it('filters, sorts, and searches office services', () => {
    const services = getVisibleServices([
      ...serviceFixtures,
      {
        ...serviceFixtures[0]!,
        actual_service_ind: 0,
        service_id: 99,
      },
    ])

    expect(services.map((service) => service.service_id)).toEqual([20, 23, 21])
    expect(
      filterServices({
        categoryId: null,
        search: 'description',
        services,
      }),
    ).toHaveLength(3)
    expect(
      filterServices({ categoryId: 50, search: '', services }),
    ).toHaveLength(3)
    expect(getRelevantCategories([categoryFixture], services)).toEqual([
      categoryFixture,
    ])
  })

  it('aggregates weekly office hours and marks closed days', () => {
    const hours = getOfficeHours({
      ...officeFixture,
      timeslots: [
        {
          day_of_week: ['Monday'],
          end_time: '12:00:00',
          start_time: '09:00:00',
        },
        {
          day_of_week: ['Monday'],
          end_time: '17:30:00',
          start_time: '08:30:00',
        },
      ],
    })

    expect(hours[0]).toEqual({
      day: 'Monday',
      end: '5:30 p.m.',
      start: '8:30 a.m.',
    })
    expect(hours[6]).toEqual({
      day: 'Sunday',
      end: null,
      start: null,
    })
  })
})
