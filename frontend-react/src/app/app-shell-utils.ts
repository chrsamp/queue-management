export function getHeaderTitle(pathname: string) {
  if (pathname.startsWith('/appointments')) {
    return 'Appointments'
  }

  if (pathname.startsWith('/exams')) {
    return 'Exam Inventory'
  }

  if (pathname.startsWith('/booking')) {
    return 'Room Bookings'
  }

  if (pathname.startsWith('/admin')) {
    return 'Admin'
  }

  return 'Queue Management'
}

export function getNavigationUsername(
  displayName: string | null | undefined,
  username: string | null | undefined,
) {
  return displayName ?? username ?? null
}

export function getEnvironmentStripClassName(host: string) {
  const normalizedHost = host.toLowerCase()

  if (normalizedHost.startsWith('test')) {
    return 'bg-bc-gold'
  }

  if (normalizedHost.startsWith('dev')) {
    return 'bg-bc-success'
  }

  if (
    normalizedHost.startsWith('localhost') ||
    normalizedHost.startsWith('127.') ||
    normalizedHost.startsWith('192.') ||
    normalizedHost.startsWith('loca')
  ) {
    return 'bg-bc-local-env'
  }

  return null
}
