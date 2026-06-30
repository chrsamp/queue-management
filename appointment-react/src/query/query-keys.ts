export const queryKeys = {
  appointments: ['appointments'] as const,
  categories: ['categories'] as const,
  offices: ['offices'] as const,
  services: {
    all: ['services'] as const,
    office: (officeId: number) => ['services', 'office', officeId] as const,
  },
  slots: (officeId: number, serviceId: number) =>
    ['slots', officeId, serviceId] as const,
  users: {
    me: ['users', 'me'] as const,
  },
}
