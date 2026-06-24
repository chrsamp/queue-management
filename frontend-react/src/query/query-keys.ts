export const queryKeys = {
  activeCitizen: ['active-citizen'] as const,
  appointments: {
    all: ['appointments'] as const,
    office: (officeId: number) => ['appointments', officeId] as const,
  },
  bookings: {
    all: ['bookings'] as const,
    office: (officeId: number) => ['bookings', officeId] as const,
  },
  categories: ['categories'] as const,
  channels: ['channels'] as const,
  citizens: ['citizens'] as const,
  csrStates: ['csr-states'] as const,
  csrs: {
    all: ['csrs'] as const,
    me: ['csrs', 'me'] as const,
  },
  offices: ['offices'] as const,
  examTypes: ['exam-types'] as const,
  exams: {
    all: ['exams'] as const,
    office: (officeNumber: number | string) => ['exams', officeNumber] as const,
  },
  invigilators: ['invigilators'] as const,
  rooms: (officeId: number) => ['rooms', officeId] as const,
  services: (officeId: number) => ['services', officeId] as const,
}
