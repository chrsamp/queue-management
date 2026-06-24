export const queryKeys = {
  activeCitizen: ['active-citizen'] as const,
  appointments: ['appointments'] as const,
  categories: ['categories'] as const,
  channels: ['channels'] as const,
  citizens: ['citizens'] as const,
  csrStates: ['csr-states'] as const,
  csrs: {
    all: ['csrs'] as const,
    me: ['csrs', 'me'] as const,
  },
  offices: ['offices'] as const,
  services: (officeId: number) => ['services', officeId] as const,
}
