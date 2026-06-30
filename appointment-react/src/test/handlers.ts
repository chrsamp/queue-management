import { HttpResponse, http } from 'msw'

import {
  appointmentFixture,
  categoryFixture,
  draftFixture,
  knowledgeTestAppointmentFixture,
  officeFixture,
  serviceFixtures,
  slotsFixture,
  userFixture,
} from './fixtures'

const api = 'http://localhost:5000/api/v1'

export const handlers = [
  http.get(`${api}/offices/`, () =>
    HttpResponse.json({ errors: {}, offices: [officeFixture] }),
  ),
  http.get(`${api}/services/`, () =>
    HttpResponse.json({ errors: {}, services: serviceFixtures }),
  ),
  http.get(`${api}/categories/`, () =>
    HttpResponse.json({ categories: [categoryFixture], errors: {} }),
  ),
  http.get(`${api}/offices/:officeId/slots/`, () =>
    HttpResponse.json(slotsFixture),
  ),
  http.post(`${api}/appointments/draft`, () =>
    HttpResponse.json(
      { appointment: draftFixture, warning: {} },
      { status: 201 },
    ),
  ),
  http.delete(
    `${api}/appointments/draft/:appointmentId/`,
    () => new HttpResponse(null, { status: 204 }),
  ),
  http.post(`${api}/appointments/`, () =>
    HttpResponse.json(
      { appointment: appointmentFixture, errors: {} },
      { status: 201 },
    ),
  ),
  http.put(`${api}/appointments/:appointmentId/`, () =>
    HttpResponse.json({ appointment: appointmentFixture, errors: {} }),
  ),
  http.delete(
    `${api}/appointments/:appointmentId/`,
    () => new HttpResponse(null, { status: 204 }),
  ),
  http.get(`${api}/users/appointments/`, () =>
    HttpResponse.json({
      appointments: [appointmentFixture, knowledgeTestAppointmentFixture],
    }),
  ),
  http.post(`${api}/users/`, () => HttpResponse.json([userFixture])),
  http.get(`${api}/users/me/`, () => HttpResponse.json([userFixture])),
  http.put(`${api}/users/:userId/`, () => HttpResponse.json([userFixture])),
]
